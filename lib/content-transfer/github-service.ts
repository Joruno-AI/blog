import {
  CONTENT_BUNDLE_VERSION,
  contentBundleSchema,
  normalizeBundlePath,
  type BundleFile,
  type ContentBundle,
} from './contract'

const API_VERSION = '2026-03-10'
const EXPORT_INDEX_PATH = '.joruno/export-index.json'

interface GitHubTreeItem {
  path: string
  mode: string
  type: 'blob' | 'tree' | 'commit'
  sha: string
  size?: number
}

interface GitHubTree {
  sha: string
  truncated: boolean
  tree: GitHubTreeItem[]
}

function repositoryName(input: string) {
  const value = input.trim().replace(/^https:\/\/github\.com\//, '').replace(/\.git$/, '')
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(value)) throw new Error('GitHub repository must use OWNER/REPO format.')
  return value
}

function githubHeaders(token?: string | null) {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': API_VERSION,
    'User-Agent': 'joruno-content-transfer',
  }
  if (token) headers.Authorization = `Bearer ${token}`
  return headers
}

async function github<T>(path: string, input: { token?: string | null; method?: string; body?: unknown } = {}) {
  const response = await fetch(`https://api.github.com${path}`, {
    method: input.method ?? 'GET',
    headers: { ...githubHeaders(input.token), ...(input.body ? { 'Content-Type': 'application/json' } : {}) },
    body: input.body ? JSON.stringify(input.body) : undefined,
  })
  if (!response.ok) {
    const requestId = response.headers.get('x-github-request-id')
    throw new Error(`GitHub API ${response.status}${requestId ? ` (${requestId})` : ''}.`)
  }
  return response.json() as Promise<T>
}

function decodeBase64(value: string) {
  const binary = atob(value.replaceAll('\n', ''))
  return new TextDecoder().decode(Uint8Array.from(binary, (character) => character.charCodeAt(0)))
}

function managedGitHubPath(path: string) {
  const normalized = normalizeBundlePath(path)
  return normalized === '.joruno/content.json'
    || normalized.startsWith('.joruno/resources/')
    || normalized.startsWith('src/content/blog/')
}

function importableGitHubPath(path: string) {
  const normalized = normalizeBundlePath(path)
  if (managedGitHubPath(normalized)) return true
  if (/^src\/data\/skills-readmes\/[^/]+\.md$/i.test(normalized)) return true
  return normalized.startsWith('src/content/') && /\.(?:md|mdx|json)$/i.test(normalized)
}

function mediaType(path: string) {
  if (/\.json$/i.test(path)) return 'application/json'
  if (/\.mdx?$/i.test(path)) return 'text/markdown'
  return 'text/plain'
}

export async function readContentBundleFromGitHub(input: {
  repository: string
  ref: string
  token?: string | null
}): Promise<ContentBundle> {
  const repository = repositoryName(input.repository)
  const ref = await github<{ object: { sha: string } }>(`/repos/${repository}/git/ref/heads/${encodeURIComponent(input.ref)}`, { token: input.token })
  const tree = await github<GitHubTree>(`/repos/${repository}/git/trees/${ref.object.sha}?recursive=1`, { token: input.token })
  if (tree.truncated) throw new Error('GitHub returned a truncated tree; use a narrower content branch.')
  const entries = tree.tree.filter((entry) => entry.type === 'blob' && importableGitHubPath(entry.path))
  const files: BundleFile[] = []
  for (let index = 0; index < entries.length; index += 20) {
    const group = entries.slice(index, index + 20)
    files.push(...await Promise.all(group.map(async (entry) => {
      const blob = await github<{ content: string; encoding: string }>(`/repos/${repository}/git/blobs/${entry.sha}`, { token: input.token })
      if (blob.encoding !== 'base64') throw new Error(`Unsupported GitHub blob encoding for ${entry.path}.`)
      return {
        path: normalizeBundlePath(entry.path),
        kind: entry.path.startsWith('src/content/') || entry.path.startsWith('src/data/skills-readmes/')
          ? 'content' as const
          : 'data' as const,
        encoding: 'utf8' as const,
        mediaType: mediaType(entry.path),
        content: decodeBase64(blob.content),
        size: entry.size,
      }
    })))
  }
  return contentBundleSchema.parse({
    schemaVersion: CONTENT_BUNDLE_VERSION,
    generatedAt: new Date().toISOString(),
    source: { repository, ref: input.ref, commit: ref.object.sha },
    files,
  })
}

