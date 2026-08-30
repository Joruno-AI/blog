type WorkerCacheStorage = CacheStorage & { default?: Cache };

const pendingResponses = new Map<string, Promise<Response>>();

function defaultCache() {
  return (globalThis as typeof globalThis & { caches?: WorkerCacheStorage }).caches?.default;
}

export async function cachedAgentResponse(request: Request, build: () => Promise<Response>) {
  const cache = defaultCache();
  const cacheKey = new Request(request.url, { method: "GET" });
  if (cache) {
    try {
      const cached = await cache.match(cacheKey);
      if (cached) return cached;
    } catch {
      // Upstream work remains available if a local Cache API operation fails.
    }
  }

  const pendingKey = cacheKey.url;
  const current = pendingResponses.get(pendingKey);
  if (current) return (await current).clone();

  const pending = build().then(async (response) => {
    if (cache && response.ok) {
      try {
        await cache.put(cacheKey, response.clone());
      } catch {
        // A transient cache write must not turn a successful proxy into 502.
      }
    }
    return response;
  });
  pendingResponses.set(pendingKey, pending);
  try {
    return (await pending).clone();
  } finally {
    if (pendingResponses.get(pendingKey) === pending) pendingResponses.delete(pendingKey);
  }
}
