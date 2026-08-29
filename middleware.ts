import { NextResponse, type NextRequest } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { verifySignedSessionToken } from "@/lib/auth/session-cookie";
import { requiresPlatformSession } from "@/lib/auth/session-scope";
import { normalizeContentPath } from "@/lib/parity/content-path";

// Public routes that unauthenticated users can access
const publicRoutes = [
  "/",
  "/blog",
  "/knowledge",
  "/music",
  "/photos",
  "/docs",
  "/agent",
  "/shorts",
  "/projects",
  "/tools",
  "/search",
  "/login",
  "/api/public",
  "/api/jobs/run",
];

function matchesRoute(pathname: string, route: string) {
  if (route === "/") return pathname === "/";
  return pathname === route || pathname.startsWith(`${route}/`);
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
  "/knowledge/",
  "/music/albums/",
  "/music/tracks/",
  "/photos/",
  "/docs/",
  "/shorts/",
  "/projects/",
  "/tools/",
];

function isResourcePath(pathname: string) {
  return resourcePathPrefixes.some((prefix) => pathname.startsWith(prefix));
}

function isReservedContentRoute(pathname: string) {
  return pathname === "/docs/read"
    || pathname === "/docs/catalog.json"
    || pathname === "/docs/catalog.static.json"
    || pathname.startsWith("/docs/course/")
    || /^\/photos\/photos\..+\.json$/i.test(pathname);
}

async function resolveContentPath(pathname: string) {
  const contentPath = normalizeContentPath(pathname);
  if (!isResourcePath(contentPath)) {
    return null;
  }

  try {
    const { env } = getCloudflareContext();
    const row = await env.DB.prepare(
      `SELECT 'redirect' AS kind, to_path AS toPath, status_code AS statusCode,
              NULL AS resourceId, NULL AS visibility
       FROM redirects WHERE from_path = ?
       UNION ALL
       SELECT 'resource' AS kind, NULL AS toPath, NULL AS statusCode,
              r.id AS resourceId, r.visibility AS visibility
       FROM resource_routes rr
       JOIN resources r ON r.id = rr.resource_id
       WHERE rr.path = ? AND r.status = 'published'
       LIMIT 1`
    )
      .bind(contentPath, contentPath)
      .first<{
        kind: "redirect" | "resource";
        toPath: string | null;
        statusCode: number | null;
        resourceId: string | null;
        visibility: "public" | "unlisted" | "private" | null;
      }>();
    return row ?? null;
  } catch (error) {
    console.error("Failed to resolve content redirect", { pathname, error });
    return null;
  }
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
  switch (contentPath.visibility) {
    case "public":
    case "unlisted":
      return true;
    case "private":
      return viewer?.role === "admin" || viewer?.role === "editor";
    default:
      return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

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
  const contentPath = reservedContentRoute ? null : await resolveContentPath(pathname);
  if (contentPath?.kind === "redirect" && contentPath.toPath) {
    const status = contentPath.statusCode === 308 ? 308 : 301;
    return NextResponse.redirect(new URL(contentPath.toPath, request.url), status);
  }
  if (!reservedContentRoute && isResourcePath(pathname) && !(await canAccessContentPath(contentPath, viewer))) {
    // Resolve dynamic resources before rendering so missing and inaccessible
    // paths share the same non-enumerable HTTP 404 response.
    return NextResponse.rewrite(new URL("/__resource_not_found__", request.url));
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
      pathname !== "/api/jobs/run" &&
      !canManagePlatform
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    // Signed-in editors and admins may additionally use Studio and mutation APIs.
    return nextWithViewer(request, viewer);
  }

  // 4. Logic for UNAUTHENTICATED users

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
    // Match all paths except static files and _next
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
