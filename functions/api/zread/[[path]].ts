import { fetchZReadPage, fetchZReadStructure } from '../../_shared/zread'

interface PagesContext {
  request: Request
  params: Record<string, string | string[] | undefined>
  waitUntil(promise: Promise<unknown>): void
}

const REPO_PART = /^[A-Za-z0-9_.-]{1,100}$/
const CACHE_CONTROL =
  'public, max-age=900, s-maxage=21600, stale-while-revalidate=86400'

function json(payload: unknown, status = 200, cache = CACHE_CONTROL) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': cache,
      'X-Content-Type-Options': 'nosniff',
    },
  })
}

function pathParts(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value
  return value ? value.split('/').filter(Boolean) : []
}

async function buildResponse(parts: string[], request: Request) {
  const [owner, repo, action = 'overview'] = parts
  if (!owner || !repo || !REPO_PART.test(owner) || !REPO_PART.test(repo))
    return json({ error: '仓库地址不合法。' }, 400, 'no-store')

  if (action === 'structure')
    return json(await fetchZReadStructure(owner, repo))

  if (action === 'overview' || action === 'page') {
    const requested =
      action === 'overview'
        ? 'Overview'
        : new URL(request.url).searchParams.get('title')?.slice(0, 120) ||
          'Overview'
    return json(await fetchZReadPage(owner, repo, requested))
  }

  return json({ error: '不支持的 ZRead 操作。' }, 404, 'no-store')
}

export async function onRequestGet(context: PagesContext) {
  const cacheStorage = caches as CacheStorage & { default: Cache }
  const cache = cacheStorage.default
  const cacheKey = new Request(context.request.url, { method: 'GET' })
  const cached = await cache.match(cacheKey)
  if (cached) return cached

  try {
    const response = await buildResponse(
      pathParts(context.params.path),
      context.request
    )
    if (response.ok) context.waitUntil(cache.put(cacheKey, response.clone()))
    return response
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'AbortError'
    return json(
      {
        error: timedOut
          ? 'ZRead 响应超时，已准备切换备用文档源。'
          : error instanceof Error
            ? error.message
            : 'ZRead 中文文档加载失败。',
      },
      502,
      'no-store'
    )
  }
}

export function onRequest() {
  return json({ error: '仅支持 GET 请求。' }, 405, 'no-store')
}
