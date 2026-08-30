import { NextResponse, type NextRequest } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { verifySignedSessionToken } from "@/lib/auth/session-cookie";
import { requiresPlatformSession } from "@/lib/auth/session-scope";
import { isKnownAgentScenePath } from "@/lib/agent/scene-paths";
import { normalizeContentPath } from "@/lib/parity/content-path";
import {
  canonicalChangelogSlug,
  PUBLIC_CONTENT_PATH_LOOKUP_SQL,
  type ResolvedPublicContentPath,
} from "@/lib/parity/public-content-access";
import {
  INTERNAL_NOT_FOUND_PATH,
  INTERNAL_NOT_FOUND_RESPONSE_HEADER,
} from "@/lib/platform/internal-not-found";

// Public routes that unauthenticated users can access
const publicRoutes = [
  "/",
  "/blog",
  "/music",
  "/photos",
  "/docs",
  "/agent",
  "/shorts",
  "/projects",
  "/login",
  "/api/zread",
  "/api/deepwiki",
  "/api/agent/github",
  "/api/jobs/run",
  "/api/jobs/public-content-rebuild/ack",
];

function matchesRoute(pathname: string, route: string) {
  if (route === "/") return pathname === "/";
  return pathname === route || pathname.startsWith(`${route}/`);
}

function isKnownPublicApiRoute(pathname: string) {
  const path = pathname.length > 1 && pathname.endsWith("/")
    ? pathname.slice(0, -1)
    : pathname;
  if (new Set([
    "/api/public/categories",
    "/api/public/music",
    "/api/public/posts",
    "/api/public/search",
    "/api/public/tags",
  ]).has(path)) return true;

  return /^\/api\/public\/music\/[^/]+$/.test(path)
    || /^\/api\/public\/posts\/[^/]+$/.test(path)
    || path.startsWith("/api/public/resources/");
}

async function hasValidSession(cookieValue: string) {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) return false;
  const token = await verifySignedSessionToken(cookieValue, secret);
  if (!token) return false;

  try {
    const { env } = getCloudflareContext();
    const session = await env.DB.prepare(
      `SELECT u.id, u.role
       FROM session s
       JOIN user u ON u.id = s.userId
       WHERE s.token = ? AND s.expiresAt > ?
       LIMIT 1`
    )
      .bind(token, Math.floor(Date.now() / 1_000))
      .first<{ id: string; role: "admin" | "editor" | "viewer" }>();
    return session ?? null;
  } catch (error) {
    console.error("Failed to validate session", error);
    return null;
  }
}

const resourcePathPrefixes = [
  "/blog/",
  "/changelog/",
  "/shorts/",
];

function isResourcePath(pathname: string) {
  const contentPath = normalizeContentPath(pathname);
  return resourcePathPrefixes.some((prefix) => contentPath.startsWith(prefix));
}

function isReservedContentRoute(pathname: string) {
  const contentPath = normalizeContentPath(pathname);
  return contentPath === "/docs/read"
    || contentPath === "/docs/catalog.json"
    || contentPath.startsWith("/docs/course/")
    || contentPath === "/music/data.json"
    || /^\/music\/lyrics\/[^/]+\.json$/i.test(contentPath)
    || /^\/photos\/photos\..+\.json$/i.test(contentPath);
}

function isDottedChangelogPath(pathname: string) {
  const contentPath = normalizeContentPath(pathname);
  return /^\/changelog\/[^/]*\.[^/]*$/i.test(contentPath);
}

async function resolveContentPath(pathname: string) {
  const contentPath = normalizeContentPath(pathname);
  if (!isResourcePath(contentPath)) {
    return null;
  }

  try {
    const { env } = getCloudflareContext();
    const row = await env.DB.prepare(PUBLIC_CONTENT_PATH_LOOKUP_SQL)
      .bind(contentPath, contentPath, contentPath, canonicalChangelogSlug(contentPath))
      .first<ResolvedPublicContentPath>();
    return row ?? null;
  } catch (error) {
    console.error("Failed to resolve content redirect", { pathname, error });
    return null;
  }
}

