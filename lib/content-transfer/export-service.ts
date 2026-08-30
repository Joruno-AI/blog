import { createHash } from 'node:crypto'

import { and, asc, count, eq, inArray, ne } from 'drizzle-orm'

import { db } from '@/lib/db'
import { getPostsWithCategoryPath } from '@/lib/db/queries/posts'
import {
  articles,
  assets,
  categories,
  collectionItems,
  collections,
  documents,
  publicationEvents,
  redirects,
  resourceAlbums,
  resourceAssets,
  resourceCategories,
  resourceRelations,
  resourceRoutes,
  resourceRevisions,
  resources,
  resourceTags,
  settings,
  tags,
  tracks,
} from '@/lib/db/schema'
import { resourceTypes, type ResourceType } from '@/modules/resources/domain/types'

import {
  CONTENT_BUNDLE_VERSION,
  CONTENT_SNAPSHOT_PATH,
  normalizeBundlePath,
  type BundleFile,
} from './contract'
import { articleMarkdownPath, serializeArticleMarkdown } from './markdown'

const ROWS_PER_PAGE = 20
const RESOURCE_ROWS_PER_PAGE = 10
const REVISION_ROWS_PER_PAGE = 8
const SNAPSHOT_PART_TARGET_BYTES = 3 * 1024 * 1024
const OBJECT_COMPACTION_FAN_IN = 20
const BUNDLE_SEGMENTS_PER_ADVANCE = 16
export const CONTENT_EXPORT_ARTICLES_PER_ADVANCE = 20
export const CONTENT_EXPORT_ASSETS_PER_ADVANCE = 100
export const CONTENT_EXPORT_PAGE_MAX_BYTES = 3_500_000
// An advance spends at most 32 D1 reads here plus four job claim/save/refresh
// statements in export-jobs.ts. The resulting ceiling (36) leaves fourteen
// statements of headroom below the Cloudflare Free per-invocation limit.
export const CONTENT_EXPORT_SNAPSHOT_D1_QUERIES_PER_ADVANCE = 32
export const CONTENT_EXPORT_MAX_D1_QUERIES_PER_ADVANCE = 36
export const CONTENT_EXPORT_MAX_R2_OPERATIONS_PER_ADVANCE = 30

export const CONTENT_EXPORT_RESOURCE_TYPES = resourceTypes.filter(
  (type): type is Exclude<ResourceType, 'article'> => type !== 'article',
)

export interface ContentExportBucketObject {
  body: ReadableStream<Uint8Array>
  size: number
  text(): Promise<string>
}

interface ContentExportUploadedPart {
  partNumber: number
  etag: string
}

interface ContentExportMultipartUpload {
  uploadPart(
    partNumber: number,
    value: Uint8Array | ReadableStream<Uint8Array>,
  ): Promise<ContentExportUploadedPart>
  complete(parts: ContentExportUploadedPart[]): Promise<unknown>
  abort(): Promise<void>
}

export interface ContentExportBucket {
  get(key: string): Promise<ContentExportBucketObject | null>
  put(
    key: string,
    value: string | Uint8Array | ReadableStream<Uint8Array>,
    options?: { httpMetadata?: { contentType?: string } },
  ): Promise<unknown>
  createMultipartUpload(
    key: string,
    options?: { httpMetadata?: { contentType?: string } },
  ): Promise<ContentExportMultipartUpload>
  delete(key: string | string[]): Promise<void>
}

interface StoredBundleFileBase {
  path: string
  kind: BundleFile['kind']
  encoding: Exclude<BundleFile['encoding'], 'external'>
  mediaType: string
  checksum?: string | null
  size?: number
}

export interface StoredRawExportSegment {
  storage: 'raw'
  key: string
  file: StoredBundleFileBase
}

export interface ContentSnapshotResourceCursor {
  pageOffset: number
  resourceIndex: number
  revisionOffset: number
  open: boolean
  firstRevision: boolean
  sawCurrent: boolean
  sawPublished: boolean
  active: {
    id: string
    currentRevisionId: string
    publishedRevisionId: string | null
  } | null
}

export interface ContentSnapshotCursor {
  section: 'resources' | 'properties' | 'done'
  resources: ContentSnapshotResourceCursor
  propertyIndex: number
  propertyOffset: number
}

export interface ContentResourceExportCursor {
  section: 'resources' | 'done'
  resources: ContentSnapshotResourceCursor
}

export interface StoredRawExportPart {
  key: string
  size: number
  sha256: string
  escapedSize: number
  queries: number
  endCursor: ContentSnapshotCursor | ContentResourceExportCursor
}

export interface StoredExportObjectDescriptor {
  key: string
  size: number
  sha256: string
}

export interface StoredObjectCompactionState {
  level: number
  cursor: number
  inputs: StoredExportObjectDescriptor[] | null
  outputs: StoredExportObjectDescriptor[]
  garbageKeys: string[]
}

export interface StoredRawPartsExportSegment {
  storage: 'raw-parts'
  parts: StoredRawExportPart[]
  file: StoredBundleFileBase
  escapedSize?: number
  materialized?: StoredExportObjectDescriptor
  compaction?: StoredObjectCompactionState
  garbageKeys?: string[]
}

export interface StoredPageExportSegment {
  storage: 'page'
  key: string
  count: number
  embedded: boolean
  size?: number
  sha256?: string
}

export type StoredExportSegment = StoredRawExportSegment | StoredRawPartsExportSegment | StoredPageExportSegment

export interface StoredBundleBuildState {
  stage: 'fragments' | 'compact'
  segmentCursor: number
  firstFile: boolean
  fragments: StoredExportObjectDescriptor[]
  compaction?: StoredObjectCompactionState
}

export interface StoredContentExportManifest {
  version: 1
  generatedAt: string
  source: { repository: string | null; ref: string | null; commit: string | null }
  segments: StoredExportSegment[]
  files: number
  embeddedFiles: number
  externalAssets: number
  bundle?: StoredExportObjectDescriptor
  bundleBuild?: StoredBundleBuildState
}

export interface ContentExportInspection {
  resources: number
  articles: number
  embeddedFiles: number
  externalAssets: number
  totalFiles: number
}

function iso(value: Date | null) {
  return value ? value.toISOString() : null
}

function metadata(value: string) {
  try {
    const parsed: unknown = JSON.parse(value)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {}
  } catch {
    return {}
  }
}

function assetBundlePath(key: string, id: string) {
  try {
    return normalizeBundlePath(`public/${key.replace(/^\/+/, '')}`)
  } catch {
    return `.joruno/assets/${encodeURIComponent(id)}`
  }
}

function utf8Bytes(value: string) {
  return new TextEncoder().encode(value).byteLength
}

