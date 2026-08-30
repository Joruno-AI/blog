import { createHash } from 'node:crypto'

import {
  CONTENT_BUNDLE_VERSION,
  CONTENT_SNAPSHOT_PATH,
  contentBundleSchema,
  normalizeBundlePath,
  type BundleFile,
  type ContentBundle,
} from './contract'

const API_VERSION = '2026-03-10'
export const EXPORT_INDEX_PATH = '.joruno/export-index.json'

// Seven files leaves enough R2 headroom for the per-lease cleanup path even
// when 40 MiB of text crosses the maximum number of 5 MiB multipart parts.
export const GITHUB_FILES_PER_PAGE = 7
export const MAX_GITHUB_EMBEDDED_BYTES = 40 * 1024 * 1024
export const MAX_GITHUB_TEXT_FILE_BYTES = 16 * 1024 * 1024
export const MAX_GITHUB_SNAPSHOT_BYTES = 20 * 1024 * 1024

function maxGitHubTextFileBytes(path: string) {
  // Canonical and per-type snapshots are deliberately multipart/paged in
  // private R2 but remain one logical Git blob apiece for round-trip
  // compatibility. Keep the bound below the aggregate 40 MiB import budget.
  const normalized = normalizeBundlePath(path)
  return normalized === CONTENT_SNAPSHOT_PATH || normalized.startsWith('.joruno/resources/')
    ? MAX_GITHUB_SNAPSHOT_BYTES
    : MAX_GITHUB_TEXT_FILE_BYTES
}

export interface GitHubContentEntry {
  path: string
  sha: string
  size: number
  kind: 'text' | 'asset'
}

export interface GitHubContentSource {
  repository: string
  ref: string
  commit: string
  entries: GitHubContentEntry[]
}

interface GitHubTreeItem {
  path: string
  type: 'blob' | 'tree' | 'commit'
  sha: string
  size?: number
}

function repositoryName(input: string) {
  const value = input.trim().replace(/^https:\/\/github\.com\//, '').replace(/\.git$/, '')
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(value)) throw new Error('GitHub repository must use OWNER/REPO format.')
  return value
}

function githubHeaders(token?: string | null, accept = 'application/vnd.github+json') {
  const headers: Record<string, string> = {
    Accept: accept,
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
    const retryAfter = response.headers.get('retry-after')
    const rateLimitReset = response.headers.get('x-ratelimit-reset')
    const error = new Error(`GitHub API ${response.status}${requestId ? ` (${requestId})` : ''}.`)
    Object.assign(error, {
      status: response.status,
      retryAt: retryAfter
        ? new Date(Date.now() + Number(retryAfter) * 1_000).toISOString()
        : rateLimitReset
          ? new Date(Number(rateLimitReset) * 1_000).toISOString()
          : undefined,
      permanent: response.status >= 400 && response.status < 500 && ![403, 408, 409, 422, 429].includes(response.status),
    })
    throw error
  }
  return response.json() as Promise<T>
}

function decodeBase64(value: string) {
  const binary = atob(value.replaceAll('\n', ''))
  return new TextDecoder().decode(Uint8Array.from(binary, (character) => character.charCodeAt(0)))
}

export function managedGitHubPath(path: string) {
  const normalized = normalizeBundlePath(path)
  return normalized === '.joruno/content.json'
    || normalized.startsWith('.joruno/resources/')
    || normalized.startsWith('src/content/blog/')
}

function textGitHubPath(path: string) {
  const normalized = normalizeBundlePath(path)
  if (managedGitHubPath(normalized)) return true
  if (/^src\/data\/skills-readmes\/[^/]+\.md$/i.test(normalized)) return true
  return normalized.startsWith('src/content/') && /\.(?:md|mdx|json)$/i.test(normalized)
}

function assetGitHubPath(path: string) {
  const normalized = normalizeBundlePath(path)
  return ['public/img/', 'public/music/', 'public/docs-assets/']
    .some((prefix) => normalized.startsWith(prefix))
}

function importableGitHubPath(path: string) {
  return textGitHubPath(path) || assetGitHubPath(path)
}

