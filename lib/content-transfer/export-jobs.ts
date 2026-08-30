import { getCloudflareContext } from '@opennextjs/cloudflare'
import { and, desc, eq, inArray } from 'drizzle-orm'

import { db } from '@/lib/db'
import { platformJobs } from '@/lib/db/schema'

import {
  CONTENT_EXPORT_RESOURCE_TYPES,
  deleteStoredContentExport,
  inspectContentExport,
  materializeStoredContentBundle,
  materializeStoredExportSegment,
  newStoredContentExportManifest,
  readStoredContentExportManifest,
  readStoredSegmentFiles,
  newContentResourceExportCursor,
  newContentSnapshotCursor,
  verifyContentSnapshotPart,
  writeArticleExportPage,
  writeAssetExportPage,
  writeContentSnapshotPart,
  writeResourceTypeExportPart,
  writeStoredContentExportManifest,
  type ContentExportBucket,
  type ContentExportInspection,
  type ContentResourceExportCursor,
  type ContentSnapshotCursor,
  type StoredContentExportManifest,
  type StoredRawPartsExportSegment,
} from './export-service'
import { CONTENT_SNAPSHOT_PATH } from './contract'
import {
  beginGitHubTreeExport,
  createGitHubExportCommit,
  patchGitHubExportTree,
  updateGitHubExportRef,
  writeGitHubExportIndex,
  type GitHubTreeExportSession,
} from './github-service'

const JOB_TYPE = 'content_export_v1'
const JOB_VERSION = 1
const RUNNING_LEASE_MS = 2 * 60 * 1_000
const MAX_CONSECUTIVE_ATTEMPTS = 8

export type ContentExportMode = 'download' | 'github'
type ContentExportPhase =
  | 'snapshot'
  | 'articles'
  | 'resources'
  | 'assets'
  | 'materialize'
  | 'verify'
  | 'bundle'
  | 'github-init'
  | 'github-files'
  | 'github-index'
  | 'github-commit'
  | 'github-ref'
  | 'complete'

interface ContentExportJobInput {
  version: 1
  ownerId: string
  mode: ContentExportMode
  prefix: string
  generatedAt: string
  repository: string | null
  branch: string | null
  baseBranch: string | null
  message: string | null
  inspection: ContentExportInspection
}

interface ContentExportResult {
  repository?: string
  branch?: string
  commit?: string
  url?: string
  writtenFiles?: number
  unchangedFiles?: number
  deletedFiles?: number
  embeddedFiles: number
  externalAssets: number
  bundleSize?: number
  bundleSha256?: string
}

interface ContentExportJobOutput {
  phase: ContentExportPhase
  cursor: number
  resourceTypeIndex: number
  segmentCursor: number
  manifestKey: string
  fingerprint: string | null
  snapshotCursor: ContentSnapshotCursor
  snapshotVerifyCursor: ContentSnapshotCursor
  snapshotVerifyPartIndex: number
  resourceCursor: ContentResourceExportCursor
  githubStateKey: string | null
  progress: number
  retryAt?: string
  leaseToken?: string
  result: ContentExportResult
}

interface PersistedGitHubExportState {
  session: GitHubTreeExportSession
  managedPaths: string[]
  changedFiles: number
  unchangedFiles: number
  deletedFiles: number
  commitSha: string | null
  commitUrl: string | null
  noChanges: boolean
}

function exportBucket() {
  return getCloudflareContext().env.CONTENT_IMPORT_BUCKET as unknown as ContentExportBucket
}

function parseJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

function defaultOutput(manifestKey: string): ContentExportJobOutput {
  return {
    phase: 'snapshot',
    cursor: 0,
    resourceTypeIndex: 0,
    segmentCursor: 0,
    manifestKey,
    fingerprint: null,
    snapshotCursor: newContentSnapshotCursor(),
    snapshotVerifyCursor: newContentSnapshotCursor(),
    snapshotVerifyPartIndex: 0,
    resourceCursor: newContentResourceExportCursor(),
    githubStateKey: null,
    progress: 0,
    result: { embeddedFiles: 0, externalAssets: 0 },
  }
}