function resourceSnapshotBase(row: typeof resources.$inferSelect) {
  if (!row.currentRevisionId) throw new Error(`Resource ${row.id} has no current revision.`)
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    slug: row.slug,
    path: row.path,
    description: row.description,
    status: row.status,
    visibility: row.visibility,
    coverAssetId: row.coverAssetId,
    currentRevisionId: row.currentRevisionId,
    publishedRevisionId: row.publishedRevisionId,
    authorId: row.authorId,
    publishedAt: iso(row.publishedAt),
    scheduledAt: iso(row.scheduledAt),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

function revisionSnapshotRow(revision: typeof resourceRevisions.$inferSelect) {
  return {
    id: revision.id,
    version: revision.version,
    title: revision.title,
    slug: revision.slug,
    path: revision.path,
    description: revision.description,
    visibility: revision.visibility,
    content: revision.content,
    contentFormat: revision.contentFormat,
    metadata: metadata(revision.metadataJson),
    sourceHash: revision.sourceHash,
    changeSummary: revision.changeSummary,
    createdBy: revision.createdBy,
    createdAt: revision.createdAt.toISOString(),
  }
}

export interface ContentSnapshotSourceResource {
  id: string
  currentRevisionId: string
  publishedRevisionId: string | null
  value: Record<string, unknown>
}

export interface ContentSnapshotSourceRevision {
  id: string
  resourceId: string
  value: Record<string, unknown>
}

export const CONTENT_SNAPSHOT_PROPERTY_NAMES = [
  'categories', 'tags', 'assets', 'articles', 'documents', 'albums', 'tracks', 'collections',
  'categoryLinks', 'tagLinks', 'assetLinks', 'collectionItems', 'relations', 'routes', 'redirects',
  'publicationEvents', 'settings',
] as const

export type ContentSnapshotPropertyName = typeof CONTENT_SNAPSHOT_PROPERTY_NAMES[number]

export interface ContentSnapshotDataSource {
  countResources(type?: ResourceType): Promise<number>
  readResources(type: ResourceType | undefined, offset: number, limit: number): Promise<ContentSnapshotSourceResource[]>
  readRevisions(resourceIds: string[], offset: number, limit: number): Promise<ContentSnapshotSourceRevision[]>
  readProperty(name: ContentSnapshotPropertyName, offset: number, limit: number): Promise<unknown[]>
}

async function readDatabaseSnapshotProperty(name: ContentSnapshotPropertyName, offset: number, limit: number) {
  if (name === 'categories') return (await db.select().from(categories)
    .orderBy(asc(categories.id)).limit(limit).offset(offset))
    .map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }))
  if (name === 'tags') return (await db.select().from(tags)
    .orderBy(asc(tags.id)).limit(limit).offset(offset))
    .map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }))
  if (name === 'assets') return (await db.select().from(assets)
    .orderBy(asc(assets.id)).limit(limit).offset(offset))
    .map((row) => ({
      id: row.id,
      key: row.key,
      url: row.url,
      name: row.name,
      mediaType: row.mediaType,
      mimeType: row.mimeType,
      size: row.size,
      width: row.width,
      height: row.height,
      durationSeconds: row.durationSeconds,
      checksum: row.checksum,
      metadata: metadata(row.metadataJson),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }))
  if (name === 'articles') return db.select().from(articles)
    .orderBy(asc(articles.resourceId)).limit(limit).offset(offset)
  if (name === 'documents') return (await db.select().from(documents)
    .orderBy(asc(documents.resourceId)).limit(limit).offset(offset))
    .map((row) => ({ ...row, syncedAt: iso(row.syncedAt) }))
  if (name === 'albums') return (await db.select().from(resourceAlbums)
    .orderBy(asc(resourceAlbums.resourceId)).limit(limit).offset(offset))
    .map((row) => ({ ...row, releaseDate: iso(row.releaseDate) }))
  if (name === 'tracks') return db.select().from(tracks)
    .orderBy(asc(tracks.resourceId)).limit(limit).offset(offset)
  if (name === 'collections') return db.select().from(collections)
    .orderBy(asc(collections.resourceId)).limit(limit).offset(offset)
  if (name === 'categoryLinks') return db.select().from(resourceCategories)
    .orderBy(asc(resourceCategories.resourceId), asc(resourceCategories.categoryId)).limit(limit).offset(offset)
  if (name === 'tagLinks') return db.select().from(resourceTags)
    .orderBy(asc(resourceTags.resourceId), asc(resourceTags.tagId)).limit(limit).offset(offset)
  if (name === 'assetLinks') return db.select().from(resourceAssets)
    .orderBy(asc(resourceAssets.resourceId), asc(resourceAssets.assetId), asc(resourceAssets.role)).limit(limit).offset(offset)
  if (name === 'collectionItems') return db.select().from(collectionItems)
    .orderBy(asc(collectionItems.collectionResourceId), asc(collectionItems.resourceId)).limit(limit).offset(offset)
  if (name === 'relations') return (await db.select().from(resourceRelations)
    .orderBy(asc(resourceRelations.sourceResourceId), asc(resourceRelations.targetResourceId), asc(resourceRelations.relationType))
    .limit(limit).offset(offset))
    .map((row) => ({
      sourceResourceId: row.sourceResourceId,
      targetResourceId: row.targetResourceId,
      relationType: row.relationType,
      sortOrder: row.sortOrder,
      metadata: metadata(row.metadataJson),
    }))
  if (name === 'routes') return (await db.select().from(resourceRoutes)
    .orderBy(asc(resourceRoutes.path)).limit(limit).offset(offset))
    .map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }))
  if (name === 'redirects') return (await db.select().from(redirects)
    .orderBy(asc(redirects.fromPath)).limit(limit).offset(offset))
    .map(({ fromPath, toPath, statusCode, createdAt }) => ({
      fromPath,
      toPath,
      statusCode,
      createdAt: createdAt.toISOString(),
    }))
  if (name === 'publicationEvents') return (await db.select().from(publicationEvents)
    .orderBy(asc(publicationEvents.id)).limit(limit).offset(offset))
    .map((row) => ({
      id: row.id,
      resourceId: row.resourceId,
      revisionId: row.revisionId,
      eventType: row.eventType,
      actorId: row.actorId,
      data: metadata(row.dataJson),
      createdAt: row.createdAt.toISOString(),
    }))
  return (await db.select().from(settings)
    .orderBy(asc(settings.id)).limit(limit).offset(offset))
    .map((row) => ({
      ...row,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }))
}

export const databaseContentSnapshotDataSource: ContentSnapshotDataSource = {
  async countResources(type) {
    const [row] = await db.select({ total: count() }).from(resources)
      .where(type ? eq(resources.type, type) : undefined)
    return row?.total ?? 0
  },
  async readResources(type, offset, limit) {
    const rows = await db.select().from(resources)
      .where(type ? eq(resources.type, type) : undefined)
      .orderBy(asc(resources.id)).limit(limit).offset(offset)
    return rows.map((row) => ({
      id: row.id,
      currentRevisionId: row.currentRevisionId ?? '',
      publishedRevisionId: row.publishedRevisionId,
      value: resourceSnapshotBase(row),
    }))
  },
  async readRevisions(resourceIds, offset, limit) {
    if (!resourceIds.length) return []
    const rows = await db.select().from(resourceRevisions)
      .where(inArray(resourceRevisions.resourceId, resourceIds))
      .orderBy(asc(resourceRevisions.resourceId), asc(resourceRevisions.version), asc(resourceRevisions.id))
      .limit(limit).offset(offset)
    return rows.map((row) => ({ id: row.id, resourceId: row.resourceId, value: revisionSnapshotRow(row) }))
  },
  readProperty: readDatabaseSnapshotProperty,
}

function newResourceCursor(): ContentSnapshotResourceCursor {
  return {
    pageOffset: 0,
    resourceIndex: 0,
    revisionOffset: 0,
    open: false,
    firstRevision: true,
    sawCurrent: false,
    sawPublished: false,
    active: null,
  }
}

export function newContentSnapshotCursor(): ContentSnapshotCursor {
  return { section: 'resources', resources: newResourceCursor(), propertyIndex: 0, propertyOffset: 0 }
}

