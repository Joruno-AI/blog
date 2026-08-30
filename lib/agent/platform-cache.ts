type WorkerCacheStorage = CacheStorage & { default?: Cache };

function defaultCache() {
  return (globalThis as typeof globalThis & { caches?: WorkerCacheStorage }).caches?.default;
}

export async function cachedAgentResponse(request: Request, build: () => Promise<Response>) {
  const cache = defaultCache();
  const cacheKey = new Request(request.url, { method: "GET" });
  if (cache) {
    const cached = await cache.match(cacheKey);
    if (cached) return cached;
  }
  const response = await build();
  if (cache && response.ok) await cache.put(cacheKey, response.clone());
  return response;
}
