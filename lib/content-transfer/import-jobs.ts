import { createHash } from 'node:crypto'

import { getCloudflareContext } from '@opennextjs/cloudflare'
import { and, desc, eq, inArray, isNull } from 'drizzle-orm'

import { db } from '@/lib/db'
import { platformJobs } from '@/lib/db/schema'

import { CONTENT_BUNDLE_VERSION, CONTENT_SNAPSHOT_PATH, contentBundleSchema, type ContentBundle } from './contract'
import {
  discoverGitHubContent,
  GITHUB_FILES_PER_PAGE,
  githubAssetKey,
  githubMediaType,
  openGitHubContentEntry,
  type GitHubContentEntry,
  type GitHubContentSource,
} from './github-service'
import { type ContentImportPlan } from './import-service'
import {
  clearContentImportStaging,
  commitContentImport,
  contentImportStagePayloadBytes,
  contentSnapshotItemRecords,
  emptyContentImportPlan,
  mergeContentImportPlans,
  preflightContentImportRecords,
  stageImportRecords,
  type ImportStageRecord,
} from './import-staging'
import {
  IMPORT_SNAPSHOT_ITEMS_PER_PAGE,
  decodeBase64Stream,
  decodeJsonStringStream,
  indexContentSnapshot,
  scanUploadedContentBundle,
  type ImportedBundleHeader,
  type PersistedImportFile,
  type SnapshotItemRange,
} from './import-stream'
import {
  legacyAstroImportCandidateCount,
  planLegacyAstroImport,
  stageLegacyAstroImportPage,
} from './legacy-astro-import'

const JOB_TYPE = 'content_import_v3'
const RUNNING_LEASE_MS = 2 * 60 * 1_000
const MAX_CONSECUTIVE_ATTEMPTS = 5
const MULTIPART_PART_BYTES = 5 * 1024 * 1024
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024
const MAX_STAGE_RECORDS = 20
const MAX_STAGE_JSON_BYTES = 1024 * 1024
const MAX_STAGE_CONTENT_BYTES = 4 * 1024 * 1024
const MAX_SMALL_OBJECT_BYTES = 1024 * 1024
const MAX_LEGACY_COMPAT_BUNDLE_BYTES = 8 * 1024 * 1024
const GITHUB_DESCRIPTOR_FILES_PER_PAGE = GITHUB_FILES_PER_PAGE
const LEGACY_FILES_PER_MATERIALIZE_ADVANCE = GITHUB_FILES_PER_PAGE * 4
const LEGACY_COMPACTION_FAN_IN = 20
// Prefix deletion is durable progress because R2 deletes are strongly
// consistent. A terminal poll may spend at most 40 R2 operations (20
// list/delete pairs); an invocation that just did phase work spends at most
// four, leaving headroom below 50 even after the worst acquisition page.
const TERMINAL_CLEANUP_PAGES_AFTER_ADVANCE = 2
const TERMINAL_CLEANUP_PAGES_PER_INVOCATION = 20

// Every non-terminal advance performs one ownership read, one lease claim,
// one fenced release, and one refreshed ownership read around its phase work.
export const CONTENT_IMPORT_JOB_D1_ENVELOPE_QUERIES = 4
// Phase work peaks at 46 for a worst-case GitHub acquisition plus lease-loss
// cleanup. A dedicated terminal poll is held to 40 R2 operations.
export const CONTENT_IMPORT_MAX_R2_OPERATIONS_PER_ADVANCE = 46

export interface ImportBucketObject {
  etag: string
  size: number
  body: ReadableStream<Uint8Array>
  text(): Promise<string>
}

export interface ImportBucketMultipartUpload {
  uploadPart(partNumber: number, value: Uint8Array): Promise<{ partNumber: number; etag: string }>
  complete(parts: Array<{ partNumber: number; etag: string }>): Promise<ImportBucketObject>
  abort(): Promise<void>
}

export interface ImportBucket {
  head(key: string): Promise<ImportBucketObject | null>
  get(
    key: string,
    options?: { range?: { offset: number; length: number }; onlyIf?: { etagMatches?: string } },
  ): Promise<ImportBucketObject | null>
  put(
    key: string,
    value: string | Uint8Array | ReadableStream<Uint8Array>,
    options?: {
      httpMetadata?: { contentType?: string }
      onlyIf?: { etagMatches?: string; etagDoesNotMatch?: string }
    },
  ): Promise<ImportBucketObject | null>
  createMultipartUpload(
    key: string,
    options?: { httpMetadata?: { contentType?: string } },
  ): Promise<ImportBucketMultipartUpload>
  delete(key: string | string[]): Promise<void>
  list(options?: { prefix?: string; cursor?: string; limit?: number }): Promise<{
    objects: Array<{ key: string }>
    truncated: boolean
    cursor?: string
  }>
}

interface ImportJobInput {
  version: 3
  ownerId: string
  dryRun: boolean
  packagePrefix: string
  rawBundleKey?: string
  rawBundleEtag?: string
  rawBundleSize?: number
  legacyBundleKey?: string
  github?: GitHubContentSource
  baselines?: Record<string, string | null>
}

interface ImportTotals {
  created: number
  updated: number
  unchanged: number
  assets: number
}

type ImportPhase = 'acquire' | 'scan' | 'decode' | 'index' | 'stage' | 'legacy-materialize' | 'legacy-plan' | 'legacy-stage' | 'commit' | 'cleanup' | 'complete'

export interface StoredImportObjectDescriptor {
  key: string
  size: number
  sha256: string
}

export interface LegacyImportCompactionState {
  level: number
  cursor: number
  inputs: StoredImportObjectDescriptor[] | null
  outputs: StoredImportObjectDescriptor[]
}