function publicJob(job: typeof platformJobs.$inferSelect) {
  const input = parseJson<ContentExportJobInput | null>(job.inputJson, null)
  const output = parseJson<ContentExportJobOutput | null>(job.outputJson, null)
  if (!input || !output) throw new Error('Persisted content export job is invalid.')
  return {
    jobId: job.id,
    type: 'content-export' as const,
    mode: input.mode,
    status: job.status,
    progress: job.progress,
    phase: output.phase,
    inspection: input.inspection,
    result: output.result,
    retryAt: output.retryAt,
    error: job.error,
    done: job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled',
    downloadUrl: job.status === 'completed' && input.mode === 'download'
      ? `/api/content-transfer/export?jobId=${encodeURIComponent(job.id)}`
      : undefined,
  }
}

async function ownedJob(id: string, ownerId: string) {
  const [job] = await db.select().from(platformJobs).where(eq(platformJobs.id, id)).limit(1)
  if (!job || job.type !== JOB_TYPE) return null
  const input = parseJson<ContentExportJobInput | null>(job.inputJson, null)
  const output = parseJson<ContentExportJobOutput | null>(job.outputJson, null)
  if (!input || !output || input.ownerId !== ownerId || input.version !== JOB_VERSION) return null
  output.snapshotCursor ??= newContentSnapshotCursor()
  output.snapshotVerifyCursor ??= newContentSnapshotCursor()
  output.snapshotVerifyPartIndex ??= 0
  output.resourceCursor ??= newContentResourceExportCursor()
  return { job, input, output }
}

function nextManifestKey(input: ContentExportJobInput, leaseToken: string) {
  return `${input.prefix}/manifests/${leaseToken}.json`
}

function nextGitHubStateKey(input: ContentExportJobInput, leaseToken: string) {
  return `${input.prefix}/github/${leaseToken}.json`
}

async function readGitHubState(key: string) {
  const object = await exportBucket().get(key)
  if (!object) throw new Error('Persisted GitHub export state is missing from R2.')
  return JSON.parse(await object.text()) as PersistedGitHubExportState
}

async function writeGitHubState(key: string, state: PersistedGitHubExportState) {
  await exportBucket().put(key, JSON.stringify(state), {
    httpMetadata: { contentType: 'application/json; charset=utf-8' },
  })
}

function generationProgress(phase: ContentExportPhase, cursor: number, input: ContentExportJobInput) {
  if (phase === 'snapshot') {
    const fraction = input.inspection.resources ? cursor / input.inspection.resources : 1
    return Math.min(8, 1 + Math.round(fraction * 7))
  }
  if (phase === 'articles') {
    const fraction = input.inspection.articles ? cursor / input.inspection.articles : 1
    return Math.min(50, 8 + Math.round(fraction * 42))
  }
  if (phase === 'resources') return Math.min(66, 50 + Math.round((cursor / CONTENT_EXPORT_RESOURCE_TYPES.length) * 16))
  if (phase === 'assets') {
    const fraction = input.inspection.externalAssets ? cursor / input.inspection.externalAssets : 1
    return Math.min(78, 66 + Math.round(fraction * 12))
  }
  if (phase === 'materialize') return 79
  if (phase === 'verify') return 82
  if (phase === 'bundle') return 84
  return 84
}

function githubProgress(phase: ContentExportPhase, segmentCursor: number, segmentTotal: number) {
  if (phase === 'github-init') return 86
  if (phase === 'github-files') return Math.min(96, 87 + Math.round((segmentTotal ? segmentCursor / segmentTotal : 1) * 9))
  if (phase === 'github-index') return 97
  if (phase === 'github-commit') return 98
  if (phase === 'github-ref') return 99
  if (phase === 'complete') return 100
  return 80
}

function retryDelay(attempt: number) {
  return Math.min(60_000, 1_000 * (2 ** Math.max(0, attempt - 1)))
}

function errorRetryAt(error: unknown, attempt: number) {
  if (error && typeof error === 'object' && 'retryAt' in error && typeof error.retryAt === 'string') {
    return error.retryAt
  }
  return new Date(Date.now() + retryDelay(attempt)).toISOString()
}

function permanentFailure(error: unknown) {
  if (error && typeof error === 'object' && 'permanent' in error && error.permanent === true) return true
  const message = error instanceof Error ? error.message : String(error)
  return /invalid|missing from R2|exceeds the|changed while the export job|not configured/i.test(message)
}