async function ensureBranch(input: { repository: string; branch: string; baseBranch?: string; token: string }) {
  const refPath = `/repos/${input.repository}/git/ref/heads/${encodeURIComponent(input.branch)}`
  try {
    const ref = await github<{ object: { sha: string } }>(refPath, { token: input.token })
    return ref.object.sha
  } catch (error) {
    if (!String(error).includes('GitHub API 404')) throw error
  }
  const repository = await github<{ default_branch: string }>(`/repos/${input.repository}`, { token: input.token })
  const base = input.baseBranch || repository.default_branch
  const baseRef = await github<{ object: { sha: string } }>(`/repos/${input.repository}/git/ref/heads/${encodeURIComponent(base)}`, { token: input.token })
  await github(`/repos/${input.repository}/git/refs`, {
    token: input.token,
    method: 'POST',
    body: { ref: `refs/heads/${input.branch}`, sha: baseRef.object.sha },
  })
  return baseRef.object.sha
}

export async function writeContentBundleToGitHub(input: {
  bundle: ContentBundle
  repository: string
  branch: string
  baseBranch?: string
  message?: string
  token: string
}) {
  const repository = repositoryName(input.repository)
  if (!input.token) throw new Error('GITHUB_TOKEN is not configured.')
  const branch = input.branch.trim()
  if (!/^(?!\/)(?!.*\.\.)(?!.*\.$)[A-Za-z0-9._\/-]+$/.test(branch)) throw new Error('Invalid GitHub branch name.')
  const headSha = await ensureBranch({ repository, branch, baseBranch: input.baseBranch, token: input.token })
  const commit = await github<{ tree: { sha: string } }>(`/repos/${repository}/git/commits/${headSha}`, { token: input.token })
  const embedded = input.bundle.files.filter((file) => file.encoding !== 'external' && managedGitHubPath(file.path))
  const managedPaths = embedded.map((file) => normalizeBundlePath(file.path)).sort()
  const indexContent = `${JSON.stringify({ schemaVersion: CONTENT_BUNDLE_VERSION, files: managedPaths }, null, 2)}\n`
  const files = [...embedded, {
    path: EXPORT_INDEX_PATH,
    kind: 'data' as const,
    encoding: 'utf8' as const,
    mediaType: 'application/json',
    content: indexContent,
  }]

  const treeEntries: Array<{ path: string; mode: '100644'; type: 'blob'; sha: string | null }> = []
  for (let index = 0; index < files.length; index += 20) {
    const group = files.slice(index, index + 20)
    treeEntries.push(...await Promise.all(group.map(async (file) => {
      const blob = await github<{ sha: string }>(`/repos/${repository}/git/blobs`, {
        token: input.token,
        method: 'POST',
        body: {
          content: file.content ?? '',
          encoding: file.encoding === 'base64' ? 'base64' : 'utf-8',
        },
      })
      return { path: normalizeBundlePath(file.path), mode: '100644' as const, type: 'blob' as const, sha: blob.sha }
    })))
  }

  const nextTree = await github<{ sha: string }>(`/repos/${repository}/git/trees`, {
    token: input.token,
    method: 'POST',
    body: { base_tree: commit.tree.sha, tree: treeEntries },
  })
  const nextCommit = await github<{ sha: string; html_url: string }>(`/repos/${repository}/git/commits`, {
    token: input.token,
    method: 'POST',
    body: {
      message: input.message || `chore(content): export Joruno content ${input.bundle.generatedAt}`,
      tree: nextTree.sha,
      parents: [headSha],
    },
  })
  await github(`/repos/${repository}/git/refs/heads/${encodeURIComponent(branch)}`, {
    token: input.token,
    method: 'PATCH',
    body: { sha: nextCommit.sha, force: false },
  })
  return {
    repository,
    branch,
    commit: nextCommit.sha,
    url: nextCommit.html_url,
    writtenFiles: files.length,
    externalAssets: input.bundle.files.filter((file) => file.encoding === 'external').length,
  }
}
