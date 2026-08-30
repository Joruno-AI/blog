export const STALE_ASSET_RELOAD_KEY = "joruno:stale-client-asset-reload";
export const STALE_ASSET_RELOAD_COOLDOWN_MS = 30_000;

type ErrorLike = Pick<Error, "message" | "name"> & { stack?: string };

export function isStaleClientAssetError(error: ErrorLike) {
  const details = `${error.name}\n${error.message}\n${error.stack ?? ""}`;
  if (/ChunkLoadError|Loading (?:CSS )?chunk .* failed/i.test(details)) return true;
  if (/Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(details)) return true;

  return /Unexpected token ['"]?<['"]?/i.test(details) && /\/_next\/static\//.test(details);
}

export function canRetryStaleClientAsset(lastAttempt: string | null, now = Date.now()) {
  if (lastAttempt === null) return true;
  const timestamp = Number(lastAttempt);
  return !Number.isFinite(timestamp) || now - timestamp >= STALE_ASSET_RELOAD_COOLDOWN_MS;
}

export function isNextStaticAssetPath(pathname: string) {
  return pathname.startsWith("/_next/static/");
}