export async function createContentExportJob(input: {
  ownerId: string
  mode: ContentExportMode
  repository?: string | null
  branch?: string | null
  baseBranch?: string | null
  message?: string | null
}) {
  if (input.mode === 'github' && (!input.repository || !input.branch)) {
    throw new Error('GitHub content repository and branch are required.')
  }
  const id = crypto.randomUUID()
  const prefix = `content-exports/${id}`
  const generatedAt = new Date().toISOString()
  const manifestKey = `${prefix}/manifests/initial.json`
  const inspection = await inspectContentExport()
  const manifest = newStoredContentExportManifest({
    generatedAt,
    repository: input.repository,
    ref: input.branch,
  })
  await writeStoredContentExportManifest(exportBucket(), manifestKey, manifest)
  const jobInput: ContentExportJobInput = {
    version: JOB_VERSION,
    ownerId: input.ownerId,
    mode: input.mode,
    prefix,
    generatedAt,
    repository: input.repository ?? null,
    branch: input.branch ?? null,
    baseBranch: input.baseBranch ?? null,
    message: input.message ?? null,
    inspection,
  }
  const output = defaultOutput(manifestKey)
  const now = new Date()
  try {
    await db.insert(platformJobs).values({
      id,
      type: JOB_TYPE,
      status: 'pending',
      progress: 0,
      attempts: 0,
      maxAttempts: MAX_CONSECUTIVE_ATTEMPTS,
      inputJson: JSON.stringify(jobInput),
      outputJson: JSON.stringify(output),
      createdAt: now,
      updatedAt: now,
    })
  } catch (error) {
    await Promise.allSettled([exportBucket().delete(manifestKey)])
    throw error
  }
  const [job] = await db.select().from(platformJobs).where(eq(platformJobs.id, id)).limit(1)
  return publicJob(job)
}

export async function inspectContentExportForGitHub() {
  return inspectContentExport()
}

export async function getContentExportJob(id: string, ownerId: string) {
  const owned = await ownedJob(id, ownerId)
  return owned ? publicJob(owned.job) : null
}

export async function listContentExportJobs(ownerId: string) {
  const rows = await db.select().from(platformJobs)
    .where(and(
      eq(platformJobs.type, JOB_TYPE),
      inArray(platformJobs.status, ['pending', 'running', 'waiting']),
    ))
    .orderBy(desc(platformJobs.updatedAt))
    .limit(20)
  return rows.flatMap((job) => {
    const input = parseJson<ContentExportJobInput | null>(job.inputJson, null)
    return input?.ownerId === ownerId ? [publicJob(job)] : []
  })
}

async function updateManifestForLease(
  input: ContentExportJobInput,
  output: ContentExportJobOutput,
  leaseToken: string,
  mutate: (manifest: StoredContentExportManifest, draft: ContentExportJobOutput) => Promise<void>,
) {
  const manifest = await readStoredContentExportManifest(exportBucket(), output.manifestKey)
  const draft = structuredClone(output)
  await mutate(manifest, draft)
  const manifestKey = nextManifestKey(input, leaseToken)
  await writeStoredContentExportManifest(exportBucket(), manifestKey, manifest)
  draft.manifestKey = manifestKey
  draft.result.embeddedFiles = manifest.embeddedFiles
  draft.result.externalAssets = manifest.externalAssets
  Object.assign(output, draft)
  return manifest
}