function isKnownPlatformPath(pathname: string) {
  const path = normalizeContentPath(pathname);
  if (path === "/") return true;

  if (path === "/blog" || path.startsWith("/blog/")) return true;
  if (path === "/shorts" || path.startsWith("/shorts/")) return true;
  if (path === "/changelog" || path.startsWith("/changelog/")) return true;

  if ([
    "/404",
    INTERNAL_NOT_FOUND_PATH,
    "/agent",
    "/agent/about",
    "/agent/all",
    "/agent/analyzer",
    "/agent/compare",
    "/agent/masters",
    "/agent/repository",
    "/agent/scenes",
    "/agent/trending",
    "/docs",
    "/docs/read",
    "/feeds",
    "/music",
    "/photos",
    "/projects",
    "/prs",
    "/releases",
    "/streams",
  ].includes(path)) return true;

  if (/^\/agent\/scenes\/[^/]+$/i.test(path)) return true;
  const agentRepository = path.match(/^\/agent\/([^/]+)\/([^/]+)$/i);
  if (agentRepository && !new Set([
    "about", "all", "analyzer", "compare", "masters", "repository", "scenes", "trending",
  ]).has(agentRepository[1].toLowerCase())) return true;
  if (/^\/docs\/course\/[\da-f]{12}$/i.test(path)) return true;
  if (/^\/music\/lyrics\/[^/]+\.json$/i.test(path)) return true;
  if (/^\/photos\/photos\.[\da-f]+\.json$/i.test(path)) return true;
  if (/^\/giscus\/[^/]+\.css$/i.test(path)) return true;
  if (path.startsWith("/og-images/") && path.endsWith(".png")) return true;

  if ([
    "/agent/full-index.json",
    "/agent/selected-index.json",
    "/agent/suggest-index.json",
    "/app.webmanifest",
    "/apple-touch-icon.png",
    "/docs/catalog.json",
    "/favicon.ico",
    "/favicon.svg",
    "/icon-192.png",
    "/icon-512.png",
    "/icon-mask.png",
    "/joruno.ico",
    "/joruno.png",
    "/joruno.svg",
    "/music/data.json",
    "/robots.txt",
    "/rss-styles.xsl",
    "/rss.xml",
    "/search-index.json",
    "/sitemap-0.xml",
    "/sitemap-index.xml",
  ].includes(path)) return true;

  return ["/_next/", "/api/", "/docs-assets/", "/fonts/", "/icons/", "/img/", "/login/", "/studio/"].some(
    (prefix) => path.startsWith(prefix),
  ) || path === "/login" || path === "/studio";
}

function isLegacyEndpointOrAssetPath(pathname: string) {
  const path = normalizeContentPath(pathname);
  return path.endsWith(".json")
    || path.endsWith(".css")
    || path.endsWith(".png")
    || path.endsWith(".svg")
    || path.endsWith(".ico")
    || path.endsWith(".xml")
    || path.endsWith(".xsl")
    || path.endsWith(".txt")
    || path.endsWith(".webmanifest")
    || ["/_next/", "/api/", "/docs-assets/", "/fonts/", "/icons/", "/img/"].some((prefix) => path.startsWith(prefix));
}

function isLegacyDocumentPath(pathname: string) {
  const path = normalizeContentPath(pathname);
  return isKnownPlatformPath(path)
    && path !== "/"
    && path !== "/404"
    && path !== INTERNAL_NOT_FOUND_PATH
    && !path.startsWith("/api/")
    && !path.startsWith("/_next/")
    && !path.startsWith("/login")
    && !path.startsWith("/studio")
    && !isLegacyEndpointOrAssetPath(path);
}

function rewriteAsNotFound(request: NextRequest) {
  const response = NextResponse.rewrite(new URL(INTERNAL_NOT_FOUND_PATH, request.url));
  response.headers.set(INTERNAL_NOT_FOUND_RESPONSE_HEADER, "1");
  return response;
}

type SessionViewer = { id: string; role: "admin" | "editor" | "viewer" };

function nextWithViewer(request: NextRequest, viewer: SessionViewer | null) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete("x-platform-user-id");
  requestHeaders.delete("x-platform-user-role");
  if (viewer) {
    requestHeaders.set("x-platform-user-id", viewer.id);
    requestHeaders.set("x-platform-user-role", viewer.role);
  }
  return NextResponse.next({ request: { headers: requestHeaders } });
}

