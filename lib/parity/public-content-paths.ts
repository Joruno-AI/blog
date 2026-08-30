import publicContentPaths from "@/lib/parity/data/public-content-paths.json";

/**
 * Exact public document allowlist generated from the immutable build snapshot.
 * Keep this module independent from the richer summary so middleware does not
 * pull article metadata into the Worker before static-cache interception.
 */
export const prebuiltPublicContentPaths = new Set(publicContentPaths as string[]);

export function isPrebuiltPublicContentPath(path: string) {
  return prebuiltPublicContentPaths.has(path);
}