export function newContentResourceExportCursor(): ContentResourceExportCursor {
  return { section: 'resources', resources: newResourceCursor() }
}

function copyCursor<T extends ContentSnapshotCursor | ContentResourceExportCursor>(cursor: T): T {
  return JSON.parse(JSON.stringify(cursor)) as T
}

function resourceCursorAtStart(cursor: ContentSnapshotResourceCursor) {
  return cursor.pageOffset === 0 && cursor.resourceIndex === 0 && cursor.revisionOffset === 0
    && !cursor.open && cursor.active === null
}

async function appendResourceRows(input: {
  cursor: ContentSnapshotResourceCursor
  type?: ResourceType
  source: ContentSnapshotDataSource
  queryBudget: number
  queries: number
  append(value: string): void
  shouldStop(): boolean
}) {
  const cursor = input.cursor
  while (input.queries + 2 <= input.queryBudget) {
    const rows = await input.source.readResources(input.type, cursor.pageOffset, RESOURCE_ROWS_PER_PAGE)
    input.queries += 1
    if (!rows.length) return { queries: input.queries, done: true }
    if (cursor.resourceIndex > rows.length) {
      throw new Error('Content changed while an export resource page was being resumed.')
    }
    // A previous part is allowed to stop immediately after closing the last
    // resource in a page. Normalize that persisted boundary before issuing a
    // revision query, otherwise the valid `resourceIndex === rows.length`
    // cursor would be mistaken for a changed page on the next invocation.
    if (cursor.resourceIndex === rows.length) {
      cursor.pageOffset += rows.length
      cursor.resourceIndex = 0
      cursor.revisionOffset = 0
      if (rows.length < RESOURCE_ROWS_PER_PAGE) return { queries: input.queries, done: true }
      if (input.shouldStop()) return { queries: input.queries, done: false }
      continue
    }
    const ids = rows.map((row) => row.id)
    while (input.queries < input.queryBudget) {
      const revisions = await input.source.readRevisions(ids, cursor.revisionOffset, REVISION_ROWS_PER_PAGE)
      input.queries += 1
      let consumed = 0
      for (const revision of revisions) {
        while (cursor.resourceIndex < rows.length && rows[cursor.resourceIndex].id < revision.resourceId) {
          const row = rows[cursor.resourceIndex]
          if (!cursor.open) {
            const prefix = JSON.stringify(row.value).slice(0, -1)
            input.append(`${cursor.pageOffset + cursor.resourceIndex ? ',' : ''}${prefix},"revisions":[`)
            cursor.open = true
            cursor.active = {
              id: row.id,
              currentRevisionId: row.currentRevisionId,
              publishedRevisionId: row.publishedRevisionId,
            }
          }
          if (!cursor.sawCurrent) throw new Error(`Resource ${row.id} is missing its current revision.`)
          if (cursor.active?.publishedRevisionId && !cursor.sawPublished) {
            throw new Error(`Resource ${row.id} is missing its published revision.`)
          }
          input.append(']}')
          cursor.resourceIndex += 1
          cursor.open = false
          cursor.firstRevision = true
          cursor.sawCurrent = false
          cursor.sawPublished = false
          cursor.active = null
        }
        const row = rows[cursor.resourceIndex]
        if (!row || row.id !== revision.resourceId) {
          throw new Error(`Revision ${revision.id} has an unexpected resource owner.`)
        }
        if (!cursor.open) {
          const prefix = JSON.stringify(row.value).slice(0, -1)
          input.append(`${cursor.pageOffset + cursor.resourceIndex ? ',' : ''}${prefix},"revisions":[`)
          cursor.open = true
          cursor.active = {
            id: row.id,
            currentRevisionId: row.currentRevisionId,
            publishedRevisionId: row.publishedRevisionId,
          }
        } else if (cursor.active?.id !== row.id
          || cursor.active.currentRevisionId !== row.currentRevisionId
          || cursor.active.publishedRevisionId !== row.publishedRevisionId) {
          throw new Error(`Resource ${row.id} changed while its revisions were exported.`)
        }
        input.append(`${cursor.firstRevision ? '' : ','}${JSON.stringify(revision.value)}`)
        cursor.firstRevision = false
        cursor.sawCurrent ||= revision.id === cursor.active.currentRevisionId
        cursor.sawPublished ||= revision.id === cursor.active.publishedRevisionId
        cursor.revisionOffset += 1
        consumed += 1
        if (input.shouldStop()) return { queries: input.queries, done: false }
      }
      if (consumed < revisions.length) return { queries: input.queries, done: false }
      if (revisions.length === REVISION_ROWS_PER_PAGE) continue

      while (cursor.resourceIndex < rows.length) {
        const row = rows[cursor.resourceIndex]
        if (!cursor.open) {
          const prefix = JSON.stringify(row.value).slice(0, -1)
          input.append(`${cursor.pageOffset + cursor.resourceIndex ? ',' : ''}${prefix},"revisions":[`)
          cursor.open = true
          cursor.active = {
            id: row.id,
            currentRevisionId: row.currentRevisionId,
            publishedRevisionId: row.publishedRevisionId,
          }
        }
        if (!cursor.sawCurrent) throw new Error(`Resource ${row.id} is missing its current revision.`)
        if (cursor.active?.publishedRevisionId && !cursor.sawPublished) {
          throw new Error(`Resource ${row.id} is missing its published revision.`)
        }
        input.append(']}')
        cursor.resourceIndex += 1
        cursor.open = false
        cursor.firstRevision = true
        cursor.sawCurrent = false
        cursor.sawPublished = false
        cursor.active = null
        if (input.shouldStop() && cursor.resourceIndex < rows.length) {
          return { queries: input.queries, done: false }
        }
      }
      cursor.pageOffset += rows.length
      cursor.resourceIndex = 0
      cursor.revisionOffset = 0
      if (rows.length < RESOURCE_ROWS_PER_PAGE) return { queries: input.queries, done: true }
      if (input.shouldStop()) return { queries: input.queries, done: false }
      break
    }
  }
  return { queries: input.queries, done: false }
}

function partResult<T extends ContentSnapshotCursor | ContentResourceExportCursor>(
  content: string,
  cursor: T,
  queries: number,
  done: boolean,
) {
  const bytes = new TextEncoder().encode(content)
  const escaped = JSON.stringify(content).slice(1, -1)
  return {
    content,
    cursor,
    queries,
    done,
    size: bytes.byteLength,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    escapedSize: utf8Bytes(escaped),
  }
}

