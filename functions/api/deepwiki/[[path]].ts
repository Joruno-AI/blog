interface PagesContext {
  request: Request
  params: Record<string, string | string[] | undefined>
  waitUntil(promise: Promise<unknown>): void
}

interface McpContent {
  type: string
  text?: string
}

interface McpEnvelope {
  id?: number | string
  result?: {
    content?: McpContent[]
    structuredContent?: { result?: string }
    isError?: boolean
  }
  error?: { message?: string }
}

const MCP_ENDPOINT = 'https://mcp.deepwiki.com/mcp'
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

async function callDeepWiki(tool: string, arguments_: Record<string, string>) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 50_000)
  try {
    const response = await fetch(MCP_ENDPOINT, {
      method: 'POST',
      headers: {
        'Accept': 'application/json, text/event-stream',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { name: tool, arguments: arguments_ },
      }),
      signal: controller.signal,
    })
    if (!response.ok) throw new Error(`DeepWiki 返回 ${response.status}`)

    const stream = await response.text()
    const envelopes = stream
      .split(/\r?\n/)
      .filter((line) => line.startsWith('data: '))
      .map((line) => {
        try {
          return JSON.parse(line.slice(6)) as McpEnvelope
        } catch {
          return null
        }
      })
      .filter((entry): entry is McpEnvelope => Boolean(entry))
    const envelope = [...envelopes]
      .reverse()
      .find((entry) => entry.id === 1 || entry.error)
    if (envelope?.error)
      throw new Error(envelope.error.message || 'DeepWiki 请求失败')
    const result = envelope?.result
    const text =
      result?.structuredContent?.result ||
      result?.content?.find((item) => item.type === 'text')?.text ||
      ''
    if (result?.isError || !text) throw new Error(text || 'DeepWiki 暂无文档')
    return text
  } finally {
    clearTimeout(timeout)
  }
}

function parseOutline(markdown: string) {
  return markdown
    .split(/\r?\n/)
    .map((line) => {
      const match = line.match(/^(\s*)-\s+([\d.]+)\s+(.+)$/)
      if (!match) return null
      return {
        depth: Math.floor((match[1]?.length ?? 0) / 2),
        id: match[2] ?? '',
        title: match[3]?.trim() ?? '',
      }
    })
    .filter((item): item is { depth: number; id: string; title: string } =>
      Boolean(item?.title)
    )
}

function extractPage(contents: string, requestedTitle: string) {
  const pagePattern = /^# Page:\s*(.+)$/gm
  const pages = [...contents.matchAll(pagePattern)]
  if (!pages.length) return contents.slice(0, 180_000)
  const normalized = requestedTitle.trim().toLowerCase()
  const match =
    pages.find(
      (entry) => (entry[1] ?? '').trim().toLowerCase() === normalized
    ) ?? pages[0]
  const start = match.index ?? 0
  const next = pages.find((entry) => (entry.index ?? 0) > start)
  return contents.slice(start, next?.index ?? contents.length).slice(0, 180_000)
}

async function readWikiContents(cache: Cache, repoName: string) {
  const cacheKey = new Request(
    `https://deepwiki-content-cache.invalid/${encodeURIComponent(repoName)}`
  )
  const cached = await cache.match(cacheKey)
  if (cached) return cached.text()

  const contents = await callDeepWiki('read_wiki_contents', { repoName })
  await cache.put(
    cacheKey,
    new Response(contents, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control':
          'public, max-age=900, s-maxage=21600, stale-while-revalidate=86400',
      },
    })
  )
  return contents
}

async function buildResponse(parts: string[], request: Request, cache: Cache) {
  const [owner, repo, action = 'overview'] = parts
  if (!owner || !repo || !REPO_PART.test(owner) || !REPO_PART.test(repo)) {
    return json({ error: '仓库地址不合法。' }, 400, 'no-store')
  }

  const repoName = `${owner}/${repo}`
  const sourceUrl = `https://deepwiki.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`

  if (action === 'structure') {
    const markdown = await callDeepWiki('read_wiki_structure', { repoName })
    return json({ repo: repoName, sourceUrl, items: parseOutline(markdown) })
  }

  if (action === 'overview' || action === 'page') {
    const requestedTitle =
      action === 'overview'
        ? 'Overview'
        : new URL(request.url).searchParams.get('title')?.slice(0, 120) ||
          'Overview'
    const contents = await readWikiContents(cache, repoName)
    return json({
      repo: repoName,
      sourceUrl,
      page: requestedTitle,
      markdown: extractPage(contents, requestedTitle),
    })
  }

  return json({ error: '不支持的 DeepWiki 操作。' }, 404, 'no-store')
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
      context.request,
      cache
    )
    if (response.ok) context.waitUntil(cache.put(cacheKey, response.clone()))
    return response
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'AbortError'
    return json(
      {
        error: timedOut
          ? 'DeepWiki 生成超时，请稍后重试。'
          : error instanceof Error
            ? error.message
            : 'DeepWiki 文档加载失败。',
      },
      502,
      'no-store'
    )
  }
}

export function onRequest() {
  return json({ error: '仅支持 GET 请求。' }, 405, 'no-store')
}
