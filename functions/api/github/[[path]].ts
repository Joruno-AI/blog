interface PagesEnv {
  GITHUB_TOKEN?: string
  ASSETS: { fetch(input: Request | string | URL): Promise<Response> }
}

interface PagesContext {
  request: Request
  env: PagesEnv
  params: Record<string, string | string[] | undefined>
  waitUntil(promise: Promise<unknown>): void
}

interface GitHubRepo {
  full_name: string
  name: string
  owner: { login: string }
  description: string | null
  stargazers_count: number
  forks_count: number
  subscribers_count: number
  language: string | null
  default_branch: string
  updated_at: string
  license: { spdx_id: string | null; name: string } | null
  topics: string[]
  archived: boolean
  homepage: string | null
}

interface GitHubContent {
  type: 'file' | 'dir' | 'symlink' | 'submodule'
  name: string
  path: string
  size: number
  sha: string
  content?: string
  encoding?: string
  download_url: string | null
}

interface GitHubTree {
  truncated: boolean
  tree: {
    path: string
    type: 'blob' | 'tree' | 'commit'
    size?: number
  }[]
}

const GITHUB_API = 'https://api.github.com'
const REPO_PART = /^[A-Za-z0-9_.-]{1,100}$/
const CACHE_CONTROL =
  'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400'

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

function safeQuery(value: string | null, maxLength: number) {
  const normalized = value?.trim() ?? ''
  if (!normalized || normalized.length > maxLength || normalized.includes('\0'))
    return ''
  return normalized
}

function encodeGitHubPath(value: string) {
  return value.split('/').filter(Boolean).map(encodeURIComponent).join('/')
}

async function github<T>(
  path: string,
  token = '',
  query: Record<string, string> = {}
): Promise<T | null> {
  const url = new URL(`${GITHUB_API}${path}`)
  for (const [key, value] of Object.entries(query)) {
    if (value) url.searchParams.set(key, value)
  }
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'wangshengliang-blog-repository-reader',
    'X-GitHub-Api-Version': '2022-11-28',
  }
  if (token) headers.Authorization = `Bearer ${token}`

  const response = await fetch(url, { headers })
  if (response.status === 404) return null
  if (!response.ok) {
    if (response.status === 403 || response.status === 429) {
      throw new Error('GitHub 请求频率已达上限，请稍后重试。')
    }
    throw new Error(`GitHub 返回 ${response.status}`)
  }
  return (await response.json()) as T
}

function repoPayload(repo: GitHubRepo) {
  return {
    fullName: repo.full_name,
    name: repo.name,
    owner: repo.owner.login,
    description: repo.description ?? '',
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    watchers: repo.subscribers_count,
    language: repo.language,
    defaultBranch: repo.default_branch,
    updatedAt: repo.updated_at,
    license: repo.license?.spdx_id || repo.license?.name || null,
    topics: repo.topics ?? [],
    archived: repo.archived,
    homepage: repo.homepage,
  }
}

function contentPayload(content: GitHubContent) {
  return {
    type: content.type,
    name: content.name,
    path: content.path,
    size: content.size,
    sha: content.sha,
    content: content.content ?? null,
    encoding: content.encoding ?? null,
    downloadUrl: content.download_url,
  }
}

async function buildResponse(context: PagesContext, parts: string[]) {
  const [owner, repo, action] = parts
  if (!owner || !repo || !REPO_PART.test(owner) || !REPO_PART.test(repo)) {
    return json({ error: '仓库地址不合法。' }, 400, 'no-store')
  }

  const token = context.env.GITHUB_TOKEN ?? ''
  const repoPath = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`
  const requestUrl = new URL(context.request.url)

  if (action === 'overview') {
    const [repository, readme] = await Promise.all([
      github<GitHubRepo>(repoPath, token),
      github<GitHubContent>(`${repoPath}/readme`, token),
    ])
    if (!repository)
      return json(
        { error: '仓库不存在或暂时不可访问。' },
        404,
        'public, max-age=60'
      )
    return json({
      repo: repoPayload(repository),
      readme: readme
        ? {
            path: readme.path,
            content: readme.content ?? '',
            encoding: readme.encoding ?? 'base64',
          }
        : null,
    })
  }

  if (action === 'contents') {
    const path = safeQuery(requestUrl.searchParams.get('path'), 1800)
    const ref = safeQuery(requestUrl.searchParams.get('ref'), 255)
    const suffix = path ? `/${encodeGitHubPath(path)}` : ''
    const content = await github<GitHubContent | GitHubContent[]>(
      `${repoPath}/contents${suffix}`,
      token,
      { ref }
    )
    if (!content)
      return json({ error: '文件或目录不存在。' }, 404, 'public, max-age=60')
    if (Array.isArray(content)) {
      return json({
        type: 'dir',
        path,
        items: content.map(contentPayload),
      })
    }
    return json(contentPayload(content))
  }

  if (action === 'tree') {
    const ref = safeQuery(requestUrl.searchParams.get('ref'), 255)
    if (!ref) return json({ error: '缺少仓库分支。' }, 400, 'no-store')
    const tree = await github<GitHubTree>(
      `${repoPath}/git/trees/${encodeURIComponent(ref)}`,
      token,
      { recursive: '1' }
    )
    if (!tree)
      return json({ error: '仓库文件树不存在。' }, 404, 'public, max-age=60')
    return json({
      truncated: tree.truncated || tree.tree.length > 5000,
      items: tree.tree
        .filter((item) => item.type === 'blob' || item.type === 'tree')
        .slice(0, 5000)
        .map((item) => ({
          path: item.path,
          type: item.type,
          size: item.size ?? null,
        })),
    })
  }

  return json({ error: '不支持的仓库操作。' }, 404, 'no-store')
}

export async function onRequestGet(context: PagesContext) {
  const parts = pathParts(context.params.path)
  const cacheStorage = caches as CacheStorage & { default: Cache }
  const cache = cacheStorage.default
  const cacheKey = new Request(context.request.url, { method: 'GET' })
  const cached = await cache.match(cacheKey)
  if (cached) return cached

  try {
    const response = await buildResponse(context, parts)
    if (response.ok) context.waitUntil(cache.put(cacheKey, response.clone()))
    return response
  } catch (error) {
    return json(
      {
        error:
          error instanceof Error
            ? error.message
            : '仓库数据加载失败，请稍后重试。',
      },
      502,
      'no-store'
    )
  }
}

export function onRequest() {
  return json({ error: '仅支持 GET 请求。' }, 405, 'no-store')
}
