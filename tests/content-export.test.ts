import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { contentBundleSchema } from '@/lib/content-transfer/contract'
import {
  buildContentSnapshotPart,
  CONTENT_EXPORT_MAX_D1_QUERIES_PER_ADVANCE,
  CONTENT_EXPORT_MAX_R2_OPERATIONS_PER_ADVANCE,
  CONTENT_EXPORT_SNAPSHOT_D1_QUERIES_PER_ADVANCE,
  materializeStoredContentBundle,
  materializeStoredExportSegment,
  newContentSnapshotCursor,
  newStoredContentExportManifest,
  readStoredSegmentFiles,
  storedContentBundleChunks,
  verifyContentSnapshotPart,
  writeContentSnapshotPart,
  type ContentSnapshotDataSource,
  type ContentExportBucket,
  type ContentExportBucketObject,
  type StoredContentExportManifest,
} from '@/lib/content-transfer/export-service'
import {
  discoverGitHubContent,
  gitBlobSha,
  patchGitHubExportTree,
  writeContentBundleToGitHub,
} from '@/lib/content-transfer/github-service'

class MemoryBucket implements ContentExportBucket {
  readonly values = new Map<string, Uint8Array>()
  multipartUploads = 0
  gets = 0
  puts = 0
  multipartCreates = 0
  multipartParts = 0
  multipartCompletes = 0
  deletes = 0

  get operations() {
    return this.gets + this.puts + this.multipartCreates + this.multipartParts
      + this.multipartCompletes + this.deletes
  }

  async get(key: string): Promise<ContentExportBucketObject | null> {
    this.gets += 1
    const value = this.values.get(key)
    if (!value) return null
    return {
      body: new ReadableStream<Uint8Array>({
        start(controller) {
          // Deliberately split a multi-byte payload into small chunks so the
          // streamed JSON string escaping path exercises TextDecoder state.
          const chunkSize = value.length > 1024 ? 64 * 1024 : 3
          for (let index = 0; index < value.length; index += chunkSize) {
            controller.enqueue(value.slice(index, index + chunkSize))
          }
          controller.close()
        },
      }),
      size: value.byteLength,
      async text() { return new TextDecoder().decode(value) },
    }
  }

  async put(key: string, value: string | Uint8Array | ReadableStream<Uint8Array>) {
    this.puts += 1
    if (typeof value === 'string') {
      this.values.set(key, new TextEncoder().encode(value))
      return
    }
    if (value instanceof Uint8Array) {
      this.values.set(key, value.slice())
      return
    }
    const reader = value.getReader()
    const chunks: Uint8Array[] = []
    let length = 0
    while (true) {
      const chunk = await reader.read()
      if (chunk.done) break
      chunks.push(chunk.value)
      length += chunk.value.byteLength
    }
    const result = new Uint8Array(length)
    let offset = 0
    for (const chunk of chunks) {
      result.set(chunk, offset)
      offset += chunk.byteLength
    }
    this.values.set(key, result)
  }

  async createMultipartUpload(key: string) {
    this.multipartUploads += 1
    this.multipartCreates += 1
    const parts = new Map<number, Uint8Array>()
    const readBytes = async (value: Uint8Array | ReadableStream<Uint8Array>) => {
      if (value instanceof Uint8Array) return value.slice()
      const reader = value.getReader()
      const chunks: Uint8Array[] = []
      let length = 0
      while (true) {
        const chunk = await reader.read()
        if (chunk.done) break
        chunks.push(chunk.value)
        length += chunk.value.byteLength
      }
      const bytes = new Uint8Array(length)
      let offset = 0
      for (const chunk of chunks) {
        bytes.set(chunk, offset)
        offset += chunk.byteLength
      }
      return bytes
    }
    return {
      uploadPart: async (partNumber: number, value: Uint8Array | ReadableStream<Uint8Array>) => {
        this.multipartParts += 1
        parts.set(partNumber, await readBytes(value))
        return { partNumber, etag: `part-${partNumber}` }
      },
      complete: async (uploaded: Array<{ partNumber: number }>) => {
        this.multipartCompletes += 1
        const ordered = uploaded.map((part) => parts.get(part.partNumber)!)
        const length = ordered.reduce((total, part) => total + part.byteLength, 0)
        const result = new Uint8Array(length)
        let offset = 0
        for (const part of ordered) {
          result.set(part, offset)
          offset += part.byteLength
        }
        this.values.set(key, result)
      },
      abort: async () => { parts.clear() },
    }
  }

