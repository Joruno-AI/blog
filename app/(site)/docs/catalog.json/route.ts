import { getCloudflareContext } from "@opennextjs/cloudflare";

import { fetchWithTimeout } from "@/lib/agent/upstream";

const R2_KEY = "internal/docs/catalog.json";
const CACHE_CONTROL = "public, max-age=60, stale-while-revalidate=300";
const PUBLIC_R2_ORIGIN = (process.env.R2_PUBLIC_URL || "https://pub-563a1d32732a43a4ba208b4eff1536ac.r2.dev").replace(/\/+$/, "");

type CatalogObject = {
  body: ReadableStream;
  size: number;
  httpEtag: string;
  writeHttpMetadata(headers: Headers): void;
};

type CatalogBucket = {
  get(key: string): Promise<CatalogObject | null>;
};

function catalogResponse(body: BodyInit, source?: CatalogObject) {
  const headers = new Headers();
  source?.writeHttpMetadata(headers);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", CACHE_CONTROL);
  headers.set("x-content-type-options", "nosniff");
  if (source) {
    headers.set("content-length", String(source.size));
    headers.set("etag", source.httpEtag);
  }
  return new Response(body, { headers });
}

export async function GET() {
  try {
    const bucket = getCloudflareContext().env.R2_BUCKET as unknown as CatalogBucket | undefined;
    if (bucket?.get) {
      const object = await bucket.get(R2_KEY);
      if (object) return catalogResponse(object.body, object);
    }
  } catch {
    // A missing/local binding falls through to the same immutable public R2 object.
  }

  const upstream = await fetchWithTimeout(`${PUBLIC_R2_ORIGIN}/${R2_KEY}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  }, 10_000).catch(() => null);
  if (!upstream?.ok || !upstream.body) {
    return Response.json({ error: "Docs catalog is unavailable." }, {
      status: 502,
      headers: { "cache-control": "no-store" },
    });
  }
  return catalogResponse(upstream.body);
}