export async function buildContentSnapshotPart(input: {
  cursor: ContentSnapshotCursor
  source?: ContentSnapshotDataSource
  queryBudget?: number
  targetBytes?: number
}) {
  const cursor = copyCursor(input.cursor)
  const source = input.source ?? databaseContentSnapshotDataSource
  const queryBudget = input.queryBudget ?? CONTENT_EXPORT_SNAPSHOT_D1_QUERIES_PER_ADVANCE
  const targetBytes = input.targetBytes ?? SNAPSHOT_PART_TARGET_BYTES
  const chunks: string[] = []
  let size = 0
  let queries = 0
  const append = (value: string) => {
    chunks.push(value)
    size += utf8Bytes(value)
  }
  const shouldStop = () => size >= targetBytes

  if (cursor.section === 'resources') {
    if (resourceCursorAtStart(cursor.resources)) append('{"resources":[')
    const result = await appendResourceRows({
      cursor: cursor.resources,
      source,
      queryBudget,
      queries,
      append,
      shouldStop,
    })
    queries = result.queries
    if (!result.done || shouldStop()) return partResult(chunks.join(''), cursor, queries, false)
    append(']')
    cursor.section = 'properties'
  }

  while (cursor.section === 'properties' && queries < queryBudget) {
    const name = CONTENT_SNAPSHOT_PROPERTY_NAMES[cursor.propertyIndex]
    if (!name) {
      append('}\n')
      cursor.section = 'done'
      break
    }
    if (cursor.propertyOffset === 0) append(`,${JSON.stringify(name)}:[`)
    const rows = await source.readProperty(name, cursor.propertyOffset, ROWS_PER_PAGE)
    queries += 1
    let consumed = 0
    for (const row of rows) {
      const serialized = `${cursor.propertyOffset ? ',' : ''}${JSON.stringify(row)}`
      append(serialized)
      cursor.propertyOffset += 1
      consumed += 1
      if (shouldStop()) break
    }
    if (consumed < rows.length) break
    if (rows.length < ROWS_PER_PAGE) {
      append(']')
      cursor.propertyIndex += 1
      cursor.propertyOffset = 0
      if (cursor.propertyIndex >= CONTENT_SNAPSHOT_PROPERTY_NAMES.length) {
        append('}\n')
        cursor.section = 'done'
        break
      }
    }
    if (shouldStop()) break
  }
  return partResult(chunks.join(''), cursor, queries, cursor.section === 'done')
}

export async function buildContentResourceExportPart(input: {
  type: Exclude<ResourceType, 'article'>
  cursor: ContentResourceExportCursor
  source?: ContentSnapshotDataSource
  queryBudget?: number
  targetBytes?: number
}) {
  const cursor = copyCursor(input.cursor)
  const source = input.source ?? databaseContentSnapshotDataSource
  const queryBudget = input.queryBudget ?? CONTENT_EXPORT_SNAPSHOT_D1_QUERIES_PER_ADVANCE
  const targetBytes = input.targetBytes ?? SNAPSHOT_PART_TARGET_BYTES
  const chunks: string[] = []
  let size = 0
  const append = (value: string) => {
    chunks.push(value)
    size += utf8Bytes(value)
  }
  if (resourceCursorAtStart(cursor.resources)) append('[')
  const result = await appendResourceRows({
    cursor: cursor.resources,
    type: input.type,
    source,
    queryBudget,
    queries: 0,
    append,
    shouldStop: () => size >= targetBytes,
  })
  if (result.done) {
    append(']\n')
    cursor.section = 'done'
  }
  return partResult(chunks.join(''), cursor, result.queries, cursor.section === 'done')
}

function streamFromChunks(
  chunks: AsyncIterable<string>,
  onChunk?: (chunk: string, bytes: Uint8Array) => void,
) {
  const iterator = chunks[Symbol.asyncIterator]()
  const encoder = new TextEncoder()
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const next = await iterator.next()
        if (next.done) return controller.close()
        const bytes = encoder.encode(next.value)
        onChunk?.(next.value, bytes)
        controller.enqueue(bytes)
      } catch (error) {
        controller.error(error)
      }
    },
    async cancel() {
      await iterator.return?.()
    },
  })
}

export async function writeMultipartTextObject(
  bucket: ContentExportBucket,
  key: string,
  chunks: AsyncIterable<string>,
  options: { hash?: boolean } = {},
) {
  const partSize = 5 * 1024 * 1024
  let size = 0
  const hash = options.hash ? createHash('sha256') : null
  const encoder = new TextEncoder()
  let buffer = new Uint8Array(partSize)
  let bufferLength = 0
  let multipart: ContentExportMultipartUpload | null = null
  const uploadedParts: ContentExportUploadedPart[] = []

  async function flushFullPart() {
    multipart ??= await bucket.createMultipartUpload(key, {
      httpMetadata: { contentType: 'application/json; charset=utf-8' },
    })
    uploadedParts.push(await multipart.uploadPart(uploadedParts.length + 1, buffer))
    buffer = new Uint8Array(partSize)
    bufferLength = 0
  }

  try {
    for await (const chunk of chunks) {
      const bytes = encoder.encode(chunk)
      size += bytes.byteLength
      hash?.update(bytes)
      let sourceOffset = 0
      while (sourceOffset < bytes.byteLength) {
        const copied = Math.min(partSize - bufferLength, bytes.byteLength - sourceOffset)
        buffer.set(bytes.subarray(sourceOffset, sourceOffset + copied), bufferLength)
        bufferLength += copied
        sourceOffset += copied
        if (bufferLength === partSize) await flushFullPart()
      }
    }
    const activeMultipart = multipart as ContentExportMultipartUpload | null
    if (!activeMultipart) {
      await bucket.put(key, buffer.slice(0, bufferLength), {
        httpMetadata: { contentType: 'application/json; charset=utf-8' },
      })
    } else {
      if (bufferLength) {
        uploadedParts.push(await activeMultipart.uploadPart(uploadedParts.length + 1, buffer.slice(0, bufferLength)))
      }
      await activeMultipart.complete(uploadedParts)
    }
  } catch (error) {
    const activeMultipart = multipart as ContentExportMultipartUpload | null
    if (activeMultipart) await Promise.allSettled([activeMultipart.abort()])
    throw error
  }
  return { size, sha256: hash?.digest('hex') ?? null }
}

function byteStreamFromChunks(
  chunks: AsyncIterable<Uint8Array>,
  onChunk?: (bytes: Uint8Array) => void,
) {
  const iterator = chunks[Symbol.asyncIterator]()
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const next = await iterator.next()
        if (next.done) return controller.close()
        onChunk?.(next.value)
        controller.enqueue(next.value)
      } catch (error) {
        controller.error(error)
      }
    },
    async cancel() {
      await iterator.return?.()
    },
  })
}

async function* verifiedStoredObjectChunks(
  bucket: ContentExportBucket,
  objects: StoredExportObjectDescriptor[],
) {
  for (const descriptor of objects) {
    const object = await bucket.get(descriptor.key)
    if (!object) throw new Error(`Persisted content export object is missing from R2: ${descriptor.key}`)
    const hash = createHash('sha256')
    let size = 0
    const reader = object.body.getReader()
    while (true) {
      const chunk = await reader.read()
      if (chunk.done) break
      size += chunk.value.byteLength
      hash.update(chunk.value)
      yield chunk.value
    }
    if (size !== descriptor.size || hash.digest('hex') !== descriptor.sha256) {
      throw new Error(`Persisted content export object is corrupted: ${descriptor.key}`)
    }
  }
}

async function writeMultipartObjectFromByteChunks(input: {
  bucket: ContentExportBucket
  key: string
  chunks: AsyncIterable<Uint8Array>
  expectedSize?: number
}) {
  const upload = await input.bucket.createMultipartUpload(input.key, {
    httpMetadata: { contentType: 'application/json; charset=utf-8' },
  })
  const hash = createHash('sha256')
  let size = 0
  const body = byteStreamFromChunks(input.chunks, (chunk) => {
    size += chunk.byteLength
    hash.update(chunk)
  })
  try {
    const part = await upload.uploadPart(1, body)
    if (input.expectedSize !== undefined && size !== input.expectedSize) {
      throw new Error(`Persisted export object size changed while composing ${input.key}.`)
    }
    await upload.complete([part])
  } catch (error) {
    await Promise.allSettled([upload.abort()])
    throw error
  }
  return { key: input.key, size, sha256: hash.digest('hex') } satisfies StoredExportObjectDescriptor
}