async function runGenerationStep(
  input: ContentExportJobInput,
  output: ContentExportJobOutput,
  leaseToken: string,
) {
  if (output.phase === 'snapshot') {
    let done = false
    await updateManifestForLease(input, output, leaseToken, async (manifest, draft) => {
      const result = await writeContentSnapshotPart({
        bucket: exportBucket(),
        prefix: `${input.prefix}/objects/${leaseToken}`,
        manifest,
        cursor: draft.snapshotCursor,
      })
      draft.snapshotCursor = result.cursor
      draft.cursor = result.cursor.resources.pageOffset + result.cursor.resources.resourceIndex
      done = result.done
      if (result.fingerprint) draft.fingerprint = result.fingerprint
    })
    if (done) {
      output.phase = 'articles'
      output.cursor = 0
    }
  } else if (output.phase === 'articles') {
    let done = false
    await updateManifestForLease(input, output, leaseToken, async (manifest, draft) => {
      const page = await writeArticleExportPage({
        bucket: exportBucket(),
        prefix: `${input.prefix}/objects/${leaseToken}`,
        manifest,
        cursor: draft.cursor,
      })
      draft.cursor = page.cursor
      done = page.done
    })
    if (done) {
      output.phase = 'resources'
      output.cursor = 0
      output.resourceTypeIndex = 0
    }
  } else if (output.phase === 'resources') {
    const type = CONTENT_EXPORT_RESOURCE_TYPES[output.resourceTypeIndex]
    if (!type) {
      output.phase = 'assets'
      output.cursor = 0
    } else {
      let done = false
      await updateManifestForLease(input, output, leaseToken, async (manifest, draft) => {
        const result = await writeResourceTypeExportPart({
          bucket: exportBucket(),
          prefix: `${input.prefix}/objects/${leaseToken}`,
          manifest,
          type,
          cursor: draft.resourceCursor,
        })
        draft.resourceCursor = result.cursor
        done = result.done
      })
      if (done) {
        output.resourceTypeIndex += 1
        output.resourceCursor = newContentResourceExportCursor()
        output.cursor = output.resourceTypeIndex
        if (output.resourceTypeIndex >= CONTENT_EXPORT_RESOURCE_TYPES.length) {
          output.phase = 'assets'
          output.cursor = 0
        }
      }
    }
  } else if (output.phase === 'assets') {
    let done = false
    await updateManifestForLease(input, output, leaseToken, async (manifest, draft) => {
      const page = await writeAssetExportPage({
        bucket: exportBucket(),
        prefix: `${input.prefix}/objects/${leaseToken}`,
        manifest,
        cursor: draft.cursor,
      })
      draft.cursor = page.cursor
      done = page.done
    })
    if (done) {
      output.phase = 'materialize'
      output.cursor = 0
      output.segmentCursor = 0
    }
  } else if (output.phase === 'materialize') {
    let done = false
    await updateManifestForLease(input, output, leaseToken, async (manifest, draft) => {
      const result = await materializeStoredExportSegment({
        bucket: exportBucket(),
        prefix: `${input.prefix}/objects/${leaseToken}`,
        manifest,
        segmentCursor: draft.segmentCursor,
      })
      draft.segmentCursor = result.segmentCursor
      draft.cursor = result.segmentCursor
      const snapshot = manifest.segments.find((segment): segment is StoredRawPartsExportSegment =>
        segment.storage === 'raw-parts' && segment.file.path === CONTENT_SNAPSHOT_PATH)
      if (snapshot?.materialized) draft.fingerprint = snapshot.materialized.sha256
      done = result.done
    })
    if (done) {
      if (!output.fingerprint) throw new Error('Content export fingerprint is missing.')
      output.phase = 'verify'
      output.cursor = 0
      output.segmentCursor = 0
    }
  } else if (output.phase === 'verify') {
    if (!output.fingerprint) throw new Error('Content export fingerprint is missing.')
    const manifest = await readStoredContentExportManifest(exportBucket(), output.manifestKey)
    const verified = await verifyContentSnapshotPart({
      bucket: exportBucket(),
      manifest,
      cursor: output.snapshotVerifyCursor,
      partIndex: output.snapshotVerifyPartIndex,
    })
    output.snapshotVerifyCursor = verified.cursor
    output.snapshotVerifyPartIndex = verified.partIndex
    output.cursor = verified.partIndex
    if (verified.done) {
      if (verified.fingerprint !== output.fingerprint) {
        throw new Error('Persisted content snapshot fingerprint changed during verification.')
      }
      output.phase = 'bundle'
      output.cursor = 0
    }
  } else if (output.phase === 'bundle') {
    let done = false
    await updateManifestForLease(input, output, leaseToken, async (manifest, draft) => {
      const result = await materializeStoredContentBundle({
        bucket: exportBucket(),
        prefix: `${input.prefix}/objects/${leaseToken}`,
        manifest,
      })
      done = result.done
      if (result.bundle) {
        draft.result.bundleSize = result.bundle.size
        draft.result.bundleSha256 = result.bundle.sha256
      }
    })
    if (done) {
      output.phase = input.mode === 'github' ? 'github-init' : 'complete'
      output.cursor = 0
      output.segmentCursor = 0
    }
  }
  output.progress = output.phase === 'complete'
    ? 100
    : generationProgress(output.phase, output.cursor, input)
}