  async delete(key: string | string[]) {
    this.deletes += 1
    for (const item of Array.isArray(key) ? key : [key]) this.values.delete(item)
  }
}

test('streams a persisted content bundle without buffering or corrupting JSON strings', async () => {
  const bucket = new MemoryBucket()
  const snapshot = '{"resources":[],"note":"引号 \\"、换行\\n和 emoji 🚀"}\n'
  await bucket.put('job/snapshot.json', snapshot)
  await bucket.put('job/page.json', JSON.stringify([{
    path: 'src/content/blog/hello.md',
    kind: 'content',
    encoding: 'utf8',
    mediaType: 'text/markdown',
    content: '# Hello\n',
  }, {
    path: 'public/img/cover.webp',
    kind: 'asset',
    encoding: 'external',
    mediaType: 'image/webp',
    url: 'https://assets.example/cover.webp',
  }]))
  const manifest: StoredContentExportManifest = {
    version: 1,
    generatedAt: '2026-08-30T00:00:00.000Z',
    source: { repository: null, ref: null, commit: null },
    segments: [{
      storage: 'raw',
      key: 'job/snapshot.json',
      file: {
        path: '.joruno/content.json', kind: 'data', encoding: 'utf8', mediaType: 'application/json',
      },
    }, { storage: 'page', key: 'job/page.json', count: 2, embedded: true }],
    files: 3,
    embeddedFiles: 2,
    externalAssets: 1,
  }
  let serialized = ''
  for await (const chunk of storedContentBundleChunks(bucket, manifest)) serialized += chunk
  const bundle = contentBundleSchema.parse(JSON.parse(serialized))
  assert.equal(bundle.files.length, 3)
  assert.equal(bundle.files[0].content, snapshot)
  assert.equal(bundle.files[1].content, '# Hello\n')
  assert.equal(bundle.files[2].encoding, 'external')
})

test('resumes cleanly when a tiny snapshot part ends on a full resource-page boundary', async () => {
  const resourceRows = Array.from({ length: 10 }, (_, index) => ({
    id: `resource-${index}`,
    currentRevisionId: `revision-${index}`,
    publishedRevisionId: null,
    value: {
      id: `resource-${index}`, type: 'document', title: `Document ${index}`, slug: `document-${index}`,
      path: `/docs/document-${index}`, description: null, status: 'draft', visibility: 'private',
      coverAssetId: null, currentRevisionId: `revision-${index}`, publishedRevisionId: null,
      publishedAt: null, scheduledAt: null, createdAt: '2026-08-30T00:00:00.000Z',
      updatedAt: '2026-08-30T00:00:00.000Z',
    },
  }))
  const revisions = resourceRows.map((row, index) => ({
    id: row.currentRevisionId,
    resourceId: row.id,
    value: {
      id: row.currentRevisionId, version: 1, title: `Document ${index}`, slug: `document-${index}`,
      path: `/docs/document-${index}`, description: null, visibility: 'private', content: 'x',
      contentFormat: 'markdown', metadata: {}, sourceHash: null, changeSummary: null,
      createdAt: '2026-08-30T00:00:00.000Z',
    },
  }))
  const source: ContentSnapshotDataSource = {
    async countResources() { return resourceRows.length },
    async readResources(_type, offset, limit) { return resourceRows.slice(offset, offset + limit) },
    async readRevisions(resourceIds, offset, limit) {
      const ids = new Set(resourceIds)
      return revisions.filter((revision) => ids.has(revision.resourceId)).slice(offset, offset + limit)
    },
    async readProperty() { return [] },
  }
  let cursor = newContentSnapshotCursor()
  let snapshot = ''
  let advances = 0
  while (cursor.section !== 'done') {
    const part = await buildContentSnapshotPart({ cursor, source, targetBytes: 1 })
    assert.ok(part.queries <= CONTENT_EXPORT_SNAPSHOT_D1_QUERIES_PER_ADVANCE)
    snapshot += part.content
    cursor = part.cursor
    advances += 1
    assert.ok(advances < 100, 'snapshot cursor must keep making progress')
  }
  assert.equal(JSON.parse(snapshot).resources.length, resourceRows.length)
})