export interface LegacyGitHubMaterializationState {
  stage: 'fragments' | 'compact'
  cursor: number
  firstFile: boolean
  embeddedBytes: number
  serializedBytes: number
  fragments: StoredImportObjectDescriptor[]
  compaction?: LegacyImportCompactionState
}

interface SnapshotObjectState {
  key: string
  etag: string
  size: number
  checksum: string | null
  rawContentRange?: { offset: number; length: number }
  encoding: 'utf8' | 'base64'
}

interface ImportJobOutput {
  phase: ImportPhase
  cursor: number
  total: number
  plan: (ContentImportPlan & { sourceMode?: 'legacy-astro' }) | null
  result: ImportTotals
  repository?: string
  ref?: string
  retryAt?: string
  leaseToken?: string
  header?: ImportedBundleHeader
  descriptorGeneration?: string
  descriptorPageCount?: number
  indexGeneration?: string
  indexPageCount?: number
  stagedRecords?: number
  snapshot?: SnapshotObjectState
  sourceMode?: 'snapshot' | 'legacy-astro'
  legacyMaterialization?: LegacyGitHubMaterializationState
}

function withoutLease(output: ImportJobOutput): ImportJobOutput {
  const persisted = { ...output }
  delete persisted.leaseToken
  return persisted
}

function importBucket() {
  return getCloudflareContext().env.CONTENT_IMPORT_BUCKET as unknown as ImportBucket
}

function mediaBucket() {
  return getCloudflareContext().env.R2_BUCKET as unknown as ImportBucket
}

function publicAssetUrl(key: string) {
  const base = process.env.R2_PUBLIC_URL?.trim().replace(/\/+$/, '')
  if (!base) throw new Error('R2_PUBLIC_URL is not configured.')
  return `${base}/${key.replace(/^\/+/, '')}`
}

function parseJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback
  try { return JSON.parse(value) as T } catch { return fallback }
}

function emptyTotals(): ImportTotals {
  return { created: 0, updated: 0, unchanged: 0, assets: 0 }
}

function descriptorPageKey(input: ImportJobInput, generation: string, page: number) {
  return `${input.packagePrefix}/descriptors/${generation}/${page}.json`
}

function githubDescriptorPageKey(input: ImportJobInput, page: number) {
  return descriptorPageKey(input, 'github', page)
}

function snapshotIndexPageKey(input: ImportJobInput, generation: string, page: number) {
  return `${input.packagePrefix}/snapshot-index/${generation}/${page}.json`
}

async function putImmutableJson(key: string, value: unknown) {
  await importBucket().put(key, JSON.stringify(value), {
    httpMetadata: { contentType: 'application/json; charset=utf-8' },
    onlyIf: { etagDoesNotMatch: '*' },
  })
}

async function readSmallJson<T>(
  key: string,
  maximumBytes = MAX_SMALL_OBJECT_BYTES,
  bucket: ImportBucket = importBucket(),
) {
  const object = await bucket.get(key)
  if (!object) throw new Error('Persisted import metadata is missing from R2.')
  if (object.size > maximumBytes) throw new Error('Persisted import metadata exceeds the Worker-safe limit.')
  return JSON.parse(await object.text()) as T
}

async function getPersistedObject(
  key: string,
  expectedEtag?: string,
  bucket: ImportBucket = importBucket(),
) {
  const object = await bucket.get(key, expectedEtag ? { onlyIf: { etagMatches: expectedEtag } } : undefined)
  if (!object) throw new Error('Persisted import object is missing from R2.')
  if (expectedEtag && object.etag !== expectedEtag) {
    throw new Error('Persisted import object changed after the job was created.')
  }
  return object
}

async function storeStream(
  key: string,
  stream: ReadableStream<Uint8Array>,
  contentType = 'application/octet-stream',
  maximumBytes = MAX_UPLOAD_BYTES,
) {
  const upload = await importBucket().createMultipartUpload(key, { httpMetadata: { contentType } })
  const reader = stream.getReader()
  const hash = createHash('sha256')
  const parts: Array<{ partNumber: number; etag: string }> = []
  // Tiny GitHub text files should not each reserve a 5 MiB transient buffer.
  // A valid stream cannot outgrow maximumBytes; the final/only multipart part
  // may be smaller than Cloudflare's 5 MiB non-final-part minimum.
  let buffer = new Uint8Array(Math.min(MULTIPART_PART_BYTES, Math.max(1, maximumBytes)))
  let buffered = 0
  let size = 0
  let partNumber = 1
  try {
    while (true) {
      const next = await reader.read()
      if (next.done) break
      let offset = 0
      hash.update(next.value)
      size += next.value.byteLength
      if (size > maximumBytes) throw new Error('Persisted import stream exceeds its declared Worker-safe limit.')
      while (offset < next.value.byteLength) {
        const copy = Math.min(buffer.byteLength - buffered, next.value.byteLength - offset)
        buffer.set(next.value.subarray(offset, offset + copy), buffered)
        buffered += copy
        offset += copy
        if (buffered === buffer.byteLength) {
          parts.push(await upload.uploadPart(partNumber, buffer))
          partNumber += 1
          buffer = new Uint8Array(MULTIPART_PART_BYTES)
          buffered = 0
        }
      }
    }
    if (buffered || !parts.length) parts.push(await upload.uploadPart(partNumber, buffer.slice(0, buffered)))
    const object = await upload.complete(parts)
    return { key, etag: object.etag, size, checksum: hash.digest('hex') }
  } catch (error) {
    await Promise.allSettled([upload.abort()])
    throw error
  } finally {
    reader.releaseLock()
  }
}

