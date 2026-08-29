const repeatedSlash = /\/{2,}/g;

export function normalizeResourcePath(input: string) {
  const [pathname] = input.trim().split(/[?#]/, 1);
  const normalized = `/${pathname ?? ""}`
    .replace(repeatedSlash, "/")
    .replace(/\/$/, "");

  return normalized || "/";
}

export function resourceCacheTags(resource: {
  id: string;
  type: string;
  path: string;
}) {
  return [
    `resource:${resource.id}`,
    `resource-path:${normalizeResourcePath(resource.path)}`,
    `resource-type:${resource.type}`,
  ] as const;
}