test('persists and verifies a 400+ resource snapshot across bounded advances beyond 16 MiB', async () => {
  assert.equal(
    CONTENT_EXPORT_MAX_D1_QUERIES_PER_ADVANCE,
    CONTENT_EXPORT_SNAPSHOT_D1_QUERIES_PER_ADVANCE + 4,
  )
  assert.ok(CONTENT_EXPORT_MAX_D1_QUERIES_PER_ADVANCE < 50)
  const count = 420
  const largeBody = 'x'.repeat(45_000)
  const resourceRows = Array.from({ length: count }, (_, index) => {
    const suffix = String(index).padStart(4, '0')
    const id = `resource-${suffix}`
    const revisionId = `revision-${suffix}`
    return {
      id,
      currentRevisionId: revisionId,
      publishedRevisionId: revisionId,
      value: {
        id, type: 'document', title: `Document ${index}`, slug: `document-${index}`,
        path: `/docs/document-${index}`, description: null, status: 'published', visibility: 'public',
        coverAssetId: null, currentRevisionId: revisionId, publishedRevisionId: revisionId,
        authorId: 'user-1',
        publishedAt: '2026-08-30T00:00:00.000Z', scheduledAt: null,
        createdAt: '2026-08-30T00:00:00.000Z', updatedAt: '2026-08-30T00:00:00.000Z',
      },
    }
  })
  const revisions = resourceRows.map((resource, index) => ({
    id: resource.currentRevisionId,
    resourceId: resource.id,
    value: {
      id: resource.currentRevisionId, version: 1, title: `Document ${index}`, slug: `document-${index}`,
      path: `/docs/document-${index}`, description: null, visibility: 'public', content: largeBody,
      contentFormat: 'markdown', metadata: { index }, sourceHash: null, changeSummary: null,
      createdBy: 'user-1',
      createdAt: '2026-08-30T00:00:00.000Z',
    },
  }))
  let sourceQueries = 0
  const source: ContentSnapshotDataSource = {
    async countResources(type) {
      sourceQueries += 1
      return type && type !== 'document' ? 0 : resourceRows.length
    },
    async readResources(type, offset, limit) {
      sourceQueries += 1
      return (type && type !== 'document' ? [] : resourceRows).slice(offset, offset + limit)
    },
    async readRevisions(resourceIds, offset, limit) {
      sourceQueries += 1
      const requested = new Set(resourceIds)
      return revisions.filter((revision) => requested.has(revision.resourceId)).slice(offset, offset + limit)
    },
    async readProperty(name, offset) {
      sourceQueries += 1
      if (offset) return []
      if (name === 'redirects') return [{
        fromPath: '/old-path', toPath: '/new-path', statusCode: 301,
        createdAt: '2025-01-02T03:04:05.000Z',
      }]
      if (name === 'publicationEvents') return [{
        id: 'event-1', resourceId: resourceRows[0].id, revisionId: revisions[0].id,
        eventType: 'published', actorId: 'user-1', data: {}, createdAt: '2026-08-30T00:00:00.000Z',
      }]
      return []
    },
  }
  const bucket = new MemoryBucket()
  const manifest = newStoredContentExportManifest({ generatedAt: '2026-08-30T00:00:00.000Z' })
  let cursor = newContentSnapshotCursor()

  // Simulate an R2 write whose manifest/job CAS loses its lease. The retry
  // starts from the durable manifest and must not append the orphaned page.
  const orphanManifest = structuredClone(manifest)
  const orphanResult = await writeContentSnapshotPart({
    bucket, prefix: 'job/orphan-lease', manifest: orphanManifest, cursor, source,
    targetBytes: 256 * 1024,
  })
  assert.equal(manifest.segments.length, 0)

  let advances = 0
  let maxGenerationD1Queries = 0
  while (cursor.section !== 'done') {
    const r2Before = bucket.operations
    const page = await writeContentSnapshotPart({
      bucket, prefix: `job/lease-${advances}`, manifest, cursor, source,
      targetBytes: 256 * 1024,
    })
    assert.equal(bucket.operations - r2Before, 1)
    assert.ok(page.queries <= CONTENT_EXPORT_SNAPSHOT_D1_QUERIES_PER_ADVANCE)
    assert.ok(page.queries + 4 <= CONTENT_EXPORT_MAX_D1_QUERIES_PER_ADVANCE)
    maxGenerationD1Queries = Math.max(maxGenerationD1Queries, page.queries + 4)
    cursor = page.cursor
    advances += 1
  }
  assert.ok(advances > 50)
  assert.ok(sourceQueries > CONTENT_EXPORT_SNAPSHOT_D1_QUERIES_PER_ADVANCE)
  const snapshotSegment = manifest.segments.find((segment) => segment.storage === 'raw-parts')
  assert.ok(snapshotSegment && snapshotSegment.parts.length === advances)
  const snapshotParts = snapshotSegment.parts
  assert.equal(snapshotParts[0].sha256,
    orphanManifest.segments.find((segment) => segment.storage === 'raw-parts')?.parts[0].sha256)
  assert.deepEqual(snapshotParts[0].endCursor, orphanResult.cursor)
  assert.ok((snapshotSegment.file.size ?? 0) > 16 * 1024 * 1024)
  assert.equal(snapshotParts.some((part) => part.key.includes('orphan-lease')), false)
  assert.equal(manifest.files, 1)
  assert.equal(manifest.embeddedFiles, 1)

  let materializeCursor = 0
  let materializeAdvances = 0
  let maxMaterializeR2Operations = 0
  while (materializeCursor < manifest.segments.length) {
    const r2Before = bucket.operations
    const result = await materializeStoredExportSegment({
      bucket,
      prefix: `job/materialize-lease-${materializeAdvances}`,
      manifest,
      segmentCursor: materializeCursor,
    })
    assert.ok(result.r2Operations <= CONTENT_EXPORT_MAX_R2_OPERATIONS_PER_ADVANCE)
    assert.equal(bucket.operations - r2Before, result.r2Operations)
    maxMaterializeR2Operations = Math.max(maxMaterializeR2Operations, result.r2Operations + 2)
    materializeCursor = result.segmentCursor
    materializeAdvances += 1
    assert.ok(materializeAdvances < 100)
  }
  assert.ok(materializeAdvances > 1)
  assert.ok(maxGenerationD1Queries < 50)
  assert.ok(maxMaterializeR2Operations < 50)
  assert.ok(snapshotSegment.materialized)
  assert.ok(bucket.multipartUploads > 0)
  assert.equal(snapshotSegment.materialized.size, snapshotSegment.file.size)
  assert.equal(`sha256:${snapshotSegment.materialized.sha256}`, snapshotSegment.file.checksum)
  const fingerprint = snapshotSegment.materialized.sha256

  let verifyCursor = newContentSnapshotCursor()
  let partIndex = 0
  let verifiedFingerprint: string | null = null
  while (partIndex < snapshotParts.length) {
    const r2Before = bucket.operations
    const verified = await verifyContentSnapshotPart({
      bucket, manifest, cursor: verifyCursor, partIndex, source,
      targetBytes: 256 * 1024,
    })
    assert.equal(bucket.operations - r2Before, 0)
    assert.ok(verified.queries <= CONTENT_EXPORT_SNAPSHOT_D1_QUERIES_PER_ADVANCE)
    verifyCursor = verified.cursor
    partIndex = verified.partIndex
    verifiedFingerprint = verified.fingerprint ?? verifiedFingerprint
  }
  assert.equal(verifiedFingerprint, fingerprint)

  revisions[0] = {
    ...revisions[0],
    value: { ...revisions[0].value, content: `${largeBody}changed` },
  }
  await assert.rejects(verifyContentSnapshotPart({
    bucket, manifest, cursor: newContentSnapshotCursor(), partIndex: 0, source,
    targetBytes: 256 * 1024,
  }), /Content changed while the export job was running/)

  const githubReadBefore = bucket.operations
  const githubSnapshot = await readStoredSegmentFiles(bucket, snapshotSegment)
  assert.equal(bucket.operations - githubReadBefore, 1)
  assert.equal(githubSnapshot.length, 1)

  let bundleAdvances = 0
  while (!manifest.bundle) {
    const r2Before = bucket.operations
    const result = await materializeStoredContentBundle({
      bucket,
      prefix: `job/bundle-lease-${bundleAdvances}`,
      manifest,
    })
    assert.ok(result.r2Operations <= CONTENT_EXPORT_MAX_R2_OPERATIONS_PER_ADVANCE)
    assert.equal(bucket.operations - r2Before, result.r2Operations)
    bundleAdvances += 1
    assert.ok(bundleAdvances < 100)
  }

  let serialized = ''
  const downloadBefore = bucket.operations
  for await (const chunk of storedContentBundleChunks(bucket, manifest)) serialized += chunk
  assert.equal(bucket.operations - downloadBefore, 1)
  const bundle = contentBundleSchema.parse(JSON.parse(serialized))
  const snapshotFiles = bundle.files.filter((file) => file.path === '.joruno/content.json')
  assert.equal(snapshotFiles.length, 1)
  const snapshotContent = snapshotFiles[0].content ?? ''
  const parsedSnapshot = JSON.parse(snapshotContent)
  assert.equal(parsedSnapshot.resources.length, count)
  assert.equal(parsedSnapshot.resources[0].authorId, 'user-1')
  assert.equal(parsedSnapshot.resources[0].revisions[0].createdBy, 'user-1')
  assert.equal(parsedSnapshot.publicationEvents[0].actorId, 'user-1')
  assert.equal(parsedSnapshot.redirects[0].createdAt, '2025-01-02T03:04:05.000Z')
  assert.equal(
    snapshotSegment.file.checksum,
    `sha256:${createHash('sha256').update(snapshotContent).digest('hex')}`,
  )

  const originalFetch = globalThis.fetch
  globalThis.fetch = async (request, init) => {
    const url = String(request)
    if (url.includes('/commits/')) return Response.json({ sha: 'commit-sha', commit: { tree: { sha: 'tree-sha' } } })
    if (url.includes('/git/trees/tree-sha') && (init?.method ?? 'GET') === 'GET') {
      return Response.json({
        truncated: false,
        tree: [
          { path: '.joruno/content.json', type: 'blob', sha: 'snapshot-sha', size: snapshotContent.length },
          { path: '.joruno/resources/document.json', type: 'blob', sha: 'document-sha', size: snapshotContent.length },
        ],
      })
    }
    if (url.endsWith('/git/blobs')) return Response.json({ sha: 'snapshot-blob' })
    if (url.endsWith('/git/trees')) return Response.json({ sha: 'next-tree' })
    return new Response('not found', { status: 404 })
  }
  try {
    // A full export also contains the per-resource-type view. When one type
    // dominates a >16 MiB canonical snapshot, both logical Git blobs must
    // retain the same bounded large-data allowance.
    const githubFiles = [...snapshotFiles, {
      ...snapshotFiles[0],
      path: '.joruno/resources/document.json',
    }]
    const patched = await patchGitHubExportTree({
      repository: 'owner/repository', token: 'TOKEN', baseTree: 'base-tree', knownShas: {}, files: githubFiles,
    })
    assert.equal(patched.changedFiles, 2)
    const discovered = await discoverGitHubContent({ repository: 'owner/repository', ref: 'main', token: 'TOKEN' })
    assert.deepEqual(discovered.entries.map((entry) => entry.path), [
      '.joruno/content.json',
      '.joruno/resources/document.json',
    ])
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('finalizes 60+ persisted pages across bounded advances and downloads with one R2 GET', async () => {
  const bucket = new MemoryBucket()
  const manifest = newStoredContentExportManifest({ generatedAt: '2026-08-30T00:00:00.000Z' })
  for (let index = 0; index < 61; index += 1) {
    const key = `job/pages/${String(index).padStart(3, '0')}.json`
    const body = JSON.stringify([{
      path: `src/content/blog/post-${index}.md`,
      kind: 'content',
      encoding: 'utf8',
      mediaType: 'text/markdown',
      content: `# Post ${index}\n`,
    }])
    await bucket.put(key, body)
    manifest.segments.push({
      storage: 'page',
      key,
      count: 1,
      embedded: true,
      size: new TextEncoder().encode(body).byteLength,
      sha256: createHash('sha256').update(body).digest('hex'),
    })
  }
  manifest.files = 61
  manifest.embeddedFiles = 61

  const skipped = await materializeStoredExportSegment({
    bucket,
    prefix: 'job/materialize-pages',
    manifest,
    segmentCursor: 0,
  })
  assert.equal(skipped.done, true)
  assert.equal(skipped.r2Operations, 0)

  let advances = 0
  while (!manifest.bundle) {
    const before = bucket.operations
    const result = await materializeStoredContentBundle({
      bucket,
      prefix: `job/finalize-lease-${advances}`,
      manifest,
    })
    assert.ok(result.r2Operations <= CONTENT_EXPORT_MAX_R2_OPERATIONS_PER_ADVANCE)
    assert.equal(bucket.operations - before, result.r2Operations)
    advances += 1
    assert.ok(advances < 20)
  }
  assert.ok(advances > 1)

  const beforeDownload = bucket.operations
  let serialized = ''
  for await (const chunk of storedContentBundleChunks(bucket, manifest)) serialized += chunk
  assert.equal(bucket.operations - beforeDownload, 1)
  assert.equal(new TextEncoder().encode(serialized).byteLength, manifest.bundle.size)
  assert.equal(createHash('sha256').update(serialized).digest('hex'), manifest.bundle.sha256)
  const bundle = contentBundleSchema.parse(JSON.parse(serialized))
  assert.equal(bundle.files.length, 61)
  assert.equal(bundle.files.at(-1)?.content, '# Post 60\n')
})

test('uses canonical Git blob SHA-1 framing', () => {
  assert.equal(gitBlobSha('hello\n'), 'ce013625030ba8dba906f756967f9e9ca394464a')
})

test('batches 60 GitHub files into bounded tree patches instead of one blob request per file', async () => {
  const originalFetch = globalThis.fetch
  let treePosts = 0
  let blobPosts = 0
  globalThis.fetch = async (request, init) => {
    const url = String(request)
    const method = init?.method || 'GET'
    if (url.includes('/git/ref/heads/')) return Response.json({ object: { sha: 'head-sha' } })
    if (url.includes('/contents/.joruno/export-index.json')) return new Response('missing', { status: 404 })
    if (url.endsWith('/git/commits/head-sha')) return Response.json({ tree: { sha: 'base-tree' } })
    if (url.includes('/git/trees/base-tree?recursive=1')) return Response.json({ truncated: false, tree: [] })
    if (url.endsWith('/git/blobs') && method === 'POST') {
      blobPosts += 1
      return Response.json({ sha: `blob-${blobPosts}` })
    }
    if (url.endsWith('/git/trees') && method === 'POST') {
      treePosts += 1
      return Response.json({ sha: `tree-${treePosts}` })
    }
    if (url.endsWith('/git/commits') && method === 'POST') {
      return Response.json({ sha: 'next-commit', html_url: 'https://github.example/commit' })
    }
    if (url.includes('/git/refs/heads/') && method === 'PATCH') return Response.json({})
    return new Response('not found', { status: 404 })
  }
  try {
    const files = Array.from({ length: 60 }, (_, index) => ({
      path: `src/content/blog/post-${index}.md`,
      kind: 'content' as const,
      encoding: 'utf8' as const,
      mediaType: 'text/markdown',
      content: `# Post ${index}\n`,
    }))
    const result = await writeContentBundleToGitHub({
      bundle: contentBundleSchema.parse({
        schemaVersion: 'joruno-content/v1',
        generatedAt: '2026-08-30T00:00:00.000Z',
        source: { repository: null, ref: null, commit: null },
        files,
      }),
      repository: 'owner/repository',
      branch: 'main',
      token: 'TOKEN',
    })
    assert.equal(result.writtenFiles, 61)
    assert.equal(blobPosts, 0)
    assert.equal(treePosts, 4)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('uses persisted fenced export jobs and a streaming download route', () => {
  const jobs = readFileSync('lib/content-transfer/export-jobs.ts', 'utf8')
  const service = readFileSync('lib/content-transfer/export-service.ts', 'utf8')
  const route = readFileSync('app/api/content-transfer/export/route.ts', 'utf8')
  const githubRoute = readFileSync('app/api/content-transfer/github/export/route.ts', 'utf8')

  assert.match(jobs, /const leaseToken = crypto\.randomUUID\(\)/)
  assert.match(jobs, /eq\(platformJobs\.outputJson, claimedOutputJson\)/)
  assert.match(jobs, /const draft = structuredClone\(output\)/)
  assert.match(jobs, /Object\.assign\(output, draft\)/)
  assert.match(jobs, /objects\/\$\{leaseToken\}/)
  assert.match(jobs, /verifyContentSnapshotPart/)
  assert.match(jobs, /materializeStoredExportSegment/)
  assert.match(jobs, /materializeStoredContentBundle/)
  assert.match(service, /storage: 'raw-parts'/)
  assert.match(service, /if \(manifest\.bundle\)/)
  assert.match(service, /CONTENT_EXPORT_SNAPSHOT_D1_QUERIES_PER_ADVANCE = 32/)
  assert.match(service, /authorId: row\.authorId/)
  assert.match(service, /createdBy: revision\.createdBy/)
  assert.match(service, /actorId: row\.actorId/)
  assert.match(service, /createdAt: createdAt\.toISOString\(\)/)
  assert.doesNotMatch(jobs, /calculateContentSnapshotFingerprint/)
  assert.doesNotMatch(service, /contentSnapshotChunks/)
  assert.doesNotMatch(service, /Promise\.all\(\[\s*db\.select\(\)\.from\(resources\)/)
  assert.doesNotMatch(service, /for \(const part of segment\.parts\) chunks\.push/)
  assert.match(route, /storedContentBundleStream/)
  assert.doesNotMatch(route, /NextResponse\.json\(bundle/)
  assert.match(githubRoute, /createContentExportJob/)
  assert.doesNotMatch(githubRoute, /writeContentBundleToGitHub/)
})