async function compactStoredObjects(input: {
  bucket: ContentExportBucket
  prefix: string
  state: StoredObjectCompactionState
  initialInputs?: StoredExportObjectDescriptor[]
}) {
  const source = input.state.inputs ?? input.initialInputs
  if (!source?.length) throw new Error('Persisted export compaction input is missing.')
  const selected = source.slice(input.state.cursor, input.state.cursor + OBJECT_COMPACTION_FAN_IN)
  if (!selected.length) throw new Error('Persisted export compaction cursor is invalid.')
  const expectedSize = selected.reduce((total, object) => total + object.size, 0)
  const key = `${input.prefix}/compact/${input.state.level}-${String(input.state.cursor).padStart(8, '0')}.json`
  const output = await writeMultipartObjectFromByteChunks({
    bucket: input.bucket,
    key,
    chunks: verifiedStoredObjectChunks(input.bucket, selected),
    expectedSize,
  })
  input.state.outputs.push(output)
  input.state.cursor += selected.length

  if (input.state.cursor < source.length) {
    return { done: false, object: null, r2Operations: selected.length + 3 }
  }
  if (input.state.outputs.length === 1) {
    if (input.state.level > 0) input.state.garbageKeys.push(...source.map((object) => object.key))
    return { done: true, object: input.state.outputs[0], r2Operations: selected.length + 3 }
  }
  if (input.state.level > 0) input.state.garbageKeys.push(...source.map((object) => object.key))
  input.state.inputs = input.state.outputs
  input.state.outputs = []
  input.state.cursor = 0
  input.state.level += 1
  return { done: false, object: null, r2Operations: selected.length + 3 }
}

function rawPartDescriptors(segment: StoredRawPartsExportSegment) {
  return segment.parts.map(({ key, size, sha256 }) => ({ key, size, sha256 }))
}

function newCompactionState(): StoredObjectCompactionState {
  return { level: 0, cursor: 0, inputs: null, outputs: [], garbageKeys: [] }
}

/**
 * Advances materialization of at most one raw logical file. Each compaction
 * invocation opens no more than OBJECT_COMPACTION_FAN_IN R2 objects and emits
 * one concatenated object. The cursor and intermediate descriptors live in
 * the lease-fenced manifest, so 50+ raw parts never have to be scanned by one
 * Worker invocation.
 */
export async function materializeStoredExportSegment(input: {
  bucket: ContentExportBucket
  prefix: string
  manifest: StoredContentExportManifest
  segmentCursor: number
}) {
  let segmentCursor = input.segmentCursor
  while (segmentCursor < input.manifest.segments.length) {
    const segment = input.manifest.segments[segmentCursor]
    if (segment.storage !== 'raw-parts' || segment.materialized) {
      segmentCursor += 1
      continue
    }
    if (!segment.parts.length) {
      throw new Error(`Persisted export raw segment has no parts: ${segment.file.path}`)
    }
    segment.compaction ??= newCompactionState()
    const compacted = await compactStoredObjects({
      bucket: input.bucket,
      prefix: `${input.prefix}/segments/${String(segmentCursor).padStart(6, '0')}`,
      state: segment.compaction,
      initialInputs: rawPartDescriptors(segment),
    })
    if (compacted.done) {
      if (!compacted.object) throw new Error('Persisted export compaction did not return its object.')
      segment.materialized = compacted.object
      segment.file.size = compacted.object.size
      segment.file.checksum = `sha256:${compacted.object.sha256}`
      segment.garbageKeys = [...new Set([
        ...(segment.garbageKeys ?? []),
        ...segment.compaction.garbageKeys,
      ])]
      delete segment.compaction
      segmentCursor += 1
    }
    return {
      manifest: input.manifest,
      segmentCursor,
      done: segmentCursor >= input.manifest.segments.length,
      materialized: compacted.done ? compacted.object : null,
      r2Operations: compacted.r2Operations,
    }
  }
  return {
    manifest: input.manifest,
    segmentCursor,
    done: true,
    materialized: null,
    r2Operations: 0,
  }
}

function checksumSha256(checksum: string | null | undefined) {
  const match = /^sha256:([a-f0-9]{64})$/i.exec(checksum ?? '')
  return match?.[1]?.toLowerCase() ?? null
}

async function* uncheckedStoredObjectChunks(bucket: ContentExportBucket, key: string) {
  const object = await bucket.get(key)
  if (!object) throw new Error(`Persisted content export object is missing from R2: ${key}`)
  const reader = object.body.getReader()
  while (true) {
    const chunk = await reader.read()
    if (chunk.done) return
    yield chunk.value
  }
}

function rawSegmentObject(segment: StoredRawExportSegment | StoredRawPartsExportSegment) {
  if (segment.storage === 'raw-parts') {
    if (!segment.materialized) {
      throw new Error(`Persisted export raw segment is not materialized: ${segment.file.path}`)
    }
    return segment.materialized
  }
  const sha256 = checksumSha256(segment.file.checksum)
  return typeof segment.file.size === 'number' && sha256
    ? { key: segment.key, size: segment.file.size, sha256 }
    : null
}

async function* rawSegmentBytes(
  bucket: ContentExportBucket,
  segment: StoredRawExportSegment | StoredRawPartsExportSegment,
) {
  const descriptor = rawSegmentObject(segment)
  if (descriptor) {
    yield* verifiedStoredObjectChunks(bucket, [descriptor])
  } else if (segment.storage === 'raw') {
    yield* uncheckedStoredObjectChunks(bucket, segment.key)
  }
}

function encodeText(value: string) {
  return new TextEncoder().encode(value)
}

async function* rawBundleFileEntryChunks(
  bucket: ContentExportBucket,
  segment: StoredRawExportSegment | StoredRawPartsExportSegment,
) {
  const filePrefix = JSON.stringify(segment.file).slice(0, -1)
  yield encodeText(`${filePrefix},"content":"`)
  const decoder = new TextDecoder()
  for await (const bytes of rawSegmentBytes(bucket, segment)) {
    const text = decoder.decode(bytes, { stream: true })
    if (text) yield encodeText(JSON.stringify(text).slice(1, -1))
  }
  const tail = decoder.decode()
  if (tail) yield encodeText(JSON.stringify(tail).slice(1, -1))
  yield encodeText('"}')
}

async function readVerifiedPageEntries(bucket: ContentExportBucket, segment: StoredPageExportSegment) {
  const object = await storedObject(bucket, segment.key)
  const rawBody = await object.text()
  const size = utf8Bytes(rawBody)
  const sha256 = createHash('sha256').update(rawBody).digest('hex')
  if ((typeof segment.size === 'number' && size !== segment.size)
    || (segment.sha256 && sha256 !== segment.sha256)) {
    throw new Error(`Persisted content export object is corrupted: ${segment.key}`)
  }
  const body = rawBody.trim()
  if (!body.startsWith('[') || !body.endsWith(']')) {
    throw new Error(`Invalid persisted export page: ${segment.key}`)
  }
  return body.slice(1, -1)
}