async function deletePrefix(
  prefix: string,
  bucket: ImportBucket = importBucket(),
  maximumPages = Number.POSITIVE_INFINITY,
) {
  for (let pages = 0; pages < maximumPages; pages += 1) {
    // Restart at the prefix head after each strongly-consistent delete. The
    // removed objects themselves are the durable cursor, so a crashed cleanup
    // resumes safely without persisting an opaque list cursor.
    const page = await bucket.list({ prefix: `${prefix}/`, limit: 1_000 })
    for (let start = 0; start < page.objects.length; start += 1_000) {
      const keys = page.objects.slice(start, start + 1_000).map((object) => object.key)
      if (keys.length) await bucket.delete(keys)
    }
    if (!page.truncated) return true
  }
  return false
}

function publicJob(job: typeof platformJobs.$inferSelect) {
  const output = parseJson<ImportJobOutput>(job.outputJson, {
    phase: 'stage', cursor: 0, total: 0, plan: null, result: emptyTotals(),
  })
  return {
    jobId: job.id,
    status: job.status,
    progress: job.progress,
    phase: output.phase,
    cursor: output.cursor,
    total: output.total,
    plan: output.plan,
    result: output.result,
    repository: output.repository,
    ref: output.ref,
    retryAt: output.retryAt,
    error: job.error,
    done: job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled',
  }
}

async function insertJob(id: string, input: ImportJobInput, output: ImportJobOutput) {
  const now = new Date()
  await db.insert(platformJobs).values({
    id,
    type: JOB_TYPE,
    status: 'pending',
    progress: 0,
    attempts: 0,
    maxAttempts: MAX_CONSECUTIVE_ATTEMPTS,
    inputJson: JSON.stringify(input),
    outputJson: JSON.stringify(output),
    createdAt: now,
    updatedAt: now,
  })
  const [job] = await db.select().from(platformJobs).where(eq(platformJobs.id, id)).limit(1)
  return publicJob(job)
}

function throwConflicts(plan: { conflicts: string[] }) {
  if (!plan.conflicts.length) return
  const error = new Error('Content bundle conflicts with live content or a changed Studio revision.')
  Object.assign(error, { conflicts: plan.conflicts, permanent: true })
  throw error
}

export async function createUploadedContentImportJob(input: {
  body: ReadableStream<Uint8Array>
  contentLength: number
  dryRun: boolean
  ownerId: string
}) {
  if (!Number.isSafeInteger(input.contentLength) || input.contentLength <= 0) {
    throw new Error('Content-Length is required for a streamed content import.')
  }
  if (input.contentLength > MAX_UPLOAD_BYTES) throw new Error('Content bundle exceeds the 50 MB request limit.')
  const id = crypto.randomUUID()
  const packagePrefix = `${id}/package`
  const rawBundleKey = `${packagePrefix}/uploaded-bundle.json`
  const stored = await storeStream(rawBundleKey, input.body, 'application/json; charset=utf-8', input.contentLength)
  if (stored.size !== input.contentLength) {
    await Promise.allSettled([deletePrefix(packagePrefix)])
    throw new Error('Uploaded content length changed while the bundle was being persisted.')
  }
  return insertJob(id, {
    version: 3,
    ownerId: input.ownerId,
    dryRun: input.dryRun,
    packagePrefix,
    rawBundleKey,
    rawBundleEtag: stored.etag,
    rawBundleSize: stored.size,
  }, {
    phase: 'scan', cursor: 0, total: stored.size, plan: null, result: emptyTotals(),
  })
}

export async function createGitHubContentImportJob(input: {
  repository: string
  ref: string
  token?: string | null
  ownerId: string
  dryRun: boolean
}) {
  const source = await discoverGitHubContent(input)
  const id = crypto.randomUUID()
  return insertJob(id, {
    version: 3,
    ownerId: input.ownerId,
    packagePrefix: `${id}/package`,
    dryRun: input.dryRun,
    github: source,
  }, {
    phase: 'acquire',
    cursor: 0,
    total: source.entries.length,
    plan: null,
    result: emptyTotals(),
    repository: source.repository,
    ref: source.ref,
    header: {
      schemaVersion: CONTENT_BUNDLE_VERSION,
      generatedAt: new Date().toISOString(),
      source: { repository: source.repository, ref: source.ref, commit: source.commit },
    },
  })
}

async function ownedJob(id: string, ownerId: string) {
  const [job] = await db.select().from(platformJobs).where(eq(platformJobs.id, id)).limit(1)
  if (!job || job.type !== JOB_TYPE) return null
  const input = parseJson<ImportJobInput | null>(job.inputJson, null)
  if (!input || input.ownerId !== ownerId || input.version !== 3) return null
  return { job, input, output: parseJson<ImportJobOutput>(job.outputJson, {
    phase: 'stage', cursor: 0, total: 0, plan: null, result: emptyTotals(),
  }) }
}

export async function getContentImportJob(id: string, ownerId: string) {
  const owned = await ownedJob(id, ownerId)
  return owned ? publicJob(owned.job) : null
}

export async function listContentImportJobs(ownerId: string) {
  const rows = await db.select().from(platformJobs)
    .where(and(
      eq(platformJobs.type, JOB_TYPE),
      inArray(platformJobs.status, ['pending', 'running', 'waiting']),
    ))
    .orderBy(desc(platformJobs.updatedAt))
    .limit(20)
  return rows.flatMap((job) => {
    const input = parseJson<ImportJobInput | null>(job.inputJson, null)
    return input?.ownerId === ownerId ? [publicJob(job)] : []
  })
}

export function contentAddressedAssetKey(entry: GitHubContentEntry) {
  return `imported-assets/${entry.sha}/${githubAssetKey(entry.path)}`
}

function githubAssetSink() {
  return {
    async reference(entry: GitHubContentEntry) {
      const key = contentAddressedAssetKey(entry)
      return { key, url: publicAssetUrl(key) }
    },
    async write(entry: GitHubContentEntry, body: ReadableStream<Uint8Array>) {
      const key = contentAddressedAssetKey(entry)
      await mediaBucket().put(key, body, { httpMetadata: { contentType: githubMediaType(entry.path) } })
      return { key, url: publicAssetUrl(key) }
    },
  }
}