async function runGitHubStep(
  input: ContentExportJobInput,
  output: ContentExportJobOutput,
  leaseToken: string,
) {
  const token = process.env.GITHUB_TOKEN
  if (!token) throw new Error('GitHub token is not configured.')
  if (!input.repository || !input.branch) throw new Error('GitHub export target is not configured.')
  const manifest = await readStoredContentExportManifest(exportBucket(), output.manifestKey)

  if (output.phase === 'github-init') {
    const session = await beginGitHubTreeExport({
      repository: input.repository,
      branch: input.branch,
      baseBranch: input.baseBranch ?? undefined,
      token,
    })
    const state: PersistedGitHubExportState = {
      session,
      managedPaths: [],
      changedFiles: 0,
      unchangedFiles: 0,
      deletedFiles: 0,
      commitSha: null,
      commitUrl: null,
      noChanges: false,
    }
    const stateKey = nextGitHubStateKey(input, leaseToken)
    await writeGitHubState(stateKey, state)
    output.githubStateKey = stateKey
    output.phase = 'github-files'
    output.segmentCursor = 0
  } else {
    if (!output.githubStateKey) throw new Error('Persisted GitHub export state is missing from R2.')
    const state = await readGitHubState(output.githubStateKey)
    if (output.phase === 'github-files') {
      const segment = manifest.segments[output.segmentCursor]
      if (!segment) {
        output.phase = 'github-index'
      } else {
        const files = segment.storage === 'page' && !segment.embedded
          ? []
          : await readStoredSegmentFiles(exportBucket(), segment)
        const result = await patchGitHubExportTree({
          repository: state.session.repository,
          token,
          baseTree: state.session.currentTreeSha,
          knownShas: state.session.knownShas,
          files,
        })
        state.session.currentTreeSha = result.treeSha
        state.session.knownShas = result.knownShas
        state.managedPaths.push(...result.managedPaths)
        state.changedFiles += result.changedFiles
        state.unchangedFiles += result.unchangedFiles
        output.segmentCursor += 1
        if (output.segmentCursor >= manifest.segments.length) output.phase = 'github-index'
        const stateKey = nextGitHubStateKey(input, leaseToken)
        await writeGitHubState(stateKey, state)
        output.githubStateKey = stateKey
      }
    } else if (output.phase === 'github-index') {
      const indexed = await writeGitHubExportIndex({
        repository: state.session.repository,
        token,
        baseTree: state.session.currentTreeSha,
        previousManagedPaths: state.session.previousManagedPaths,
        managedPaths: state.managedPaths,
        knownShas: state.session.knownShas,
      })
      state.session.currentTreeSha = indexed.treeSha
      state.deletedFiles = indexed.deletedPaths.length
      state.noChanges = indexed.treeSha === state.session.baseTreeSha
      output.phase = state.noChanges ? 'complete' : 'github-commit'
      const stateKey = nextGitHubStateKey(input, leaseToken)
      await writeGitHubState(stateKey, state)
      output.githubStateKey = stateKey
    } else if (output.phase === 'github-commit') {
      const commit = await createGitHubExportCommit({
        repository: state.session.repository,
        token,
        headSha: state.session.headSha,
        treeSha: state.session.currentTreeSha,
        message: input.message || `chore(content): export Joruno content ${input.generatedAt}`,
      })
      state.commitSha = commit.sha
      state.commitUrl = commit.html_url
      output.phase = 'github-ref'
      const stateKey = nextGitHubStateKey(input, leaseToken)
      await writeGitHubState(stateKey, state)
      output.githubStateKey = stateKey
    } else if (output.phase === 'github-ref') {
      if (!state.commitSha) throw new Error('Persisted GitHub export commit is missing.')
      await updateGitHubExportRef({
        repository: state.session.repository,
        branch: state.session.branch,
        token,
        commitSha: state.commitSha,
      })
      output.phase = 'complete'
    }

    if (output.phase === 'complete') {
      const finalState = state
      output.result = {
        repository: finalState.session.repository,
        branch: finalState.session.branch,
        commit: finalState.commitSha ?? finalState.session.headSha,
        url: finalState.commitUrl ?? `https://github.com/${finalState.session.repository}/commit/${finalState.session.headSha}`,
        writtenFiles: finalState.changedFiles + (finalState.noChanges ? 0 : 1),
        unchangedFiles: finalState.unchangedFiles,
        deletedFiles: finalState.deletedFiles,
        embeddedFiles: manifest.embeddedFiles,
        externalAssets: manifest.externalAssets,
        bundleSize: manifest.bundle?.size,
        bundleSha256: manifest.bundle?.sha256,
      }
    }
  }
  output.progress = githubProgress(output.phase, output.segmentCursor, manifest.segments.length)
}