async function* bundleFragmentChunks(input: {
  bucket: ContentExportBucket
  manifest: StoredContentExportManifest
  segments: StoredExportSegment[]
  includeHeader: boolean
  includeFooter: boolean
  firstFile: { value: boolean }
}) {
  if (input.includeHeader) {
    yield encodeText(`{"schemaVersion":${JSON.stringify(CONTENT_BUNDLE_VERSION)},"generatedAt":${JSON.stringify(input.manifest.generatedAt)},"source":${JSON.stringify(input.manifest.source)},"files":[`)
  }
  for (const segment of input.segments) {
    if (segment.storage === 'page') {
      const entries = await readVerifiedPageEntries(input.bucket, segment)
      if (!entries) continue
      if (!input.firstFile.value) yield encodeText(',')
      yield encodeText(entries)
      input.firstFile.value = false
      continue
    }
    if (!input.firstFile.value) yield encodeText(',')
    yield* rawBundleFileEntryChunks(input.bucket, segment)
    input.firstFile.value = false
  }
  if (input.includeFooter) yield encodeText(']}\n')
}

/**
 * Builds one immutable downloadable bundle object through bounded fragment
 * writes followed by the same resumable fan-in compaction used for raw files.
 * Completed downloads therefore need exactly one R2 GET.
 */
export async function materializeStoredContentBundle(input: {
  bucket: ContentExportBucket
  prefix: string
  manifest: StoredContentExportManifest
}) {
  if (input.manifest.bundle) {
    return { manifest: input.manifest, done: true, bundle: input.manifest.bundle, r2Operations: 0 }
  }
  input.manifest.bundleBuild ??= {
    stage: 'fragments',
    segmentCursor: 0,
    firstFile: true,
    fragments: [],
  }
  const state = input.manifest.bundleBuild
  if (state.stage === 'fragments') {
    const start = state.segmentCursor
    const end = Math.min(input.manifest.segments.length, start + BUNDLE_SEGMENTS_PER_ADVANCE)
    const selected = input.manifest.segments.slice(start, end)
    const firstFile = { value: state.firstFile }
    const fragment = await writeMultipartObjectFromByteChunks({
      bucket: input.bucket,
      key: `${input.prefix}/bundle/fragments/${String(start).padStart(8, '0')}.json.part`,
      chunks: bundleFragmentChunks({
        bucket: input.bucket,
        manifest: input.manifest,
        segments: selected,
        includeHeader: start === 0,
        includeFooter: end === input.manifest.segments.length,
        firstFile,
      }),
    })
    state.fragments.push(fragment)
    state.segmentCursor = end
    state.firstFile = firstFile.value
    if (end === input.manifest.segments.length) {
      if (state.fragments.length === 1) {
        input.manifest.bundle = state.fragments[0]
        return {
          manifest: input.manifest,
          done: true,
          bundle: input.manifest.bundle,
          r2Operations: selected.length + 3,
        }
      }
      state.stage = 'compact'
      state.compaction = newCompactionState()
    }
    return {
      manifest: input.manifest,
      done: false,
      bundle: null,
      r2Operations: selected.length + 3,
    }
  }

  state.compaction ??= newCompactionState()
  const compacted = await compactStoredObjects({
    bucket: input.bucket,
    prefix: `${input.prefix}/bundle`,
    state: state.compaction,
    initialInputs: state.fragments,
  })
  if (compacted.done) {
    if (!compacted.object) throw new Error('Persisted bundle compaction did not return its object.')
    input.manifest.bundle = compacted.object
  }
  return {
    manifest: input.manifest,
    done: compacted.done,
    bundle: compacted.object,
    r2Operations: compacted.r2Operations,
  }
}

export function newStoredContentExportManifest(input: {
  generatedAt: string
  repository?: string | null
  ref?: string | null
  commit?: string | null
}): StoredContentExportManifest {
  return {
    version: 1,
    generatedAt: input.generatedAt,
    source: {
      repository: input.repository ?? null,
      ref: input.ref ?? null,
      commit: input.commit ?? null,
    },
    segments: [],
    files: 0,
    embeddedFiles: 0,
    externalAssets: 0,
  }
}

function rawPartsSegment(
  manifest: StoredContentExportManifest,
  path: string,
  kind: BundleFile['kind'],
) {
  const existing = manifest.segments.find((segment): segment is StoredRawPartsExportSegment =>
    segment.storage === 'raw-parts' && segment.file.path === path)
  if (existing) return existing
  const segment: StoredRawPartsExportSegment = {
    storage: 'raw-parts',
    parts: [],
    file: { path, kind, encoding: 'utf8', mediaType: 'application/json' },
  }
  manifest.segments.push(segment)
  return segment
}

function sameCursor(
  left: ContentSnapshotCursor | ContentResourceExportCursor,
  right: ContentSnapshotCursor | ContentResourceExportCursor,
) {
  return JSON.stringify(left) === JSON.stringify(right)
}

export async function writeContentSnapshotPart(input: {
  bucket: ContentExportBucket
  prefix: string
  manifest: StoredContentExportManifest
  cursor: ContentSnapshotCursor
  source?: ContentSnapshotDataSource
  queryBudget?: number
  targetBytes?: number
}) {
  const segment = rawPartsSegment(input.manifest, CONTENT_SNAPSHOT_PATH, 'data')
  const part = await buildContentSnapshotPart({
    cursor: input.cursor,
    source: input.source,
    queryBudget: input.queryBudget,
    targetBytes: input.targetBytes,
  })
  if (!part.content || (!part.done && sameCursor(part.cursor, input.cursor))) {
    throw new Error('Content snapshot export did not make progress.')
  }
  const key = `${input.prefix}/snapshot/${String(segment.parts.length).padStart(6, '0')}.json.part`
  await input.bucket.put(key, part.content, {
    httpMetadata: { contentType: 'application/json; charset=utf-8' },
  })
  segment.parts.push({
    key,
    size: part.size,
    sha256: part.sha256,
    escapedSize: part.escapedSize,
    queries: part.queries,
    endCursor: part.cursor,
  })
  segment.escapedSize = (segment.escapedSize ?? 0) + part.escapedSize
  const fingerprint: string | null = null
  let totalSize: number | null = null
  if (part.done) {
    // Do not reopen every persisted part here. A large export can contain
    // hundreds of parts, so the actual concatenated SHA-256 is calculated by
    // the bounded, resumable materialization phase below.
    totalSize = segment.parts.reduce((total, stored) => total + stored.size, 0)
    segment.file.size = totalSize
    input.manifest.files += 1
    input.manifest.embeddedFiles += 1
  }
  return {
    manifest: input.manifest,
    cursor: part.cursor,
    done: part.done,
    queries: part.queries,
    fingerprint,
    size: totalSize,
  }
}

export async function verifyContentSnapshotPart(input: {
  bucket: ContentExportBucket
  manifest: StoredContentExportManifest
  cursor: ContentSnapshotCursor
  partIndex: number
  source?: ContentSnapshotDataSource
  queryBudget?: number
  targetBytes?: number
}) {
  const segment = input.manifest.segments.find((candidate): candidate is StoredRawPartsExportSegment =>
    candidate.storage === 'raw-parts' && candidate.file.path === CONTENT_SNAPSHOT_PATH)
  if (!segment) throw new Error('Persisted content snapshot parts are missing from R2.')
  const expected = segment.parts[input.partIndex]
  if (!expected) throw new Error('Persisted content snapshot verification cursor is invalid.')
  const actual = await buildContentSnapshotPart({
    cursor: input.cursor,
    source: input.source,
    queryBudget: input.queryBudget,
    targetBytes: input.targetBytes,
  })
  if (actual.size !== expected.size || actual.sha256 !== expected.sha256
    || !sameCursor(actual.cursor, expected.endCursor)) {
    throw Object.assign(
      new Error('Content changed while the export job was running; start a new export.'),
      { permanent: true },
    )
  }
  const partIndex = input.partIndex + 1
  const done = partIndex === segment.parts.length
  if (done && !actual.done) throw new Error('Persisted content snapshot ended before the live verification pass.')
  let fingerprint: string | null = null
  if (done) {
    const complete = segment.materialized
    if (!complete || complete.size !== segment.file.size
      || `sha256:${complete.sha256}` !== segment.file.checksum) {
      throw new Error('Persisted content snapshot fingerprint does not match its manifest.')
    }
    fingerprint = complete.sha256
  }
  return { cursor: actual.cursor, partIndex, done, queries: actual.queries, fingerprint }
}

