export const LEGACY_STATIC_ASSET_PREFIXES = ["/img/", "/music/", "/docs-assets/", "/og-images/"] as const;
export const LEGACY_STATIC_ASSET_CACHE_CONTROL = "public, max-age=14400, must-revalidate";

type LegacyR2Range =
  | { offset: number; length?: number }
  | { offset?: number; length: number }
  | { suffix: number };

export interface LegacyR2Object {
  readonly size: number;
  readonly httpEtag: string;
  readonly range?: LegacyR2Range;
  writeHttpMetadata(headers: Headers): void;
}

export interface LegacyR2ObjectBody extends LegacyR2Object {
  readonly body: ReadableStream;
}

export interface LegacyR2Bucket {
  get(
    key: string,
    options: { onlyIf: Headers; range: Headers }
  ): Promise<LegacyR2Object | LegacyR2ObjectBody | null>;
}

const FALLBACK_CONTENT_TYPES: Record<string, string> = {
  mp3: "audio/mpeg",
  png: "image/png",
  svg: "image/svg+xml",
  webp: "image/webp",
};

export function legacyStaticAssetKey(pathname: string): string | null {
  let decodedPathname: string;
  try {
    decodedPathname = decodeURIComponent(pathname);
  } catch {
    return null;
  }

  if (!LEGACY_STATIC_ASSET_PREFIXES.some((prefix) => decodedPathname.startsWith(prefix))) {
    return null;
  }
  if (decodedPathname.includes("\0") || decodedPathname.includes("\\")) return null;

  const segments = decodedPathname.split("/");
  if (segments.some((segment) => segment === "." || segment === "..")) return null;

  return decodedPathname.slice(1);
}

function fallbackContentType(key: string): string | undefined {
  const extension = key.split(".").pop()?.toLowerCase();
  return extension ? FALLBACK_CONTENT_TYPES[extension] : undefined;
}

function finiteNonNegative(value: number | undefined, fallback = 0) {
  return Number.isFinite(value) ? Math.max(0, value ?? fallback) : fallback;
}

function isUsableRange(range: LegacyR2Range) {
  if ("suffix" in range) return Number.isFinite(range.suffix) && range.suffix >= 0;
  return (range.offset === undefined || (Number.isFinite(range.offset) && range.offset >= 0))
    && (range.length === undefined || (Number.isFinite(range.length) && range.length >= 0))
    && (range.offset !== undefined || range.length !== undefined);
}

function rangeBounds(range: LegacyR2Range, objectSize: number) {
  const size = finiteNonNegative(objectSize);
  if ("suffix" in range) {
    const length = Math.min(finiteNonNegative(range.suffix), size);
    return { offset: size - length, length };
  }

  const offset = Math.min(finiteNonNegative(range.offset), size);
  const available = Math.max(0, size - offset);
  const length = Math.min(finiteNonNegative(range.length, available), available);
  return { offset, length };
}

function conditionalStatus(request: Request): 304 | 412 {
  return request.headers.has("if-none-match") || request.headers.has("if-modified-since")
    ? 304
    : 412;
}

export async function serveLegacyStaticAsset(
  request: Request,
  bucket: LegacyR2Bucket
): Promise<Response | null> {
  if (request.method !== "GET" && request.method !== "HEAD") return null;

  const key = legacyStaticAssetKey(new URL(request.url).pathname);
  if (!key) return null;

  const object = await bucket.get(key, {
    onlyIf: request.headers,
    range: request.headers,
  });
  if (object === null) return null;

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("accept-ranges", "bytes");
  headers.set("access-control-allow-origin", "*");
  headers.set("cache-control", headers.get("cache-control") || LEGACY_STATIC_ASSET_CACHE_CONTROL);
  headers.set("x-content-type-options", "nosniff");
  headers.set("referrer-policy", "strict-origin-when-cross-origin");
  if (!headers.has("content-type")) {
    const contentType = fallbackContentType(key);
    if (contentType) headers.set("content-type", contentType);
  }

  if (!("body" in object)) {
    return new Response(null, { status: conditionalStatus(request), headers });
  }

  let status = 200;
  // R2 may expose an empty/invalid `object.range` when a Headers instance was
  // passed to `get()`. Only emit a partial response when the client actually
  // requested a byte range; ordinary reads must remain HTTP 200.
  if (request.headers.has("range") && object.range && isUsableRange(object.range)) {
    const { offset, length } = rangeBounds(object.range, object.size);
    const end = length === 0 ? offset : offset + length - 1;
    headers.set("content-range", `bytes ${offset}-${end}/${object.size}`);
    headers.set("content-length", String(length));
    status = 206;
  } else {
    headers.set("content-length", String(object.size));
  }

  return new Response(request.method === "HEAD" ? null : object.body, { status, headers });
}