export async function advanceContentExportJob(id: string, ownerId: string) {
  const owned = await ownedJob(id, ownerId)
  if (!owned) return null
  const { job, input } = owned
  let output = owned.output
  if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') return publicJob(job)
  if (output.retryAt && Date.now() < new Date(output.retryAt).valueOf()) return publicJob(job)
  if (job.status === 'running' && Date.now() - job.updatedAt.valueOf() < RUNNING_LEASE_MS) return publicJob(job)

  const leaseToken = crypto.randomUUID()
  const claimedOutput: ContentExportJobOutput = { ...output, leaseToken, retryAt: undefined }
  const previousOutputJson = job.outputJson ?? ''
  const claimedOutputJson = JSON.stringify(claimedOutput)
  const now = new Date()
  const [claimed] = await db.update(platformJobs).set({
    status: 'running',
    startedAt: job.startedAt ?? now,
    outputJson: claimedOutputJson,
    updatedAt: now,
  }).where(and(
    eq(platformJobs.id, id),
    eq(platformJobs.outputJson, previousOutputJson),
  )).returning({ id: platformJobs.id })
  if (!claimed) {
    const refreshed = await ownedJob(id, ownerId)
    return refreshed ? publicJob(refreshed.job) : null
  }
  output = claimedOutput

  try {
    if (['snapshot', 'articles', 'resources', 'assets', 'materialize', 'verify', 'bundle'].includes(output.phase)) {
      await runGenerationStep(input, output, leaseToken)
    } else if (output.phase !== 'complete') {
      await runGitHubStep(input, output, leaseToken)
    }
    const completed = output.phase === 'complete'
    delete output.leaseToken
    const finishedAt = new Date()
    const savedOutputJson = JSON.stringify(output)
    const [saved] = await db.update(platformJobs).set({
      status: completed ? 'completed' : 'waiting',
      progress: output.progress,
      attempts: 0,
      outputJson: savedOutputJson,
      error: null,
      completedAt: completed ? finishedAt : null,
      updatedAt: finishedAt,
    }).where(and(
      eq(platformJobs.id, id),
      eq(platformJobs.outputJson, claimedOutputJson),
    )).returning({ id: platformJobs.id })
    if (!saved) {
      const refreshed = await ownedJob(id, ownerId)
      return refreshed ? publicJob(refreshed.job) : null
    }
    if (completed && input.mode === 'github') {
      // Keep the compact job result in D1; generated bundle objects are no
      // longer required after the Git ref has advanced.
      const manifest = await readStoredContentExportManifest(exportBucket(), output.manifestKey)
      await Promise.allSettled([deleteStoredContentExport(exportBucket(), manifest)])
    }
  } catch (error) {
    const attempts = job.attempts + 1
    const failed = permanentFailure(error) || attempts >= job.maxAttempts
    output.retryAt = failed ? undefined : errorRetryAt(error, attempts)
    delete output.leaseToken
    await db.update(platformJobs).set({
      status: failed ? 'failed' : 'waiting',
      attempts,
      error: error instanceof Error ? error.message : 'Unknown content export failure',
      outputJson: JSON.stringify(output),
      completedAt: failed ? new Date() : null,
      updatedAt: new Date(),
    }).where(and(
      eq(platformJobs.id, id),
      eq(platformJobs.outputJson, claimedOutputJson),
    ))
  }

  const refreshed = await ownedJob(id, ownerId)
  return refreshed ? publicJob(refreshed.job) : null
}

export async function getCompletedContentExport(id: string, ownerId: string) {
  const owned = await ownedJob(id, ownerId)
  if (!owned || owned.input.mode !== 'download' || owned.job.status !== 'completed') return null
  const manifest = await readStoredContentExportManifest(exportBucket(), owned.output.manifestKey)
  return { input: owned.input, manifest, bucket: exportBucket() }
}