function articleBundleFile(post: Awaited<ReturnType<typeof getPostsWithCategoryPath>>[number]): BundleFile {
  return {
    path: articleMarkdownPath({ slug: post.slug, categoryPath: post.categoryPath }),
    kind: 'content',
    encoding: 'utf8',
    mediaType: 'text/markdown',
    content: serializeArticleMarkdown({
      title: post.title,
      slug: post.slug,
      subtitle: post.subtitle,
      content: post.content,
      excerpt: post.excerpt,
      ogImage: post.ogImage,
      draft: post.draft,
      visibility: post.visibility,
      toc: post.toc,
      share: post.share,
      giscus: post.giscus,
      search: post.search,
      radio: post.radio,
      video: post.video,
      platform: post.platform,
      minutesRead: post.minutesRead,
      pubDate: post.pubDate,
      updatedAt: post.updatedAt,
      categoryName: post.categoryNamePath,
      categoryPath: post.categoryPath,
      tagNames: post.postTags.map((relation) => relation.tag.name),
    }),
  }
}

function splitBundleFilePages(files: BundleFile[]) {
  const pages: BundleFile[][] = []
  let page: BundleFile[] = []
  let bytes = 2
  for (const file of files) {
    const serializedBytes = utf8Bytes(JSON.stringify(file)) + (page.length ? 1 : 0)
    if (serializedBytes > CONTENT_EXPORT_PAGE_MAX_BYTES) {
      throw new Error(`Export file ${file.path} exceeds the 3.5 MB persisted-page limit.`)
    }
    if (page.length && bytes + serializedBytes > CONTENT_EXPORT_PAGE_MAX_BYTES) {
      pages.push(page)
      page = []
      bytes = 2
    }
    page.push(file)
    bytes += serializedBytes
  }
  if (page.length) pages.push(page)
  return pages
}

export async function writeArticleExportPage(input: {
  bucket: ContentExportBucket
  prefix: string
  manifest: StoredContentExportManifest
  cursor: number
}) {
  const posts = await getPostsWithCategoryPath({
    limit: CONTENT_EXPORT_ARTICLES_PER_ADVANCE,
    offset: input.cursor,
  })
  const files = posts.map(articleBundleFile)
  const pages = splitBundleFilePages(files)
  for (let index = 0; index < pages.length; index += 1) {
    const key = `${input.prefix}/articles/${String(input.cursor).padStart(8, '0')}-${index}.json`
    const content = JSON.stringify(pages[index])
    await input.bucket.put(key, content, {
      httpMetadata: { contentType: 'application/json; charset=utf-8' },
    })
    input.manifest.segments.push({
      storage: 'page',
      key,
      count: pages[index].length,
      embedded: true,
      size: utf8Bytes(content),
      sha256: createHash('sha256').update(content).digest('hex'),
    })
  }
  input.manifest.files += files.length
  input.manifest.embeddedFiles += files.length
  return {
    manifest: input.manifest,
    cursor: input.cursor + posts.length,
    done: posts.length < CONTENT_EXPORT_ARTICLES_PER_ADVANCE,
    written: posts.length,
  }
}

export async function writeResourceTypeExportPart(input: {
  bucket: ContentExportBucket
  prefix: string
  manifest: StoredContentExportManifest
  type: Exclude<ResourceType, 'article'>
  cursor: ContentResourceExportCursor
  source?: ContentSnapshotDataSource
}) {
  const source = input.source ?? databaseContentSnapshotDataSource
  let queries = 0
  if (resourceCursorAtStart(input.cursor.resources)) {
    const total = await source.countResources(input.type)
    queries += 1
    if (!total) return {
      manifest: input.manifest,
      cursor: { ...input.cursor, section: 'done' as const },
      done: true,
      written: false,
      queries,
    }
  }
  const path = `.joruno/resources/${input.type}.json`
  const segment = rawPartsSegment(input.manifest, path, 'data')
  const part = await buildContentResourceExportPart({
    type: input.type,
    cursor: input.cursor,
    source,
    queryBudget: CONTENT_EXPORT_SNAPSHOT_D1_QUERIES_PER_ADVANCE - queries,
  })
  if (!part.content || (!part.done && sameCursor(part.cursor, input.cursor))) {
    throw new Error(`Content resource export for ${input.type} did not make progress.`)
  }
  const key = `${input.prefix}/resources/${input.type}/${String(segment.parts.length).padStart(6, '0')}.json.part`
  await input.bucket.put(key, part.content, {
    httpMetadata: { contentType: 'application/json; charset=utf-8' },
  })
  segment.parts.push({
    key,
    size: part.size,
    sha256: part.sha256,
    escapedSize: part.escapedSize,
    queries: part.queries,
    endCursor: part.cursor,
  })
  segment.escapedSize = (segment.escapedSize ?? 0) + part.escapedSize
  if (part.done) {
    segment.file.size = segment.parts.reduce((total, stored) => total + stored.size, 0)
    input.manifest.files += 1
    input.manifest.embeddedFiles += 1
  }
  return {
    manifest: input.manifest,
    cursor: part.cursor,
    done: part.done,
    written: true,
    queries: queries + part.queries,
  }
}

export async function writeAssetExportPage(input: {
  bucket: ContentExportBucket
  prefix: string
  manifest: StoredContentExportManifest
  cursor: number
}) {
  const rows = await db.select().from(assets)
    .orderBy(asc(assets.id))
    .limit(CONTENT_EXPORT_ASSETS_PER_ADVANCE)
    .offset(input.cursor)
  const files: BundleFile[] = rows.map((asset) => ({
    path: assetBundlePath(asset.key, asset.id),
    kind: 'asset',
    encoding: 'external',
    mediaType: asset.mimeType ?? 'application/octet-stream',
    url: asset.url,
    checksum: asset.checksum,
    size: asset.size,
  }))
  if (files.length) {
    const key = `${input.prefix}/assets/${String(input.cursor).padStart(8, '0')}.json`
    const content = JSON.stringify(files)
    await input.bucket.put(key, content, {
      httpMetadata: { contentType: 'application/json; charset=utf-8' },
    })
    input.manifest.segments.push({
      storage: 'page',
      key,
      count: files.length,
      embedded: false,
      size: utf8Bytes(content),
      sha256: createHash('sha256').update(content).digest('hex'),
    })
  }
  input.manifest.files += files.length
  input.manifest.externalAssets += files.length
  return {
    manifest: input.manifest,
    cursor: input.cursor + rows.length,
    done: rows.length < CONTENT_EXPORT_ASSETS_PER_ADVANCE,
    written: rows.length,
  }
}