async function canAccessContentPath(
  contentPath: Awaited<ReturnType<typeof resolveContentPath>>,
  viewer: SessionViewer | null
) {
  if (!contentPath || contentPath.kind !== "resource") return false;
  const visibilityAllows = (visibility: ResolvedPublicContentPath["visibility"]) => {
    switch (visibility) {
      case "public":
      case "unlisted":
        return true;
      case "private":
        return viewer?.role === "admin" || viewer?.role === "editor";
      default:
        return false;
    }
  };
  return visibilityAllows(contentPath.visibility)
    && visibilityAllows(contentPath.revisionVisibility);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Astro treats /404 as a regular page, while its trailing-slash form is
  // canonicalized back to /404. Keep that exception separate from the site's
  // normal trailing-slash document behavior.
  if (pathname === "/404/") {
    return NextResponse.redirect(new URL("/404", request.url), 308);
  }

  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
    const target = pathname.replace(/^\/dashboard/, "/studio");
    return NextResponse.redirect(new URL(target, request.url), 308);
  }

  // 1. Allow API auth routes regardless of state (Better Auth handles its own internal logic)
  if (pathname.startsWith("/api/auth")) {
    return nextWithViewer(request, null);
  }

  // 2. Check for session cookie from better-auth
  // Both __Secure- prefix (HTTPS/Prod) and standard (HTTP/Dev)
  const sessionCookie =
    request.cookies.get("__Secure-better-auth.session_token") ||
    request.cookies.get("better-auth.session_token");

  let viewer: SessionViewer | null = null;
  if (sessionCookie && requiresPlatformSession(pathname)) {
    viewer = await hasValidSession(sessionCookie.value);
  }

  const reservedContentRoute = isReservedContentRoute(pathname);
  // OpenNext cannot synthesize a fallback for this `dynamicParams = false`
  // route and otherwise emits NoFallbackError. Resolve the complete migrated
  // scene set before redirecting or entering the static route cache so invalid
  // slugs match Astro's custom 404 for both slash variants.
  if (isKnownAgentScenePath(pathname) === false) {
    return rewriteAsNotFound(request);
  }
  if (isDottedChangelogPath(pathname)) {
    return rewriteAsNotFound(request);
  }
  // Middleware runs before static-cache interception. Always resolve a public
  // content document against D1 so a moved, unpublished, or newly-private
  // resource cannot leak its previously generated HTML.
  const contentPath = reservedContentRoute ? null : await resolveContentPath(pathname);
  if (contentPath?.kind === "redirect" && contentPath.toPath) {
    const status = contentPath.statusCode === 308 ? 308 : 301;
    return NextResponse.redirect(new URL(contentPath.toPath, request.url), status);
  }
  if (!reservedContentRoute && isResourcePath(pathname) && !(await canAccessContentPath(contentPath, viewer))) {
    // Resolve dynamic resources before rendering so missing and inaccessible
    // paths share the same non-enumerable HTTP 404 response.
    return rewriteAsNotFound(request);
  }

  if (!isKnownPlatformPath(pathname)) {
    return rewriteAsNotFound(request);
  }

  if (pathname.length > 1 && pathname.endsWith("/") && isLegacyEndpointOrAssetPath(pathname)) {
    return rewriteAsNotFound(request);
  }

  if (!pathname.endsWith("/") && isLegacyDocumentPath(pathname)) {
    const canonicalUrl = new URL(request.url);
    canonicalUrl.pathname = `${pathname}/`;
    return NextResponse.redirect(canonicalUrl, 308);
  }

  // 3. Logic for AUTHENTICATED users
  if (viewer) {
    const canManagePlatform = viewer.role === "admin" || viewer.role === "editor";

    // The root remains the public platform home even for signed-in users.
    if (pathname === "/login") {
      return NextResponse.redirect(new URL(canManagePlatform ? "/studio" : "/", request.url));
    }
    if (pathname.startsWith("/studio") && !canManagePlatform) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    if (
      pathname.startsWith("/api/") &&
      !pathname.startsWith("/api/public") &&
      !pathname.startsWith("/api/zread") &&
      !pathname.startsWith("/api/deepwiki") &&
      !pathname.startsWith("/api/agent/github") &&
      pathname !== "/api/jobs/run" &&
      pathname !== "/api/jobs/public-content-rebuild/ack" &&
      !canManagePlatform
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    // Signed-in editors and admins may additionally use Studio and mutation APIs.
    return nextWithViewer(request, viewer);
  }

  // 4. Logic for UNAUTHENTICATED users

  if (pathname === "/api/public" || pathname.startsWith("/api/public/")) {
    if (isKnownPublicApiRoute(pathname)) {
      return nextWithViewer(request, null);
    }
    return NextResponse.json(
      { error: "Not found" },
      { status: 404, headers: { "Cache-Control": "no-store" } }
    );
  }

  // Protect Studio routes
  if (pathname.startsWith("/studio")) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Allow public routes
  if (publicRoutes.some((route) => matchesRoute(pathname, route))) {
    return nextWithViewer(request, null);
  }

  // Keep CMS mutation APIs private.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return nextWithViewer(request, null);
}

export const config = {
  matcher: [
    // API routes must always cross the authentication boundary, even when a
    // dynamic identifier looks like a static file (for example asset.png).
    "/api/:path*",
    // Exclude only known static directories and root files. A broad extension
    // exclusion would also skip private dynamic API routes with dotted IDs.
    "/((?!_next/static|_next/image|fonts(?:/|$)|icons(?:/|$)|og-backgrounds(?:/|$)|favicon\\.ico$|favicon\\.svg$|apple-touch-icon\\.png$|icon-192\\.png$|icon-512\\.png$|icon-mask\\.png$|joruno\\.ico$|joruno\\.png$|joruno\\.svg$).*)",
  ],
};