export function githubMediaType(path: string) {
  const extension = path.split('.').at(-1)?.toLowerCase()
  const types: Record<string, string> = {
    json: 'application/json', md: 'text/markdown', mdx: 'text/markdown', txt: 'text/plain',
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif', svg: 'image/svg+xml', avif: 'image/avif',
    mp3: 'audio/mpeg', m4a: 'audio/mp4', wav: 'audio/wav', ogg: 'audio/ogg', flac: 'audio/flac',
    mp4: 'video/mp4', webm: 'video/webm', pdf: 'application/pdf', zip: 'application/zip',
  }
  return extension ? types[extension] ?? 'application/octet-stream' : 'application/octet-stream'
}

export function githubAssetKey(path: string) {
  const normalized = normalizeBundlePath(path)
  return normalized.startsWith('public/') ? normalized.slice('public/'.length) : `imports/${normalized}`
}

/** Two-request discovery; blob bodies are deliberately fetched by persisted cursor pages. */
export async function discoverGitHubContent(input: {
  repository: string
  ref: string
  token?: string | null
}): Promise<GitHubContentSource> {
  const repository = repositoryName(input.repository)
  const commit = await github<{ sha: string; commit: { tree: { sha: string } } }>(
    `/repos/${repository}/commits/${encodeURIComponent(input.ref)}`,
    { token: input.token },
  )
  const tree = await github<{ truncated: boolean; tree: GitHubTreeItem[] }>(
    `/repos/${repository}/git/trees/${commit.commit.tree.sha}?recursive=1`,
    { token: input.token },
  )
  if (tree.truncated) throw new Error('GitHub returned a truncated tree; use a narrower content branch.')
  const entries = tree.tree
    .filter((entry) => entry.type === 'blob' && importableGitHubPath(entry.path))
    .map((entry): GitHubContentEntry => ({
      path: normalizeBundlePath(entry.path),
      sha: entry.sha,
      size: entry.size ?? 0,
      kind: textGitHubPath(entry.path) ? 'text' : 'asset',
    }))
    .sort((left, right) => (left.kind === right.kind ? left.path.localeCompare(right.path) : left.kind === 'text' ? -1 : 1))
  const embeddedBytes = entries
    .filter((entry) => entry.kind === 'text')
    .reduce((total, entry) => total + entry.size, 0)
  const oversized = entries.find((entry) => entry.kind === 'text' && entry.size > maxGitHubTextFileBytes(entry.path))
  if (oversized) throw new Error(`GitHub text file exceeds its Worker-safe limit: ${oversized.path}`)
  if (embeddedBytes > MAX_GITHUB_EMBEDDED_BYTES) {
    throw new Error('GitHub embedded content exceeds the 40 MB Worker-safe import limit.')
  }
  return { repository, ref: input.ref, commit: commit.sha, entries }
}

export interface GitHubAssetSink {
  reference(entry: GitHubContentEntry): Promise<{ key: string; url: string }>
  write(entry: GitHubContentEntry, body: ReadableStream<Uint8Array>): Promise<{ key: string; url: string }>
}

async function githubBlob(repository: string, sha: string, token?: string | null) {
  const response = await fetch(`https://api.github.com/repos/${repository}/git/blobs/${sha}`, {
    headers: githubHeaders(token, 'application/vnd.github.raw+json'),
  })
  if (!response.ok) throw new Error(`GitHub blob ${response.status} (${sha.slice(0, 8)}).`)
  return response
}

/** Opens one immutable Git blob body for the persisted streaming import job. */
export async function openGitHubContentEntry(
  source: Pick<GitHubContentSource, 'repository'>,
  entry: GitHubContentEntry,
  token?: string | null,
) {
  return githubBlob(source.repository, entry.sha, token)
}

/** Reads one bounded page; callers persist cursor and the growing bundle in R2. */
export async function readGitHubContentPage(input: {
  source: GitHubContentSource
  cursor: number
  token?: string | null
  persistAssets: boolean
  assetSink: GitHubAssetSink
}) {
  const start = Math.min(Math.max(input.cursor, 0), input.source.entries.length)
  const entries = input.source.entries.slice(start, start + GITHUB_FILES_PER_PAGE)
  const files: BundleFile[] = []
  for (const entry of entries) {
    if (entry.kind === 'asset') {
      const stored = input.persistAssets
        ? await (async () => {
          const response = await githubBlob(input.source.repository, entry.sha, input.token)
          if (!response.body) throw new Error(`GitHub blob ${entry.path} has no response body.`)
          return input.assetSink.write(entry, response.body)
        })()
        : await input.assetSink.reference(entry)
      files.push({
        path: entry.path,
        kind: 'asset',
        encoding: 'external',
        mediaType: githubMediaType(entry.path),
        url: stored.url,
        sourceKey: stored.key,
        size: entry.size,
      })
      continue
    }
    const response = await githubBlob(input.source.repository, entry.sha, input.token)
    const content = await response.text()
    files.push({
      path: entry.path,
      kind: entry.path.startsWith('src/content/') || entry.path.startsWith('src/data/skills-readmes/') ? 'content' : 'data',
      encoding: 'utf8',
      mediaType: githubMediaType(entry.path),
      content,
      size: new TextEncoder().encode(content).byteLength,
    })
  }
  const cursor = start + entries.length
  return { files, cursor, total: input.source.entries.length, done: cursor >= input.source.entries.length }
}

