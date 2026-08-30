import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { NextRequest } from "next/server";

const CACHE_CONTROL = "public, max-age=3600, stale-while-revalidate=86400";
const R2_KEY = "internal/agent/suggest-index.json";

type SuggestIndexObject = { body: ReadableStream };
type SuggestIndexBucket = { get(key: string): Promise<SuggestIndexObject | null> };
type FullIndexItem = { f: string; n: string; a: string; c: string; s: number };

function response(body: BodyInit) {
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": CACHE_CONTROL,
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function GET(request: NextRequest) {
  try {
    const bucket = getCloudflareContext().env.R2_BUCKET as unknown as SuggestIndexBucket;
    const object = await bucket.get(R2_KEY);
    if (object?.body) return response(object.body);
  } catch {
    // Local Next.js without a seeded R2 object reconstructs the compact index
    // from the public full index below.
  }

  const source = new URL("/agent/full-index.json", request.url);
  const sourceResponse = await fetch(source, {
    headers: { Accept: "application/json" },
    next: { revalidate: 3600 },
  });
  if (!sourceResponse.ok) {
    return Response.json({ items: [] }, {
      status: 502,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const full = await sourceResponse.json() as { items?: FullIndexItem[] };
  const items = (full.items || []).map((item) => ({
    f: item.f,
    n: item.n,
    a: item.a,
    c: item.c,
    s: item.s,
  }));
  return response(JSON.stringify({ items }));
}
