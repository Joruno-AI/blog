import { getCloudflareContext } from "@opennextjs/cloudflare";

import { fetchWithTimeout } from "@/lib/agent/upstream";
import { serveLegacyStaticAsset, type LegacyR2Bucket } from "@/lib/r2/legacy-static-assets";

export const runtime = "nodejs";

const PUBLIC_R2_ORIGIN = (process.env.R2_PUBLIC_URL || "https://pub-563a1d32732a43a4ba208b4eff1536ac.r2.dev").replace(/\/+$/, "");
const GENERIC_OG_PATH = "/og-images/og-image.png";

function genericOgRequest(request: Request) {
  return new Request(new URL(GENERIC_OG_PATH, request.url), {
    method: request.method,
    headers: request.headers,
  });
}

function genericOgResponse(response: Response) {
  const headers = new Headers(response.headers);
  headers.set("x-og-image-fallback", "generic");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function notFound() {
  return new Response("Not found", {
    status: 404,
    headers: {
      "cache-control": "no-store",
      "content-type": "text/plain; charset=utf-8",
      "x-content-type-options": "nosniff",
    },
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/og-images/") || !url.pathname.endsWith(".png")) return notFound();

  let cloudflareRuntime = false;
  try {
    const bucket = getCloudflareContext().env.R2_BUCKET as unknown as LegacyR2Bucket;
    cloudflareRuntime = true;
    const stored = await serveLegacyStaticAsset(request, bucket);
    if (stored) return stored;
    const generic = await serveLegacyStaticAsset(genericOgRequest(request), bucket);
    return generic ? genericOgResponse(generic) : notFound();
  } catch {
    if (cloudflareRuntime) {
      return new Response("OG image storage is unavailable.", {
        status: 503,
        headers: { "cache-control": "no-store", "x-content-type-options": "nosniff" },
      });
    }
    // `next dev` has no Cloudflare binding. It reads the same seeded R2 copy.
  }

  let upstream = await fetchWithTimeout(new URL(`${url.pathname}${url.search}`, PUBLIC_R2_ORIGIN), {
    headers: {
      Accept: "image/png",
      "User-Agent": "Joruno-Astro-Parity/1.0",
    },
    cache: "no-store",
  }, 10_000).catch(() => null);
  let fallback = false;
  if (!upstream?.ok || !upstream.body) {
    fallback = true;
    upstream = await fetchWithTimeout(new URL(GENERIC_OG_PATH, PUBLIC_R2_ORIGIN), {
      headers: {
        Accept: "image/png",
        "User-Agent": "Joruno-Astro-Parity/1.0",
      },
      cache: "no-store",
    }, 10_000).catch(() => null);
  }
  if (!upstream?.ok || !upstream.body) return notFound();

  const headers = new Headers();
  headers.set("content-type", "image/png");
  headers.set("cache-control", "public, max-age=14400, must-revalidate");
  headers.set("access-control-allow-origin", "*");
  headers.set("x-content-type-options", "nosniff");
  if (fallback) headers.set("x-og-image-fallback", "generic");
  const contentLength = upstream.headers.get("content-length");
  if (contentLength) headers.set("content-length", contentLength);
  return new Response(upstream.body, { status: 200, headers });
}