export function emptyGitHubContentBundle(source: GitHubContentSource): ContentBundle {
  return contentBundleSchema.parse({
    schemaVersion: CONTENT_BUNDLE_VERSION,
    generatedAt: new Date().toISOString(),
    source: { repository: source.repository, ref: source.ref, commit: source.commit },
    files: [],
  })
}

interface ManagedExportIndex {
  paths: string[]
  shas: Record<string, string>
}

async function readManagedExportIndex(repository: string, headSha: string, token: string): Promise<ManagedExportIndex> {
  try {
    const file = await github<{ content: string; encoding: string }>(
      `/repos/${repository}/contents/${EXPORT_INDEX_PATH}?ref=${encodeURIComponent(headSha)}`,
      { token },
    )
    if (file.encoding !== 'base64') throw new Error('Unsupported GitHub export index encoding.')
    const parsed: unknown = JSON.parse(decodeBase64(file.content))
    if (!parsed || typeof parsed !== 'object' || !Array.isArray((parsed as { files?: unknown }).files)) {
      return { paths: [], shas: {} }
    }
    const paths = [...new Set((parsed as { files: unknown[] }).files.flatMap((path) => {
      if (typeof path !== 'string') return []
      try {
        const normalized = normalizeBundlePath(path)
        return managedGitHubPath(normalized) ? [normalized] : []
      } catch {
        return []
      }
    }))]
    const rawShas = (parsed as { shas?: unknown }).shas
    const shas = rawShas && typeof rawShas === 'object' && !Array.isArray(rawShas)
      ? Object.fromEntries(Object.entries(rawShas).flatMap(([path, sha]) => {
        try {
          const normalized = normalizeBundlePath(path)
          return managedGitHubPath(normalized) && typeof sha === 'string' && /^[a-f0-9]{40}$/i.test(sha)
            ? [[normalized, sha]]
            : []
        } catch {
          return []
        }
      }))
      : {}
    return { paths, shas }
  } catch (error) {
    if (String(error).includes('GitHub API 404')) return { paths: [], shas: {} }
    throw error
  }
}