async function acquireGitHubPage(input: ImportJobInput, output: ImportJobOutput) {
  if (!input.github) throw new Error('GitHub acquisition state is missing.')
  const source = input.github
  const start = Math.min(Math.max(output.cursor, 0), source.entries.length)
  const entries = source.entries.slice(start, start + GITHUB_DESCRIPTOR_FILES_PER_PAGE)
  const files: PersistedImportFile[] = []
  let snapshot: SnapshotObjectState | undefined = output.snapshot
  for (let localIndex = 0; localIndex < entries.length; localIndex += 1) {
    const entry = entries[localIndex]
    const index = start + localIndex
    if (entry.kind === 'asset') {
      const stored = input.dryRun
        ? await githubAssetSink().reference(entry)
        : await (async () => {
          const response = await openGitHubContentEntry(source, entry, process.env.GITHUB_TOKEN)
          if (!response.body) throw new Error(`GitHub blob ${entry.path} has no response body.`)
          return githubAssetSink().write(entry, response.body)
        })()
      files.push({
        index,
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
    const key = `${input.packagePrefix}/github-content/${entry.sha}`
    let stored = await importBucket().head(key)
    if (stored && stored.size !== entry.size) {
      throw new Error(`Persisted GitHub blob size changed for ${entry.path}.`)
    }
    if (!stored) {
      const response = await openGitHubContentEntry(source, entry, process.env.GITHUB_TOKEN)
      if (!response.body) throw new Error(`GitHub blob ${entry.path} has no response body.`)
      const written = await storeStream(key, response.body, githubMediaType(entry.path), entry.size)
      if (written.size !== entry.size) throw new Error(`GitHub blob size changed for ${entry.path}.`)
      stored = await importBucket().head(key)
    }
    if (!stored) throw new Error(`Persisted GitHub content is missing for ${entry.path}.`)
    const file: PersistedImportFile = {
      index,
      path: entry.path,
      kind: entry.path.startsWith('src/content/') || entry.path.startsWith('src/data/skills-readmes/') ? 'content' : 'data',
      encoding: 'utf8',
      mediaType: githubMediaType(entry.path),
      contentKey: key,
      size: entry.size,
    }
    files.push(file)
    if (entry.path === CONTENT_SNAPSHOT_PATH) {
      snapshot = {
        key,
        etag: stored.etag,
        size: stored.size,
        checksum: null,
        encoding: 'utf8',
      }
    }
  }
  const pageNumber = Math.floor(start / GITHUB_DESCRIPTOR_FILES_PER_PAGE)
  await putImmutableJson(githubDescriptorPageKey(input, pageNumber), files)
  const cursor = start + entries.length
  return { cursor, total: source.entries.length, done: cursor >= source.entries.length, snapshot }
}

export function newLegacyGitHubMaterializationState(): LegacyGitHubMaterializationState {
  return {
    stage: 'fragments',
    cursor: 0,
    firstFile: true,
    embeddedBytes: 0,
    serializedBytes: 0,
    fragments: [],
  }
}

function storedTextDescriptor(key: string, content: string): StoredImportObjectDescriptor {
  const bytes = new TextEncoder().encode(content)
  return {
    key,
    size: bytes.byteLength,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  }
}

async function readVerifiedStoredText(bucket: ImportBucket, descriptor: StoredImportObjectDescriptor) {
  const object = await bucket.get(descriptor.key)
  if (!object) throw new Error('Persisted legacy import fragment is missing from R2.')
  if (object.size !== descriptor.size) throw new Error('Persisted legacy import fragment size changed in R2.')
  const content = await object.text()
  const bytes = new TextEncoder().encode(content)
  if (bytes.byteLength !== descriptor.size
    || createHash('sha256').update(bytes).digest('hex') !== descriptor.sha256) {
    throw new Error('Persisted legacy import fragment checksum changed in R2.')
  }
  return content
}

/**
 * Advances legacy GitHub compatibility materialization by one bounded R2
 * page/fan-in. The caller persists the returned state behind the job lease CAS.
 * A fragment advance performs at most 4 descriptor GETs + 28 content GETs +
 * one PUT; compaction performs at most 20 GETs + one PUT.
 */
export async function advanceLegacyGitHubBundleMaterialization(input: {
  bucket: ImportBucket
  packagePrefix: string
  totalEntries: number
  header: ImportedBundleHeader
  state: LegacyGitHubMaterializationState
  artifactKey: string
}) {
  const state = structuredClone(input.state)
  if (state.stage === 'fragments') {
    const start = Math.min(Math.max(state.cursor, 0), input.totalEntries)
    const end = Math.min(input.totalEntries, start + LEGACY_FILES_PER_MATERIALIZE_ADVANCE)
    let fragment = start === 0
      ? `{"schemaVersion":${JSON.stringify(input.header.schemaVersion)},"generatedAt":${JSON.stringify(input.header.generatedAt)},"source":${JSON.stringify(input.header.source)},"files":[`
      : ''
    let processed = 0
    if (start < end) {
      const firstPage = Math.floor(start / GITHUB_DESCRIPTOR_FILES_PER_PAGE)
      const lastPage = Math.floor((end - 1) / GITHUB_DESCRIPTOR_FILES_PER_PAGE)
      for (let page = firstPage; page <= lastPage; page += 1) {
        const descriptors = await readSmallJson<PersistedImportFile[]>(
          `${input.packagePrefix}/descriptors/github/${page}.json`,
          MAX_SMALL_OBJECT_BYTES,
          input.bucket,
        )
        for (const descriptor of descriptors) {
          if (descriptor.index < start || descriptor.index >= end) continue
          const expectedIndex = start + processed
          if (descriptor.index !== expectedIndex) {
            throw new Error('Persisted GitHub descriptor order changed during legacy materialization.')
          }
          const { contentKey } = descriptor
          const file: ContentBundle['files'][number] = {
            path: descriptor.path,
            kind: descriptor.kind,
            encoding: descriptor.encoding,
            mediaType: descriptor.mediaType,
            url: descriptor.url,
            sourceKey: descriptor.sourceKey,
            checksum: descriptor.checksum,
            size: descriptor.size,
          }
          let serialized: string
          if (!contentKey) {
            serialized = JSON.stringify(file)
          } else {
            const object = await getPersistedObject(contentKey, undefined, input.bucket)
            if (typeof descriptor.size === 'number' && object.size !== descriptor.size) {
              throw new Error(`Persisted GitHub blob size changed for ${descriptor.path}.`)
            }
            state.embeddedBytes += object.size
            if (state.embeddedBytes > MAX_LEGACY_COMPAT_BUNDLE_BYTES) {
              throw new Error('Legacy Astro content exceeds the 8 MB Worker-safe compatibility limit; export a snapshot bundle first.')
            }
            serialized = JSON.stringify({ ...file, content: await object.text() })
          }
          fragment += `${state.firstFile ? '' : ','}${serialized}`
          state.firstFile = false
          processed += 1
        }
      }
      if (processed !== end - start) {
        throw new Error('Persisted GitHub descriptors are incomplete during legacy materialization.')
      }
    }
    if (end === input.totalEntries) fragment += ']}'
    const descriptor = storedTextDescriptor(input.artifactKey, fragment)
    if (state.serializedBytes + descriptor.size > MAX_LEGACY_COMPAT_BUNDLE_BYTES) {
      throw new Error('Legacy Astro content exceeds the 8 MB Worker-safe compatibility limit; export a snapshot bundle first.')
    }
    const stored = await input.bucket.put(input.artifactKey, fragment, {
      httpMetadata: { contentType: 'application/json; charset=utf-8' },
    })
    if (!stored) throw new Error('Failed to persist the bounded legacy compatibility fragment.')
    state.fragments.push(descriptor)
    state.serializedBytes += descriptor.size
    state.cursor = end
    if (end < input.totalEntries) return { state, done: false, bundleKey: null }
    if (state.fragments.length === 1) {
      return { state, done: true, bundleKey: state.fragments[0].key }
    }
    state.stage = 'compact'
    state.compaction = { level: 0, cursor: 0, inputs: null, outputs: [] }
    return { state, done: false, bundleKey: null }
  }

  state.compaction ??= { level: 0, cursor: 0, inputs: null, outputs: [] }
  const compaction = state.compaction
  const source = compaction.inputs ?? state.fragments
  const selected = source.slice(compaction.cursor, compaction.cursor + LEGACY_COMPACTION_FAN_IN)
  if (!selected.length) throw new Error('Persisted legacy import compaction cursor is invalid.')
  const chunks: string[] = []
  let size = 0
  for (const descriptor of selected) {
    const chunk = await readVerifiedStoredText(input.bucket, descriptor)
    chunks.push(chunk)
    size += descriptor.size
    if (size > MAX_LEGACY_COMPAT_BUNDLE_BYTES) {
      throw new Error('Legacy Astro content exceeds the 8 MB Worker-safe compatibility limit; export a snapshot bundle first.')
    }
  }
  const content = chunks.join('')
  const descriptor = storedTextDescriptor(input.artifactKey, content)
  if (descriptor.size !== size) throw new Error('Persisted legacy import compaction size changed.')
  const stored = await input.bucket.put(input.artifactKey, content, {
    httpMetadata: { contentType: 'application/json; charset=utf-8' },
  })
  if (!stored) throw new Error('Failed to persist the bounded legacy compatibility bundle.')
  compaction.outputs.push(descriptor)
  compaction.cursor += selected.length
  if (compaction.cursor < source.length) return { state, done: false, bundleKey: null }
  if (compaction.outputs.length === 1) {
    return { state, done: true, bundleKey: compaction.outputs[0].key }
  }
  compaction.inputs = compaction.outputs
  compaction.outputs = []
  compaction.cursor = 0
  compaction.level += 1
  return { state, done: false, bundleKey: null }
}

async function readLegacyCompatibilityBundle(input: ImportJobInput) {
  if (!input.legacyBundleKey) throw new Error('Legacy compatibility bundle is missing.')
  const object = await getPersistedObject(input.legacyBundleKey, input.legacyBundleKey === input.rawBundleKey ? input.rawBundleEtag : undefined)
  if (object.size > MAX_LEGACY_COMPAT_BUNDLE_BYTES) {
    throw new Error('Legacy Astro content exceeds the 8 MB Worker-safe compatibility limit; export a snapshot bundle first.')
  }
  return contentBundleSchema.parse(JSON.parse(await object.text()))
}

async function decodeUploadedSnapshot(input: ImportJobInput, output: ImportJobOutput, leaseToken: string) {
  if (!input.rawBundleKey || !input.rawBundleEtag || !output.snapshot?.rawContentRange) {
    throw new Error('Uploaded snapshot range is missing.')
  }
  const raw = await importBucket().get(input.rawBundleKey, {
    range: output.snapshot.rawContentRange,
    onlyIf: { etagMatches: input.rawBundleEtag },
  })
  if (!raw) throw new Error('Persisted snapshot range is missing from R2.')
  if (raw.etag !== input.rawBundleEtag) throw new Error('Persisted import object changed after the job was created.')
  const decodedJson = decodeJsonStringStream(raw.body)
  const content = output.snapshot.encoding === 'base64'
    ? decodeBase64Stream(decodedJson.stream)
    : decodedJson.stream
  const key = `${input.packagePrefix}/snapshot/${leaseToken}.json`
  const stored = await storeStream(
    key,
    content,
    'application/json; charset=utf-8',
    output.snapshot.size || MAX_UPLOAD_BYTES,
  )
  if (output.snapshot.size && stored.size !== output.snapshot.size) {
    throw new Error('Content snapshot size does not match its bundle descriptor.')
  }
  if (output.snapshot.checksum && output.snapshot.checksum !== `sha256:${stored.checksum}`) {
    throw new Error('Content snapshot checksum does not match its bundle descriptor.')
  }
  return { key, etag: stored.etag, size: stored.size, checksum: `sha256:${stored.checksum}`, encoding: 'utf8' as const }
}

async function readSnapshotItem(snapshot: SnapshotObjectState, item: SnapshotItemRange) {
  const object = await importBucket().get(snapshot.key, {
    range: { offset: item.offset, length: item.length },
    onlyIf: { etagMatches: snapshot.etag },
  })
  if (!object) throw new Error('Persisted snapshot item is missing from R2.')
  if (object.etag !== snapshot.etag) throw new Error('Persisted content snapshot changed during staging.')
  if (item.length > 8 * 1024 * 1024) {
    throw new Error('Persisted snapshot item exceeds the Worker-safe limit.')
  }
  return JSON.parse(await object.text()) as unknown
}

async function stageSnapshotPage(
  id: string,
  input: ImportJobInput,
  output: ImportJobOutput,
  leaseToken: string,
) {
  if (!output.snapshot || !output.indexGeneration) throw new Error('Snapshot import index is missing.')
  const pageNumber = Math.floor(output.cursor / IMPORT_SNAPSHOT_ITEMS_PER_PAGE)
  const page = await readSmallJson<SnapshotItemRange[]>(snapshotIndexPageKey(input, output.indexGeneration, pageNumber))
  let local = output.cursor % IMPORT_SNAPSHOT_ITEMS_PER_PAGE
  let consumed = 0
  let jsonBytes = 0
  let contentBytes = 0
  const records: ImportStageRecord[] = []
  while (local < page.length) {
    const descriptor = page[local]
    const value = await readSnapshotItem(output.snapshot, descriptor)
    const next = contentSnapshotItemRecords(descriptor.group, value)
    const sizes = next.reduce((total, record) => {
      const measured = contentImportStagePayloadBytes(record)
      return { json: total.json + measured.jsonBytes, content: total.content + measured.contentBytes }
    }, { json: 0, content: 0 })
    if (next.length > MAX_STAGE_RECORDS || sizes.json > MAX_STAGE_JSON_BYTES || sizes.content > MAX_STAGE_CONTENT_BYTES) {
      throw new Error(`One ${descriptor.group} item exceeds the Worker-safe staging page limit.`)
    }
    if (records.length && (records.length + next.length > MAX_STAGE_RECORDS
      || jsonBytes + sizes.json > MAX_STAGE_JSON_BYTES
      || contentBytes + sizes.content > MAX_STAGE_CONTENT_BYTES)) break
    records.push(...next)
    jsonBytes += sizes.json
    contentBytes += sizes.content
    consumed += 1
    local += 1
  }
  if (!consumed || !records.length) throw new Error('Snapshot staging cursor did not advance.')
  const preflight = await preflightContentImportRecords(records)
  await stageImportRecords(id, output.stagedRecords ?? 0, preflight.records, leaseToken)
  const cursor = output.cursor + consumed
  return {
    cursor,
    total: output.total,
    done: cursor >= output.total,
    stagedRecords: (output.stagedRecords ?? 0) + preflight.records.length,
    plan: mergeContentImportPlans(output.plan ?? emptyContentImportPlan(), preflight.plan),
  }
}

async function cleanupFailedJob(
  id: string,
  input: ImportJobInput,
  maximumPages = TERMINAL_CLEANUP_PAGES_PER_INVOCATION,
) {
  await clearContentImportStaging(id)
  await deletePrefix(input.packagePrefix, importBucket(), maximumPages)
}

async function cleanupCompletedJob(
  id: string,
  input: ImportJobInput,
  maximumPages = TERMINAL_CLEANUP_PAGES_PER_INVOCATION,
) {
  await clearContentImportStaging(id, { preserveCommit: true })
  await deletePrefix(input.packagePrefix, importBucket(), maximumPages)
}

async function cleanupLeaseArtifacts(input: ImportJobInput, leaseToken: string) {
  const bucket = importBucket()
  await Promise.allSettled([
    deletePrefix(`${input.packagePrefix}/descriptors/${leaseToken}`, bucket),
    deletePrefix(`${input.packagePrefix}/snapshot-index/${leaseToken}`, bucket),
    bucket.delete([
      `${input.packagePrefix}/snapshot/${leaseToken}.json`,
      `${input.packagePrefix}/legacy/${leaseToken}.json`,
    ]),
  ])
}

function permanentFailure(error: unknown) {
  if (error && typeof error === 'object' && 'permanent' in error) return true
  const message = error instanceof Error ? error.message : String(error)
  return /baseline conflict|changed in Studio|atomic import cut-over was cancelled|invalid|missing from R2|not configured|Worker-safe|checksum|content length/i.test(message)
}

function commitOutcomeIsUncertain(error: unknown) {
  return Boolean(error && typeof error === 'object' && 'commitUncertain' in error)
}

function retryDelay(attempt: number) {
  return Math.min(30_000, 500 * (2 ** Math.max(0, attempt - 1)))
}

export function shouldFailContentImportJob(
  phase: ImportPhase,
  error: unknown,
  attempts: number,
  maxAttempts: number,
) {
  return phase !== 'complete' && phase !== 'cleanup'
    && !commitOutcomeIsUncertain(error)
    && (permanentFailure(error) || attempts >= maxAttempts)
}

function progressFor(output: ImportJobOutput) {
  if (output.phase === 'complete') return 100
  const fraction = output.total ? output.cursor / output.total : 0
  if (output.phase === 'acquire') return Math.round(fraction * 20)
  if (output.phase === 'scan') return 5
  if (output.phase === 'decode') return 12
  if (output.phase === 'legacy-materialize') return Math.min(19, 5 + Math.round(fraction * 14))
  if (output.phase === 'index' || output.phase === 'legacy-plan') return 20
  if (output.phase === 'stage' || output.phase === 'legacy-stage') return Math.min(94, 25 + Math.round(fraction * 69))
  if (output.phase === 'cleanup') return 99
  return 96
}

export async function advanceContentImportJob(id: string, ownerId: string) {
  const owned = await ownedJob(id, ownerId)
  if (!owned) return null
  const { job, input } = owned
  let output = owned.output
  if (job.status === 'completed') {
    await Promise.allSettled([cleanupCompletedJob(id, input)])
    return publicJob(job)
  }
  if (job.status === 'failed' || job.status === 'cancelled') {
    await Promise.allSettled([cleanupFailedJob(id, input)])
    return publicJob(job)
  }
  if (output.retryAt && Date.now() < new Date(output.retryAt).valueOf()) return publicJob(job)
  if (job.status === 'running' && Date.now() - job.updatedAt.valueOf() < RUNNING_LEASE_MS) return publicJob(job)

  const now = new Date()
  const leaseToken = crypto.randomUUID()
  const claimedOutput: ImportJobOutput = { ...output, leaseToken }
  const claimedOutputJson = JSON.stringify(claimedOutput)
  const previousOutput = job.outputJson === null
    ? isNull(platformJobs.outputJson)
    : eq(platformJobs.outputJson, job.outputJson)
  const [claimed] = await db.update(platformJobs).set({
    status: 'running',
    startedAt: job.startedAt ?? now,
    outputJson: claimedOutputJson,
    updatedAt: now,
  }).where(and(
    eq(platformJobs.id, id),
    eq(platformJobs.status, job.status),
    previousOutput,
  )).returning({ id: platformJobs.id })
  if (!claimed) {
    const refreshed = await ownedJob(id, ownerId)
    return refreshed ? publicJob(refreshed.job) : null
  }
  output = claimedOutput

  try {
    if (output.phase === 'acquire') {
      const page = await acquireGitHubPage(input, output)
      output = { ...output, cursor: page.cursor, total: page.total, snapshot: page.snapshot, retryAt: undefined }
      if (page.done) {
        output.descriptorGeneration = 'github'
        output.descriptorPageCount = Math.ceil(page.total / GITHUB_DESCRIPTOR_FILES_PER_PAGE)
        if (page.snapshot) output = { ...output, phase: 'index', cursor: 0, total: 0, sourceMode: 'snapshot' }
        else {
          output = {
            ...output,
            phase: 'legacy-materialize',
            cursor: 0,
            total: page.total,
            sourceMode: 'legacy-astro',
            legacyMaterialization: newLegacyGitHubMaterializationState(),
          }
        }
      }
    } else if (output.phase === 'scan') {
      if (!input.rawBundleKey || !input.rawBundleEtag) throw new Error('Uploaded bundle state is missing.')
      const raw = await getPersistedObject(input.rawBundleKey, input.rawBundleEtag)
      const generation = leaseToken
      const scanned = await scanUploadedContentBundle(raw.body, async (page, files) => {
        await putImmutableJson(descriptorPageKey(input, generation, page), files)
      })
      output = {
        ...output,
        header: scanned.header,
        descriptorGeneration: generation,
        descriptorPageCount: scanned.descriptorPageCount,
        sourceMode: scanned.snapshot ? 'snapshot' : 'legacy-astro',
        retryAt: undefined,
      }
      if (scanned.snapshot) {
        output.snapshot = {
          key: input.rawBundleKey,
          etag: input.rawBundleEtag,
          size: scanned.snapshot.size ?? 0,
          checksum: scanned.snapshot.checksum ?? null,
          rawContentRange: scanned.snapshot.contentRange,
          encoding: scanned.snapshot.encoding as 'utf8' | 'base64',
        }
        output = { ...output, phase: 'decode', cursor: 0, total: output.snapshot.size }
      } else {
        if ((input.rawBundleSize ?? Number.POSITIVE_INFINITY) > MAX_LEGACY_COMPAT_BUNDLE_BYTES) {
          throw new Error('Legacy Astro content exceeds the 8 MB Worker-safe compatibility limit; export a snapshot bundle first.')
        }
        input.legacyBundleKey = input.rawBundleKey
        output = { ...output, phase: 'legacy-plan', cursor: 0, total: 0 }
      }
    } else if (output.phase === 'decode') {
      output.snapshot = await decodeUploadedSnapshot(input, output, leaseToken)
      output = { ...output, phase: 'index', cursor: 0, total: output.snapshot.size, retryAt: undefined }
    } else if (output.phase === 'index') {
      if (!output.snapshot) throw new Error('Persisted content snapshot is missing.')
      const snapshot = await getPersistedObject(output.snapshot.key, output.snapshot.etag)
      const generation = leaseToken
      const indexed = await indexContentSnapshot(snapshot.body, async (page, items) => {
        await putImmutableJson(snapshotIndexPageKey(input, generation, page), items)
      })
      output = {
        ...output,
        phase: 'stage',
        cursor: 0,
        total: indexed.itemCount,
        plan: emptyContentImportPlan(),
        indexGeneration: generation,
        indexPageCount: indexed.pageCount,
        stagedRecords: 0,
        retryAt: undefined,
      }
      if (!indexed.itemCount) {
        output = input.dryRun ? { ...output, phase: 'cleanup' } : { ...output, phase: 'commit' }
      }
    } else if (output.phase === 'stage') {
      const page = await stageSnapshotPage(id, input, output, leaseToken)
      output = { ...output, ...page, retryAt: undefined }
      if (page.done) {
        if (!page.plan) throw new Error('Import preflight plan is missing.')
        if (input.dryRun) {
          output = {
            ...output,
            phase: 'cleanup',
            result: {
              created: page.plan.resources.create,
              updated: page.plan.resources.update,
              unchanged: 0,
              assets: page.plan.assets,
            },
          }
        } else {
          throwConflicts(page.plan)
          output = { ...output, phase: 'commit' }
        }
      }
    } else if (output.phase === 'legacy-materialize') {
      if (!output.header || !output.legacyMaterialization) {
        throw new Error('Legacy GitHub materialization state is missing.')
      }
      const materialized = await advanceLegacyGitHubBundleMaterialization({
        bucket: importBucket(),
        packagePrefix: input.packagePrefix,
        totalEntries: output.total,
        header: output.header,
        state: output.legacyMaterialization,
        artifactKey: `${input.packagePrefix}/legacy/${leaseToken}.json`,
      })
      output = {
        ...output,
        cursor: materialized.state.cursor,
        legacyMaterialization: materialized.state,
        retryAt: undefined,
      }
      if (materialized.done) {
        if (!materialized.bundleKey) throw new Error('Legacy compatibility bundle materialization did not return its object.')
        input.legacyBundleKey = materialized.bundleKey
        output = { ...output, phase: 'legacy-plan', cursor: 0, total: 0 }
        delete output.legacyMaterialization
      }
    } else if (output.phase === 'legacy-plan') {
      const bundle = await readLegacyCompatibilityBundle(input)
      const inspection = await planLegacyAstroImport(bundle)
      output = { ...output, plan: inspection.plan, cursor: 0, retryAt: undefined }
      if (input.dryRun) output = { ...output, phase: 'cleanup', total: legacyAstroImportCandidateCount(bundle) }
      else {
        throwConflicts(inspection.plan)
        input.baselines = inspection.baselines
        output = {
          ...output,
          phase: 'legacy-stage',
          total: legacyAstroImportCandidateCount(bundle),
        }
      }
    } else if (output.phase === 'legacy-stage') {
      if (!output.plan || !input.baselines) throw new Error('Legacy import preflight state is missing.')
      const bundle = await readLegacyCompatibilityBundle(input)
      const page = await stageLegacyAstroImportPage(bundle, id, ownerId, output.cursor, input.baselines, leaseToken)
      output = {
        ...output,
        cursor: page.cursor,
        total: page.total,
        phase: page.done ? 'commit' : 'legacy-stage',
        retryAt: undefined,
        result: {
          created: output.result.created + page.result.created,
          updated: output.result.updated + page.result.updated,
          unchanged: output.result.unchanged + page.result.unchanged,
          assets: output.result.assets + page.result.assets,
        },
      }
    } else if (output.phase === 'commit') {
      if (!output.plan) throw new Error('Import preflight plan is missing.')
      await commitContentImport(id)
      if (output.sourceMode === 'snapshot') {
        output = {
          ...output,
          result: {
            created: output.plan.resources.create,
            updated: output.plan.resources.update,
            unchanged: 0,
            assets: output.plan.assets,
          },
        }
      }
      output = { ...output, phase: 'cleanup', cursor: output.total, retryAt: undefined }
    } else if (output.phase === 'cleanup') {
      await clearContentImportStaging(id, { preserveCommit: true })
      const cleaned = await deletePrefix(
        input.packagePrefix,
        importBucket(),
        TERMINAL_CLEANUP_PAGES_PER_INVOCATION,
      )
      output = { ...output, phase: cleaned ? 'complete' : 'cleanup', retryAt: undefined }
    }

    const completed = output.phase === 'complete'
    const finishedAt = new Date()
    const persistedOutput = withoutLease(output)
    const [released] = await db.update(platformJobs).set({
      status: completed ? 'completed' : 'waiting',
      progress: progressFor(persistedOutput),
      attempts: 0,
      inputJson: JSON.stringify(input),
      outputJson: JSON.stringify(persistedOutput),
      error: null,
      completedAt: completed ? finishedAt : null,
      updatedAt: finishedAt,
    }).where(and(
      eq(platformJobs.id, id),
      eq(platformJobs.status, 'running'),
      eq(platformJobs.outputJson, claimedOutputJson),
    )).returning({ id: platformJobs.id })
    if (!released) await cleanupLeaseArtifacts(input, leaseToken)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown content import failure'
    const attempts = job.attempts + 1
    const failed = shouldFailContentImportJob(output.phase, error, attempts, job.maxAttempts)
    const failedOutput = withoutLease({
      ...output,
      retryAt: failed ? undefined : new Date(Date.now() + retryDelay(attempts)).toISOString(),
    })
    const [released] = await db.update(platformJobs).set({
      status: failed ? 'failed' : 'waiting',
      attempts,
      error: message,
      inputJson: JSON.stringify(input),
      outputJson: JSON.stringify(failedOutput),
      completedAt: failed ? new Date() : null,
      updatedAt: new Date(),
    }).where(and(
      eq(platformJobs.id, id),
      eq(platformJobs.status, 'running'),
      eq(platformJobs.outputJson, claimedOutputJson),
    )).returning({ id: platformJobs.id })
    if (!released) await cleanupLeaseArtifacts(input, leaseToken)
  }

  const refreshed = await ownedJob(id, ownerId)
  if (refreshed && (refreshed.job.status === 'failed' || refreshed.job.status === 'cancelled')) {
    await Promise.allSettled([cleanupFailedJob(
      id,
      refreshed.input,
      TERMINAL_CLEANUP_PAGES_AFTER_ADVANCE,
    )])
  }
  return refreshed ? publicJob(refreshed.job) : null
}