export async function inspectContentExport(): Promise<ContentExportInspection> {
  const [resourceCount, articleCount, assetCount, nonArticleTypes] = await Promise.all([
    db.select({ total: count() }).from(resources),
    db.select({ total: count() }).from(resources).where(and(eq(resources.type, 'article'), ne(resources.status, 'archived'))),
    db.select({ total: count() }).from(assets),
    db.select({ type: resources.type, total: count() }).from(resources)
      .where(ne(resources.type, 'article'))
      .groupBy(resources.type),
  ])
  const embeddedFiles = 1 + (articleCount[0]?.total ?? 0) + nonArticleTypes.filter((row) => row.total > 0).length
  const externalAssets = assetCount[0]?.total ?? 0
  return {
    resources: resourceCount[0]?.total ?? 0,
    articles: articleCount[0]?.total ?? 0,
    embeddedFiles,
    externalAssets,
    totalFiles: embeddedFiles + externalAssets,
  }
}

export async function readStoredContentExportManifest(bucket: ContentExportBucket, key: string) {
  const object = await bucket.get(key)
  if (!object) throw new Error('Persisted content export manifest is missing from R2.')
  const parsed: unknown = JSON.parse(await object.text())
  if (!parsed || typeof parsed !== 'object') throw new Error('Persisted content export manifest is invalid.')
  const manifest = parsed as StoredContentExportManifest
  if (manifest.version !== 1 || !Array.isArray(manifest.segments)) {
    throw new Error('Persisted content export manifest is invalid.')
  }
  return manifest
}

export async function writeStoredContentExportManifest(
  bucket: ContentExportBucket,
  key: string,
  manifest: StoredContentExportManifest,
) {
  const body = JSON.stringify(manifest)
  if (utf8Bytes(body) > 1_000_000) throw new Error('Persisted content export manifest exceeds 1 MB.')
  await bucket.put(key, body, { httpMetadata: { contentType: 'application/json; charset=utf-8' } })
}

async function storedObject(bucket: ContentExportBucket, key: string) {
  const object = await bucket.get(key)
  if (!object) throw new Error(`Persisted content export object is missing from R2: ${key}`)
  return object
}

async function* storedRawSegmentBodies(
  bucket: ContentExportBucket,
  segment: StoredRawExportSegment | StoredRawPartsExportSegment,
) {
  if (segment.storage === 'raw') {
    yield (await storedObject(bucket, segment.key)).body
    return
  }
  if (!segment.materialized) {
    throw new Error(`Persisted export raw segment is not materialized: ${segment.file.path}`)
  }
  yield (await storedObject(bucket, segment.materialized.key)).body
}

async function* escapedJsonStringBodies(bodies: AsyncIterable<ReadableStream<Uint8Array>>) {
  const decoder = new TextDecoder()
  for await (const body of bodies) {
    const reader = body.getReader()
    while (true) {
      const chunk = await reader.read()
      if (chunk.done) break
      const text = decoder.decode(chunk.value, { stream: true })
      if (text) yield JSON.stringify(text).slice(1, -1)
    }
  }
  const tail = decoder.decode()
  if (tail) yield JSON.stringify(tail).slice(1, -1)
}

export async function* storedContentBundleChunks(
  bucket: ContentExportBucket,
  manifest: StoredContentExportManifest,
) {
  if (manifest.bundle) {
    const decoder = new TextDecoder()
    for await (const bytes of verifiedStoredObjectChunks(bucket, [manifest.bundle])) {
      const text = decoder.decode(bytes, { stream: true })
      if (text) yield text
    }
    const tail = decoder.decode()
    if (tail) yield tail
    return
  }
  yield `{"schemaVersion":${JSON.stringify(CONTENT_BUNDLE_VERSION)},"generatedAt":${JSON.stringify(manifest.generatedAt)},"source":${JSON.stringify(manifest.source)},"files":[`
  let first = true
  for (const segment of manifest.segments) {
    if (segment.storage === 'page') {
      const object = await storedObject(bucket, segment.key)
      const body = (await object.text()).trim()
      if (!body.startsWith('[') || !body.endsWith(']')) throw new Error(`Invalid persisted export page: ${segment.key}`)
      const entries = body.slice(1, -1)
      if (!entries) continue
      if (!first) yield ','
      first = false
      yield entries
      continue
    }
    if (segment.storage === 'raw-parts'
      && (!segment.file.checksum || typeof segment.file.size !== 'number')) {
      throw new Error(`Persisted export raw segment is incomplete: ${segment.file.path}`)
    }
    if (!first) yield ','
    first = false
    const prefix = JSON.stringify(segment.file).slice(0, -1)
    yield `${prefix},"content":"`
    yield* escapedJsonStringBodies(storedRawSegmentBodies(bucket, segment))
    yield '"}'
  }
  yield ']}\n'
}

export function storedContentBundleStream(bucket: ContentExportBucket, manifest: StoredContentExportManifest) {
  return streamFromChunks(storedContentBundleChunks(bucket, manifest))
}

export async function readStoredSegmentFiles(
  bucket: ContentExportBucket,
  segment: StoredExportSegment,
): Promise<BundleFile[]> {
  if (segment.storage === 'page') {
    const object = await storedObject(bucket, segment.key)
    const parsed: unknown = JSON.parse(await object.text())
    if (!Array.isArray(parsed)) throw new Error(`Invalid persisted export page: ${segment.key}`)
    return parsed as BundleFile[]
  }
  if (segment.storage === 'raw') {
    return [{ ...segment.file, content: await (await storedObject(bucket, segment.key)).text() }]
  }
  if (!segment.materialized) {
    throw new Error(`Persisted export raw segment is not materialized: ${segment.file.path}`)
  }
  const object = await storedObject(bucket, segment.materialized.key)
  const content = await object.text()
  const size = utf8Bytes(content)
  const sha256 = createHash('sha256').update(content).digest('hex')
  if (size !== segment.materialized.size || sha256 !== segment.materialized.sha256) {
    throw new Error(`Persisted content export object is corrupted: ${segment.materialized.key}`)
  }
  return [{ ...segment.file, content }]
}

export async function deleteStoredContentExport(bucket: ContentExportBucket, manifest: StoredContentExportManifest) {
  const keys = new Set<string>()
  for (const segment of manifest.segments) {
    if (segment.storage !== 'raw-parts') {
      keys.add(segment.key)
      continue
    }
    for (const part of segment.parts) keys.add(part.key)
    if (segment.materialized) keys.add(segment.materialized.key)
    for (const key of segment.garbageKeys ?? []) keys.add(key)
    for (const descriptor of segment.compaction?.inputs ?? []) keys.add(descriptor.key)
    for (const descriptor of segment.compaction?.outputs ?? []) keys.add(descriptor.key)
    for (const key of segment.compaction?.garbageKeys ?? []) keys.add(key)
  }
  if (manifest.bundle) keys.add(manifest.bundle.key)
  for (const fragment of manifest.bundleBuild?.fragments ?? []) keys.add(fragment.key)
  for (const descriptor of manifest.bundleBuild?.compaction?.inputs ?? []) keys.add(descriptor.key)
  for (const descriptor of manifest.bundleBuild?.compaction?.outputs ?? []) keys.add(descriptor.key)
  for (const key of manifest.bundleBuild?.compaction?.garbageKeys ?? []) keys.add(key)
  const list = [...keys]
  for (let index = 0; index < list.length; index += 1_000) {
    await bucket.delete(list.slice(index, index + 1_000))
  }
}