export async function ensureGitHubExportBranch(input: { repository: string; branch: string; baseBranch?: string; token: string }) {
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

export interface GitHubTreeExportSession {
  repository: string
  branch: string
  headSha: string
  baseTreeSha: string
  currentTreeSha: string
  previousManagedPaths: string[]
  knownShas: Record<string, string>
}

export interface GitHubTreeExportPatchResult {
  treeSha: string
  knownShas: Record<string, string>
  managedPaths: string[]
  changedFiles: number
  unchangedFiles: number
}

type GitHubTreeEntry = {
  path: string
  mode: '100644'
  type: 'blob'
  sha?: string | null
  content?: string
}

const GITHUB_INLINE_TREE_FILE_BYTES = 4 * 1024 * 1024
const GITHUB_TREE_PATCH_BYTES = 5 * 1024 * 1024
const GITHUB_TREE_PATCH_FILES = 20

function validBranch(input: string) {
  const branch = input.trim()
  if (!/^(?!\/)(?!.*\.\.)(?!.*\.$)[A-Za-z0-9._\/-]+$/.test(branch)) {
    throw new Error('Invalid GitHub branch name.')
  }
  return branch
}

export function gitBlobSha(content: string) {
  const bytes = new TextEncoder().encode(content)
  const hash = createHash('sha1')
  hash.update(`blob ${bytes.byteLength}\0`)
  hash.update(bytes)
  return hash.digest('hex')
}

export async function beginGitHubTreeExport(input: {
  repository: string
  branch: string
  baseBranch?: string
  token: string
}): Promise<GitHubTreeExportSession> {
  const repository = repositoryName(input.repository)
  if (!input.token) throw new Error('GITHUB_TOKEN is not configured.')
  const branch = validBranch(input.branch)
  const headSha = await ensureGitHubExportBranch({ repository, branch, baseBranch: input.baseBranch, token: input.token })
  const [index, commit] = await Promise.all([
    readManagedExportIndex(repository, headSha, input.token),
    github<{ tree: { sha: string } }>(`/repos/${repository}/git/commits/${headSha}`, { token: input.token }),
  ])
  let knownShas = { ...index.shas }
  try {
    const tree = await github<{ truncated: boolean; tree: GitHubTreeItem[] }>(
      `/repos/${repository}/git/trees/${commit.tree.sha}?recursive=1`,
      { token: input.token },
    )
    knownShas = {
      ...knownShas,
      ...Object.fromEntries(tree.tree.flatMap((entry) => {
        if (entry.type !== 'blob') return []
        try {
          const path = normalizeBundlePath(entry.path)
          return managedGitHubPath(path) ? [[path, entry.sha]] : []
        } catch {
          return []
        }
      })),
    }
  } catch {
    // The persisted export index still provides safe incremental reuse when a
    // very large repository cannot return a complete recursive tree.
  }
  return {
    repository,
    branch,
    headSha,
    baseTreeSha: commit.tree.sha,
    currentTreeSha: commit.tree.sha,
    previousManagedPaths: index.paths,
    knownShas,
  }
}

async function createGitHubBlob(input: { repository: string; token: string; content: string }) {
  return github<{ sha: string }>(`/repos/${input.repository}/git/blobs`, {
    token: input.token,
    method: 'POST',
    body: { content: input.content, encoding: 'utf-8' },
  })
}

async function createGitHubTree(input: {
  repository: string
  token: string
  baseTree: string
  entries: GitHubTreeEntry[]
}) {
  if (!input.entries.length) return input.baseTree
  const tree = await github<{ sha: string }>(`/repos/${input.repository}/git/trees`, {
    token: input.token,
    method: 'POST',
    body: { base_tree: input.baseTree, tree: input.entries },
  })
  return tree.sha
}

export async function patchGitHubExportTree(input: {
  repository: string
  token: string
  baseTree: string
  knownShas: Record<string, string>
  files: BundleFile[]
}): Promise<GitHubTreeExportPatchResult> {
  const knownShas = { ...input.knownShas }
  const managedPaths: string[] = []
  const entries: GitHubTreeEntry[] = []
  let changedFiles = 0
  let unchangedFiles = 0
  let inlineBytes = 0

  for (const file of input.files) {
    if (file.encoding === 'external' || !managedGitHubPath(file.path)) continue
    const path = normalizeBundlePath(file.path)
    const content = file.content ?? ''
    const bytes = new TextEncoder().encode(content).byteLength
    if (bytes > maxGitHubTextFileBytes(path)) {
      throw new Error(`GitHub export file exceeds its Worker-safe limit: ${path}`)
    }
    const sha = gitBlobSha(content)
    managedPaths.push(path)
    if (knownShas[path] === sha) {
      unchangedFiles += 1
      continue
    }
    if (bytes > GITHUB_INLINE_TREE_FILE_BYTES) {
      const blob = await createGitHubBlob({ repository: input.repository, token: input.token, content })
      entries.push({ path, mode: '100644', type: 'blob', sha: blob.sha })
      knownShas[path] = blob.sha
    } else {
      inlineBytes += bytes
      if (inlineBytes > GITHUB_TREE_PATCH_BYTES) {
        throw new Error('GitHub tree patch exceeds the bounded 5 MB payload; persist a smaller export page.')
      }
      entries.push({ path, mode: '100644', type: 'blob', content })
      knownShas[path] = sha
    }
    changedFiles += 1
  }
  if (entries.length > GITHUB_TREE_PATCH_FILES) {
    throw new Error(`GitHub tree patch exceeds ${GITHUB_TREE_PATCH_FILES} files.`)
  }
  const treeSha = await createGitHubTree({
    repository: input.repository,
    token: input.token,
    baseTree: input.baseTree,
    entries,
  })
  return { treeSha, knownShas, managedPaths, changedFiles, unchangedFiles }
}

export async function writeGitHubExportIndex(input: {
  repository: string
  token: string
  baseTree: string
  previousManagedPaths: string[]
  managedPaths: string[]
  knownShas: Record<string, string>
}) {
  const paths = [...new Set(input.managedPaths.map(normalizeBundlePath))].sort()
  const pathSet = new Set(paths)
  const deletedPaths = input.previousManagedPaths.filter((path) => !pathSet.has(path))
  const shas = Object.fromEntries(paths.flatMap((path) => input.knownShas[path] ? [[path, input.knownShas[path]]] : []))
  const content = `${JSON.stringify({ schemaVersion: CONTENT_BUNDLE_VERSION, files: paths, shas }, null, 2)}\n`
  const entries: GitHubTreeEntry[] = [{
    path: EXPORT_INDEX_PATH,
    mode: '100644',
    type: 'blob',
    content,
  }, ...deletedPaths.map((path) => ({
    path,
    mode: '100644' as const,
    type: 'blob' as const,
    sha: null,
  }))]
  const treeSha = await createGitHubTree({
    repository: input.repository,
    token: input.token,
    baseTree: input.baseTree,
    entries,
  })
  return { treeSha, deletedPaths, indexSha: gitBlobSha(content) }
}

export async function createGitHubExportCommit(input: {
  repository: string
  token: string
  headSha: string
  treeSha: string
  message: string
}) {
  return github<{ sha: string; html_url: string }>(`/repos/${input.repository}/git/commits`, {
    token: input.token,
    method: 'POST',
    body: { message: input.message, tree: input.treeSha, parents: [input.headSha] },
  })
}

export async function updateGitHubExportRef(input: {
  repository: string
  branch: string
  token: string
  commitSha: string
}) {
  await github(`/repos/${input.repository}/git/refs/heads/${encodeURIComponent(input.branch)}`, {
    token: input.token,
    method: 'PATCH',
    body: { sha: input.commitSha, force: false },
  })
}

function boundedGitHubFileGroups(files: BundleFile[]) {
  const groups: BundleFile[][] = []
  let group: BundleFile[] = []
  let bytes = 0
  for (const file of files) {
    if (file.encoding === 'external' || !managedGitHubPath(file.path)) continue
    const size = new TextEncoder().encode(file.content ?? '').byteLength
    if (group.length && (group.length >= GITHUB_TREE_PATCH_FILES || bytes + size > GITHUB_TREE_PATCH_BYTES)) {
      groups.push(group)
      group = []
      bytes = 0
    }
    group.push(file)
    bytes += size
  }
  if (group.length) groups.push(group)
  return groups
}

/**
 * Compatibility entry point for small/local callers. Production routes use
 * the persisted export job, which calls the same tree-patch primitives one
 * bounded page per invocation.
 */
export async function writeContentBundleToGitHub(input: {
  bundle: ContentBundle
  repository: string
  branch: string
  baseBranch?: string
  message?: string
  token: string
}) {
  const session = await beginGitHubTreeExport(input)
  let treeSha = session.currentTreeSha
  let knownShas = session.knownShas
  const managedPaths: string[] = []
  let changedFiles = 0
  let unchangedFiles = 0
  for (const group of boundedGitHubFileGroups(input.bundle.files)) {
    const result = await patchGitHubExportTree({
      repository: session.repository,
      token: input.token,
      baseTree: treeSha,
      knownShas,
      files: group,
    })
    treeSha = result.treeSha
    knownShas = result.knownShas
    managedPaths.push(...result.managedPaths)
    changedFiles += result.changedFiles
    unchangedFiles += result.unchangedFiles
  }
  const indexed = await writeGitHubExportIndex({
    repository: session.repository,
    token: input.token,
    baseTree: treeSha,
    previousManagedPaths: session.previousManagedPaths,
    managedPaths,
    knownShas,
  })
  const commit = await createGitHubExportCommit({
    repository: session.repository,
    token: input.token,
    headSha: session.headSha,
    treeSha: indexed.treeSha,
    message: input.message || `chore(content): export Joruno content ${input.bundle.generatedAt}`,
  })
  await updateGitHubExportRef({
    repository: session.repository,
    branch: session.branch,
    token: input.token,
    commitSha: commit.sha,
  })
  return {
    repository: session.repository,
    branch: session.branch,
    commit: commit.sha,
    url: commit.html_url,
    writtenFiles: changedFiles + 1,
    unchangedFiles,
    deletedFiles: indexed.deletedPaths.length,
    externalAssets: input.bundle.files.filter((file) => file.encoding === 'external').length,
  }
}
