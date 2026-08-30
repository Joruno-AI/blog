import type { BatchItem } from 'drizzle-orm/batch'
import { and, eq, sql } from 'drizzle-orm'

import { db } from '@/lib/db'
import { contentImportCommits, contentImportStaging } from '@/lib/db/schema'
import { assertContentFitsD1 } from '@/modules/resources/domain/types'

import {
  contentImportBaselineKey,
  extractContentSnapshot,
  type ContentImportBaselines,
  type ContentImportPlan,
} from './import-service'
import { contentSnapshotSchema, transferResourceSchema, type ContentSnapshot } from './contract'
import type { SnapshotGroup } from './import-stream'

export const CONTENT_IMPORT_STAGE_RECORDS_PER_PAGE = 20
export const CONTENT_IMPORT_STAGE_MAX_BINDINGS_PER_STATEMENT = 6
export const CONTENT_IMPORT_STAGE_JSON_BYTES_PER_PAGE = 1024 * 1024
export const CONTENT_IMPORT_CUTOVER_STATEMENTS = 29
export const CONTENT_IMPORT_MAX_D1_QUERIES_PER_ADVANCE = 37

export class ContentImportCommitUncertainError extends Error {
  readonly commitUncertain = true

  constructor(cause: unknown) {
    super('Content import cut-over outcome is temporarily unknown; durable reconciliation is required.', { cause })
    this.name = 'ContentImportCommitUncertainError'
  }
}

export type ImportEntityType =
  | 'category'
  | 'category-guard'
  | 'tag'
  | 'tag-guard'
  | 'asset'
  | 'resource'
  | 'revision'
  | 'article'
  | 'document'
  | 'album'
  | 'track'
  | 'collection'
  | 'route'
  | 'category-link'
  | 'tag-link'
  | 'asset-link'
  | 'collection-item'
  | 'relation'
  | 'redirect'
  | 'publication-event'
  | 'setting'

export interface ImportStageRecord {
  entityType: ImportEntityType
  entityKey: string
  payload: Record<string, unknown>
  baselineRevisionId?: string | null
  contentText?: string | null
}

export function contentSnapshotItemRecords(group: SnapshotGroup, value: unknown): ImportStageRecord[] {
  const records: ImportStageRecord[] = []
  const add = (entityType: ImportEntityType, entityKey: string, payload: Record<string, unknown>) => {
    records.push({ entityType, entityKey, payload })
  }

  if (group === 'resources') {
    const row = transferResourceSchema.parse(value)
    const resource = Object.fromEntries(Object.entries(row).filter(([key]) => key !== 'revisions'))
    add('resource', row.id, resource)
    for (const revisionRow of row.revisions) {
      const { content, ...revision } = revisionRow
      assertContentFitsD1(content)
      records.push({
        entityType: 'revision', entityKey: revisionRow.id, contentText: content,
        payload: { ...revision, resourceId: row.id },
      })
    }
    return records
  }

  if (group === 'categories') {
    const row = contentSnapshotSchema.shape.categories.element.parse(value)
    add('category', row.id, row)
  } else if (group === 'tags') {
    const row = contentSnapshotSchema.shape.tags.element.parse(value)
    add('tag', row.id, row)
  } else if (group === 'assets') {
    const row = contentSnapshotSchema.shape.assets.element.parse(value)
    add('asset', row.id, row)
  } else if (group === 'articles') {
    const row = contentSnapshotSchema.shape.articles.element.parse(value)
    add('article', row.resourceId, row)
  } else if (group === 'documents') {
    const row = contentSnapshotSchema.shape.documents.element.parse(value)
    add('document', row.resourceId, row)
  } else if (group === 'albums') {
    const row = contentSnapshotSchema.shape.albums.element.parse(value)
    add('album', row.resourceId, row)
  } else if (group === 'tracks') {
    const row = contentSnapshotSchema.shape.tracks.element.parse(value)
    add('track', row.resourceId, row)
  } else if (group === 'collections') {
    const row = contentSnapshotSchema.shape.collections.element.parse(value)
    add('collection', row.resourceId, row)
  } else if (group === 'routes') {
    const row = contentSnapshotSchema.shape.routes.element.parse(value)
    add('route', row.path, row)
  } else if (group === 'categoryLinks') {
    const row = contentSnapshotSchema.shape.categoryLinks.element.parse(value)
    add('category-link', `${row.resourceId}:${row.categoryId}`, row)
  } else if (group === 'tagLinks') {
    const row = contentSnapshotSchema.shape.tagLinks.element.parse(value)
    add('tag-link', `${row.resourceId}:${row.tagId}`, row)
  } else if (group === 'assetLinks') {
    const row = contentSnapshotSchema.shape.assetLinks.element.parse(value)
    add('asset-link', `${row.resourceId}:${row.assetId}:${row.role}`, row)
  } else if (group === 'collectionItems') {
    const row = contentSnapshotSchema.shape.collectionItems.element.parse(value)
    add('collection-item', `${row.collectionResourceId}:${row.resourceId}`, row)
  } else if (group === 'relations') {
    const row = contentSnapshotSchema.shape.relations.element.parse(value)
    add('relation', `${row.sourceResourceId}:${row.targetResourceId}:${row.relationType}`, row)
  } else if (group === 'redirects') {
    const row = contentSnapshotSchema.shape.redirects.element.parse(value)
    add('redirect', row.fromPath, row)
  } else if (group === 'publicationEvents') {
    const row = contentSnapshotSchema.shape.publicationEvents.element.parse(value)
    add('publication-event', row.id, row)
  } else if (group === 'settings') {
    const row = contentSnapshotSchema.shape.settings.element.parse(value)
    add('setting', row.id, row)
  }
  return records
}

function snapshotRecords(snapshot: ContentSnapshot): ImportStageRecord[] {
  return [
    ...snapshot.resources.flatMap((row) => contentSnapshotItemRecords('resources', row)),
    ...snapshot.categories.flatMap((row) => contentSnapshotItemRecords('categories', row)),
    ...snapshot.tags.flatMap((row) => contentSnapshotItemRecords('tags', row)),
    ...snapshot.assets.flatMap((row) => contentSnapshotItemRecords('assets', row)),
    ...snapshot.articles.flatMap((row) => contentSnapshotItemRecords('articles', row)),
    ...snapshot.documents.flatMap((row) => contentSnapshotItemRecords('documents', row)),
    ...snapshot.albums.flatMap((row) => contentSnapshotItemRecords('albums', row)),
    ...snapshot.tracks.flatMap((row) => contentSnapshotItemRecords('tracks', row)),
    ...snapshot.collections.flatMap((row) => contentSnapshotItemRecords('collections', row)),
    ...snapshot.routes.flatMap((row) => contentSnapshotItemRecords('routes', row)),
    ...snapshot.categoryLinks.flatMap((row) => contentSnapshotItemRecords('categoryLinks', row)),
    ...snapshot.tagLinks.flatMap((row) => contentSnapshotItemRecords('tagLinks', row)),
    ...snapshot.assetLinks.flatMap((row) => contentSnapshotItemRecords('assetLinks', row)),
    ...snapshot.collectionItems.flatMap((row) => contentSnapshotItemRecords('collectionItems', row)),
    ...snapshot.relations.flatMap((row) => contentSnapshotItemRecords('relations', row)),
    ...snapshot.redirects.flatMap((row) => contentSnapshotItemRecords('redirects', row)),
    ...snapshot.publicationEvents.flatMap((row) => contentSnapshotItemRecords('publicationEvents', row)),
    ...snapshot.settings.flatMap((row) => contentSnapshotItemRecords('settings', row)),
  ]
}

export function contentImportStageRecordCount(bundleInput: unknown) {
  return snapshotRecords(extractContentSnapshot(bundleInput).snapshot).length
}

export async function stageImportRecords(
  jobId: string,
  ordinal: number,
  records: readonly ImportStageRecord[],
  leaseToken?: string,
) {
  for (const statement of buildContentImportStageStatements(jobId, ordinal, records, leaseToken)) {
    await db.run(statement)
  }
}

export function buildContentImportStageStatements(
  jobId: string,
  ordinal: number,
  records: readonly ImportStageRecord[],
  leaseToken?: string,
) {
  if (!records.length) return []
  const rows = records.map((record, index) => ({
    jobId,
    entityType: record.entityType,
    entityKey: record.entityKey,
    ordinal: ordinal + index,
    payloadJson: JSON.stringify(record.payload),
    baselineRevisionId: record.baselineRevisionId ?? null,
    createdAt: Math.floor(Date.now() / 1_000),
  }))
  const currentLease = leaseToken
    ? sql`EXISTS (
        SELECT 1 FROM platform_jobs j
        WHERE j.id=${jobId} AND j.status='running'
          AND json_extract(j.output_json, '$.leaseToken')=${leaseToken}
      )`
    : sql`true`
  const statements = [sql`
    INSERT INTO content_import_staging
      (job_id, entity_type, entity_key, ordinal, payload_json, baseline_revision_id, created_at)
    SELECT json_extract(value, '$.jobId'),
      json_extract(value, '$.entityType'),
      json_extract(value, '$.entityKey'),
      cast(json_extract(value, '$.ordinal') AS integer),
      json_extract(value, '$.payloadJson'),
      json_extract(value, '$.baselineRevisionId'),
      cast(json_extract(value, '$.createdAt') AS integer)
    FROM json_each(${JSON.stringify(rows)})
    WHERE ${currentLease}
    ON CONFLICT(job_id, entity_type, entity_key) DO UPDATE SET
      ordinal=excluded.ordinal,
      payload_json=excluded.payload_json,
      baseline_revision_id=excluded.baseline_revision_id
  `]
  for (const record of records) {
    if (record.contentText === undefined) continue
    statements.push(sql`
      UPDATE content_import_staging SET content_text=${record.contentText}
      WHERE job_id=${jobId} AND entity_type=${record.entityType} AND entity_key=${record.entityKey}
        AND ${currentLease}
    `)
  }
  return statements
}

function stagePage(records: readonly ImportStageRecord[], start: number) {
  const page: ImportStageRecord[] = []
  let bytes = 2
  for (const record of records.slice(start, start + CONTENT_IMPORT_STAGE_RECORDS_PER_PAGE)) {
    const lightweight = JSON.stringify({
      entityType: record.entityType,
      entityKey: record.entityKey,
      payloadJson: JSON.stringify(record.payload),
      baselineRevisionId: record.baselineRevisionId ?? null,
    })
    const nextBytes = new TextEncoder().encode(lightweight).byteLength + (page.length ? 1 : 0)
    if (page.length && bytes + nextBytes > CONTENT_IMPORT_STAGE_JSON_BYTES_PER_PAGE) break
    page.push(record)
    bytes += nextBytes
  }
  return page
}

export function contentImportStagePayloadBytes(record: ImportStageRecord) {
  return {
    jsonBytes: new TextEncoder().encode(JSON.stringify(record.payload)).byteLength,
    contentBytes: new TextEncoder().encode(record.contentText ?? '').byteLength,
  }
}

export function emptyContentImportPlan(): ContentImportPlan {
  return {
    resources: { total: 0, create: 0, update: 0 },
    revisions: 0,
    categories: 0,
    tags: 0,
    assets: 0,
    routes: 0,
    relations: 0,
    conflicts: [],
  }
}

export function mergeContentImportPlans(current: ContentImportPlan, delta: ContentImportPlan): ContentImportPlan {
  return {
    resources: {
      total: current.resources.total + delta.resources.total,
      create: current.resources.create + delta.resources.create,
      update: current.resources.update + delta.resources.update,
    },
    revisions: current.revisions + delta.revisions,
    categories: current.categories + delta.categories,
    tags: current.tags + delta.tags,
    assets: current.assets + delta.assets,
    routes: current.routes + delta.routes,
    relations: current.relations + delta.relations,
    conflicts: [...new Set([...current.conflicts, ...delta.conflicts])],
  }
}

function seconds(value: unknown) {
  if (value === null || value === undefined) return null
  const parsed = new Date(String(value))
  return Number.isNaN(parsed.valueOf()) ? null : Math.floor(parsed.valueOf() / 1_000)
}

function sameJson(left: unknown, right: unknown) {
  try {
    const normalizedLeft = typeof left === 'string' ? JSON.stringify(JSON.parse(left)) : JSON.stringify(left)
    const normalizedRight = typeof right === 'string' ? JSON.stringify(JSON.parse(right)) : JSON.stringify(right)
    return normalizedLeft === normalizedRight
  } catch {
    return left === right
  }
}

function hasOwn(value: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(value, key)
}

/**
 * Freezes live CAS baselines and computes one bounded preflight delta. All
 * queries are scoped to the at-most-20 records in the current persisted page;
 * no live table or snapshot is materialized in the Worker.
 */
export async function preflightContentImportRecords(records: ImportStageRecord[]) {
  const delta = emptyContentImportPlan()
  const conflicts: string[] = []
  const resourcesInput = records.filter((record) => record.entityType === 'resource').map((record) => record.payload)
  const revisionsInput = records.filter((record) => record.entityType === 'revision').map((record) => record.payload)
  const categoriesInput = records.filter((record) => record.entityType === 'category').map((record) => record.payload)
  const tagsInput = records.filter((record) => record.entityType === 'tag').map((record) => record.payload)
  const assetsInput = records.filter((record) => record.entityType === 'asset').map((record) => record.payload)
  const routesInput = records.filter((record) => record.entityType === 'route').map((record) => record.payload)
  const redirectsInput = records.filter((record) => record.entityType === 'redirect').map((record) => record.payload)
  const publicationEventsInput = records.filter((record) => record.entityType === 'publication-event').map((record) => record.payload)
  const settingsInput = records.filter((record) => record.entityType === 'setting').map((record) => record.payload)
  const referencedUserIds = [...new Set(records.flatMap((record) => {
    const field = record.entityType === 'resource' ? 'authorId'
      : record.entityType === 'revision' ? 'createdBy'
        : record.entityType === 'publication-event' ? 'actorId'
          : null
    if (!field || !hasOwn(record.payload, field) || typeof record.payload[field] !== 'string') return []
    return [record.payload[field] as string]
  }))]

  type ResourceRow = {
    id: string; type: string; title: string; slug: string; path: string; description: string | null
    status: string; visibility: string; coverAssetId: string | null; currentRevisionId: string | null
    publishedRevisionId: string | null; publishedAt: number | null; scheduledAt: number | null
    authorId: string | null; createdAt: number; updatedAt: number; sourceHash: string | null
  }
  type CategoryRow = {
    id: string; name: string; slug: string; description: string | null
    parentId: string | null; sortOrder: number; createdAt: number
  }
  type RevisionRow = {
    id: string; resourceId: string; version: number; title: string; slug: string; path: string
    description: string | null; visibility: string; content: string; contentFormat: string
    metadataJson: string; sourceHash: string | null; changeSummary: string | null
    createdBy: string | null; createdAt: number
  }
  type TagRow = { id: string; name: string; slug: string; createdAt: number }
  type AssetRow = {
    id: string; key: string; url: string; name: string; mediaType: string; mimeType: string | null; size: number
    width: number | null; height: number | null; durationSeconds: number | null; checksum: string | null
    metadataJson: string; createdAt: number; updatedAt: number
  }
  type RouteRow = { path: string; resourceId: string; canonical: number; createdAt: number }
  type RedirectRow = { fromPath: string; toPath: string; statusCode: number; createdAt: number }
  type PublicationEventRow = {
    id: string; resourceId: string; revisionId: string | null; eventType: string
    actorId: string | null; dataJson: string; createdAt: number
  }
  type SettingRow = { id: string; key: string; value: string | null; createdAt: number; updatedAt: number }
  type UserRow = { id: string }

  const [
    resourceRows, revisionRows, categoryRows, tagRows, assetRows, routeRows,
    redirectRows, publicationEventRows, settingRows, userRows,
  ] = await Promise.all([
    resourcesInput.length ? db.all<ResourceRow>(sql`
      SELECT r.id, r.type, r.title, r.slug, r.path, r.description, r.status, r.visibility,
             r.cover_asset_id AS coverAssetId, r.current_revision_id AS currentRevisionId,
             r.published_revision_id AS publishedRevisionId, r.published_at AS publishedAt,
             r.scheduled_at AS scheduledAt, r.author_id AS authorId, r.created_at AS createdAt,
             r.updated_at AS updatedAt,
             rr.source_hash AS sourceHash
      FROM resources r
      LEFT JOIN resource_revisions rr ON rr.id=r.current_revision_id
      WHERE r.id IN (SELECT json_extract(value, '$.id') FROM json_each(${JSON.stringify(resourcesInput)}))
         OR r.path IN (SELECT json_extract(value, '$.path') FROM json_each(${JSON.stringify(resourcesInput)}))
         OR EXISTS (
           SELECT 1 FROM json_each(${JSON.stringify(resourcesInput)}) requested
           WHERE r.type=json_extract(requested.value, '$.type') AND r.slug=json_extract(requested.value, '$.slug')
         )
    `) : Promise.resolve([]),
    revisionsInput.length ? db.all<RevisionRow>(sql`
      SELECT id, resource_id AS resourceId, version, title, slug, path, description, visibility,
             content, content_format AS contentFormat, metadata_json AS metadataJson,
             source_hash AS sourceHash, change_summary AS changeSummary,
             created_by AS createdBy, created_at AS createdAt
      FROM resource_revisions
      WHERE id IN (SELECT json_extract(value, '$.id') FROM json_each(${JSON.stringify(revisionsInput)}))
    `) : Promise.resolve([]),
    categoriesInput.length ? db.all<CategoryRow>(sql`
      SELECT id, name, slug, description, parent_id AS parentId, "order" AS sortOrder,
             created_at AS createdAt FROM categories
      WHERE id IN (SELECT json_extract(value, '$.id') FROM json_each(${JSON.stringify(categoriesInput)}))
         OR name IN (SELECT json_extract(value, '$.name') FROM json_each(${JSON.stringify(categoriesInput)}))
         OR slug IN (SELECT json_extract(value, '$.slug') FROM json_each(${JSON.stringify(categoriesInput)}))
    `) : Promise.resolve([]),
    tagsInput.length ? db.all<TagRow>(sql`
      SELECT id, name, slug, created_at AS createdAt FROM tags
      WHERE id IN (SELECT json_extract(value, '$.id') FROM json_each(${JSON.stringify(tagsInput)}))
         OR name IN (SELECT json_extract(value, '$.name') FROM json_each(${JSON.stringify(tagsInput)}))
         OR slug IN (SELECT json_extract(value, '$.slug') FROM json_each(${JSON.stringify(tagsInput)}))
    `) : Promise.resolve([]),
    assetsInput.length ? db.all<AssetRow>(sql`
      SELECT id, key, url, name, media_type AS mediaType, mime_type AS mimeType, size, width, height,
             duration_seconds AS durationSeconds, checksum, metadata_json AS metadataJson,
             created_at AS createdAt, updated_at AS updatedAt
      FROM assets
      WHERE id IN (SELECT json_extract(value, '$.id') FROM json_each(${JSON.stringify(assetsInput)}))
         OR key IN (SELECT json_extract(value, '$.key') FROM json_each(${JSON.stringify(assetsInput)}))
    `) : Promise.resolve([]),
    routesInput.length ? db.all<RouteRow>(sql`
      SELECT path, resource_id AS resourceId, canonical, created_at AS createdAt FROM resource_routes
      WHERE path IN (SELECT json_extract(value, '$.path') FROM json_each(${JSON.stringify(routesInput)}))
    `) : Promise.resolve([]),
    redirectsInput.length ? db.all<RedirectRow>(sql`
      SELECT from_path AS fromPath, to_path AS toPath, status_code AS statusCode, created_at AS createdAt FROM redirects
      WHERE from_path IN (SELECT json_extract(value, '$.fromPath') FROM json_each(${JSON.stringify(redirectsInput)}))
    `) : Promise.resolve([]),
    publicationEventsInput.length ? db.all<PublicationEventRow>(sql`
      SELECT id, resource_id AS resourceId, revision_id AS revisionId, event_type AS eventType,
             actor_id AS actorId, data_json AS dataJson, created_at AS createdAt
      FROM publication_events
      WHERE id IN (SELECT json_extract(value, '$.id') FROM json_each(${JSON.stringify(publicationEventsInput)}))
    `) : Promise.resolve([]),
    settingsInput.length ? db.all<SettingRow>(sql`
      SELECT id, key, value, created_at AS createdAt, updated_at AS updatedAt FROM settings
      WHERE id IN (SELECT json_extract(value, '$.id') FROM json_each(${JSON.stringify(settingsInput)}))
    `) : Promise.resolve([]),
    referencedUserIds.length ? db.all<UserRow>(sql`
      SELECT id FROM user
      WHERE id IN (SELECT value FROM json_each(${JSON.stringify(referencedUserIds)}))
    `) : Promise.resolve([]),
  ])

  const revisionHash = new Map(records.filter((record) => record.entityType === 'revision')
    .map((record) => [String(record.payload.id), record.payload.sourceHash ?? null]))

  for (const record of records) {
    const incoming = record.payload
    if (record.entityType === 'resource') {
      delta.resources.total += 1
      const id = String(incoming.id)
      const existing = resourceRows.find((row) => row.id === id)
      if (existing) delta.resources.update += 1
      else delta.resources.create += 1
      const pathOwner = resourceRows.find((row) => row.path === incoming.path)
      if (pathOwner && pathOwner.id !== id) conflicts.push(`Resource path ${String(incoming.path)} belongs to ${pathOwner.id}.`)
      const slugOwner = resourceRows.find((row) => row.type === incoming.type && row.slug === incoming.slug)
      if (slugOwner && slugOwner.id !== id) conflicts.push(`${String(incoming.type)} slug ${String(incoming.slug)} belongs to ${slugOwner.id}.`)
      record.baselineRevisionId = existing ? JSON.stringify({
        type: existing.type, title: existing.title, slug: existing.slug, path: existing.path,
        description: existing.description, status: existing.status, visibility: existing.visibility,
        coverAssetId: existing.coverAssetId, currentRevisionId: existing.currentRevisionId,
        publishedRevisionId: existing.publishedRevisionId, publishedAt: existing.publishedAt,
        scheduledAt: existing.scheduledAt, authorId: existing.authorId,
        createdAt: existing.createdAt, updatedAt: existing.updatedAt,
      }) : null
      if (existing && (
        existing.currentRevisionId !== incoming.currentRevisionId
        || existing.sourceHash !== (revisionHash.get(String(incoming.currentRevisionId)) ?? null)
        || existing.createdAt !== seconds(incoming.createdAt)
        || existing.updatedAt !== seconds(incoming.updatedAt)
        || existing.type !== incoming.type || existing.title !== incoming.title || existing.slug !== incoming.slug
        || existing.path !== incoming.path || existing.description !== incoming.description
        || existing.status !== incoming.status || existing.visibility !== incoming.visibility
        || existing.coverAssetId !== incoming.coverAssetId
        || existing.publishedRevisionId !== incoming.publishedRevisionId
        || existing.publishedAt !== seconds(incoming.publishedAt)
        || existing.scheduledAt !== seconds(incoming.scheduledAt)
        || (hasOwn(incoming, 'authorId') && existing.authorId !== incoming.authorId)
      )) conflicts.push(`Resource ${id} changed after the source snapshot was created.`)
      if (typeof incoming.authorId === 'string' && !userRows.some((row) => row.id === incoming.authorId)) {
        conflicts.push(`Resource ${id} references missing author ${incoming.authorId}.`)
      }
    } else if (record.entityType === 'revision') {
      const id = String(incoming.id)
      const existing = revisionRows.find((row) => row.id === id)
      record.baselineRevisionId = existing ? JSON.stringify({
        resourceId: existing.resourceId, createdBy: existing.createdBy,
      }) : null
      if (existing && existing.resourceId !== incoming.resourceId) {
        conflicts.push(`Revision ${id} belongs to ${existing.resourceId}.`)
      } else if (existing && (
        existing.version !== incoming.version || existing.title !== incoming.title || existing.slug !== incoming.slug
        || existing.path !== incoming.path || existing.description !== incoming.description
        || existing.visibility !== incoming.visibility || existing.content !== record.contentText
        || existing.contentFormat !== incoming.contentFormat || !sameJson(existing.metadataJson, incoming.metadata)
        || existing.sourceHash !== incoming.sourceHash || existing.changeSummary !== incoming.changeSummary
        || (hasOwn(incoming, 'createdBy') && existing.createdBy !== incoming.createdBy)
        || existing.createdAt !== seconds(incoming.createdAt)
      )) {
        conflicts.push(`Revision ${id} changed after the source snapshot was created.`)
      }
      if (typeof incoming.createdBy === 'string' && !userRows.some((row) => row.id === incoming.createdBy)) {
        conflicts.push(`Revision ${id} references missing creator ${incoming.createdBy}.`)
      }
    } else if (record.entityType === 'category') {
      delta.categories += 1
      const id = String(incoming.id)
      const existing = categoryRows.find((row) => row.id === id)
      const nameOwner = categoryRows.find((row) => row.name === incoming.name)
      const slugOwner = categoryRows.find((row) => row.slug === incoming.slug)
      if (nameOwner && nameOwner.id !== id) conflicts.push(`Category name ${String(incoming.name)} belongs to ${nameOwner.id}.`)
      if (slugOwner && slugOwner.id !== id) conflicts.push(`Category slug ${String(incoming.slug)} belongs to ${slugOwner.id}.`)
      record.baselineRevisionId = existing ? JSON.stringify({
        name: existing.name, slug: existing.slug, description: existing.description,
        parentId: existing.parentId, order: existing.sortOrder, createdAt: existing.createdAt,
      }) : null
      if (existing && (existing.name !== incoming.name || existing.slug !== incoming.slug
        || existing.description !== incoming.description || existing.parentId !== incoming.parentId
        || existing.sortOrder !== incoming.order || existing.createdAt !== seconds(incoming.createdAt))) {
        conflicts.push(`Category ${id} changed after the source snapshot was created.`)
      }
    } else if (record.entityType === 'tag') {
      delta.tags += 1
      const id = String(incoming.id)
      const existing = tagRows.find((row) => row.id === id)
      const nameOwner = tagRows.find((row) => row.name === incoming.name)
      const slugOwner = tagRows.find((row) => row.slug === incoming.slug)
      if (nameOwner && nameOwner.id !== id) conflicts.push(`Tag name ${String(incoming.name)} belongs to ${nameOwner.id}.`)
      if (slugOwner && slugOwner.id !== id) conflicts.push(`Tag slug ${String(incoming.slug)} belongs to ${slugOwner.id}.`)
      record.baselineRevisionId = existing ? JSON.stringify({
        name: existing.name, slug: existing.slug, createdAt: existing.createdAt,
      }) : null
      if (existing && (existing.name !== incoming.name || existing.slug !== incoming.slug
        || existing.createdAt !== seconds(incoming.createdAt))) {
        conflicts.push(`Tag ${id} changed after the source snapshot was created.`)
      }
    } else if (record.entityType === 'asset') {
      delta.assets += 1
      const id = String(incoming.id)
      const existing = assetRows.find((row) => row.id === id)
      const keyOwner = assetRows.find((row) => row.key === incoming.key)
      if (keyOwner && keyOwner.id !== id) conflicts.push(`Asset key ${String(incoming.key)} belongs to ${keyOwner.id}.`)
      record.baselineRevisionId = existing ? JSON.stringify({
        key: existing.key, url: existing.url, name: existing.name, mediaType: existing.mediaType,
        mimeType: existing.mimeType, size: existing.size, width: existing.width, height: existing.height,
        durationSeconds: existing.durationSeconds, checksum: existing.checksum,
        metadataJson: existing.metadataJson, createdAt: existing.createdAt, updatedAt: existing.updatedAt,
      }) : null
      if (existing && (existing.createdAt !== seconds(incoming.createdAt)
        || existing.updatedAt !== seconds(incoming.updatedAt)
        || existing.key !== incoming.key || existing.url !== incoming.url || existing.name !== incoming.name
        || existing.mediaType !== incoming.mediaType || existing.mimeType !== incoming.mimeType
        || existing.size !== incoming.size || existing.width !== incoming.width || existing.height !== incoming.height
        || existing.durationSeconds !== incoming.durationSeconds || existing.checksum !== incoming.checksum
        || !sameJson(existing.metadataJson, incoming.metadata))) {
        conflicts.push(`Asset ${id} changed after the source snapshot was created.`)
      }
    } else if (record.entityType === 'route') {
      delta.routes += 1
      const path = String(incoming.path)
      const existing = routeRows.find((row) => row.path === path)
      record.baselineRevisionId = existing ? JSON.stringify({
        resourceId: existing.resourceId, canonical: existing.canonical, createdAt: existing.createdAt,
      }) : null
      if (existing && (existing.resourceId !== incoming.resourceId || Boolean(existing.canonical) !== incoming.canonical
        || existing.createdAt !== seconds(incoming.createdAt))) {
        conflicts.push(`Route ${path} belongs to ${existing.resourceId}.`)
      }
    } else if (record.entityType === 'redirect') {
      const path = String(incoming.fromPath)
      const existing = redirectRows.find((row) => row.fromPath === path)
      record.baselineRevisionId = existing ? JSON.stringify({
        toPath: existing.toPath, statusCode: existing.statusCode, createdAt: existing.createdAt,
      }) : null
      if (existing && (existing.toPath !== incoming.toPath || existing.statusCode !== incoming.statusCode)) {
        conflicts.push(`Redirect ${path} changed after the source snapshot was created.`)
      } else if (existing && hasOwn(incoming, 'createdAt') && existing.createdAt !== seconds(incoming.createdAt)) {
        conflicts.push(`Redirect ${path} changed after the source snapshot was created.`)
      }
    } else if (record.entityType === 'publication-event') {
      const id = String(incoming.id)
      const existing = publicationEventRows.find((row) => row.id === id)
      record.baselineRevisionId = existing ? JSON.stringify({
        resourceId: existing.resourceId, revisionId: existing.revisionId,
        eventType: existing.eventType, actorId: existing.actorId,
        dataJson: existing.dataJson, createdAt: existing.createdAt,
      }) : null
      if (existing && (
        existing.resourceId !== incoming.resourceId || existing.revisionId !== incoming.revisionId
        || existing.eventType !== incoming.eventType || !sameJson(existing.dataJson, incoming.data)
        || (hasOwn(incoming, 'actorId') && existing.actorId !== incoming.actorId)
        || existing.createdAt !== seconds(incoming.createdAt)
      )) {
        conflicts.push(`Publication event ${id} changed after the source snapshot was created.`)
      }
      if (typeof incoming.actorId === 'string' && !userRows.some((row) => row.id === incoming.actorId)) {
        conflicts.push(`Publication event ${id} references missing actor ${incoming.actorId}.`)
      }
    } else if (record.entityType === 'setting') {
      const id = String(incoming.id)
      const existing = settingRows.find((row) => row.id === id)
      record.baselineRevisionId = existing ? JSON.stringify({
        key: existing.key, value: existing.value, createdAt: existing.createdAt, updatedAt: existing.updatedAt,
      }) : null
      if (existing && (existing.createdAt !== seconds(incoming.createdAt)
        || existing.updatedAt !== seconds(incoming.updatedAt))) {
        conflicts.push(`Setting ${id} changed after the source snapshot was created.`)
      }
    }
  }
  delta.revisions = records.filter((record) => record.entityType === 'revision').length
  delta.relations = records.filter((record) => [
    'category-link', 'tag-link', 'asset-link', 'collection-item', 'relation',
  ].includes(record.entityType)).length
  delta.conflicts = [...new Set(conflicts)]
  return { records, plan: delta }
}

/** Stages one snapshot page and freezes the live revision IDs used by cut-over. */
export async function stageContentImportPage(
  bundleInput: unknown,
  jobId: string,
  cursor: number,
  baselines: ContentImportBaselines,
  leaseToken?: string,
) {
  const { snapshot } = extractContentSnapshot(bundleInput)
  const records = snapshotRecords(snapshot)
  const start = Math.min(Math.max(cursor, 0), records.length)
  const page = stagePage(records, start)
  const guardedTypes = new Set<ImportEntityType>(['resource', 'category', 'tag', 'asset', 'route', 'redirect', 'setting'])
  for (const record of page) {
    if (!guardedTypes.has(record.entityType)) continue
    const key = contentImportBaselineKey(record.entityType, record.entityKey)
    if (!Object.prototype.hasOwnProperty.call(baselines, key)) {
      throw new Error(`Import baseline is missing for ${key}.`)
    }
    record.baselineRevisionId = baselines[key]
  }
  await stageImportRecords(jobId, start, page, leaseToken)
  const nextCursor = start + page.length
  return { cursor: nextCursor, total: records.length, done: nextCursor >= records.length }
}

function guarded(statement: ReturnType<typeof sql>) {
  return statement as unknown as BatchItem<'sqlite'>
}

export function buildContentImportCutoverStatements(jobId: string) {
  const hasCommit = sql`EXISTS (SELECT 1 FROM content_import_commits c WHERE c.job_id = ${jobId})`
  const statements: BatchItem<'sqlite'>[] = [
    guarded(sql`
      INSERT INTO content_import_commits (job_id, committed_at)
      SELECT ${jobId}, ${Math.floor(Date.now() / 1_000)}
      WHERE NOT EXISTS (
        SELECT 1
        FROM content_import_staging s
        LEFT JOIN resources r ON r.id = json_extract(s.payload_json, '$.id')
        WHERE s.job_id = ${jobId} AND s.entity_type = 'resource'
          AND (
            (s.baseline_revision_id IS NULL AND r.id IS NOT NULL)
            OR (s.baseline_revision_id IS NOT NULL AND (
              r.id IS NULL
              OR r.current_revision_id IS NOT json_extract(s.baseline_revision_id, '$.currentRevisionId')
              OR r.updated_at IS NOT json_extract(s.baseline_revision_id, '$.updatedAt')
              OR (json_type(s.baseline_revision_id, '$.type') IS NOT NULL AND (
                r.type IS NOT json_extract(s.baseline_revision_id, '$.type')
                OR r.title IS NOT json_extract(s.baseline_revision_id, '$.title')
                OR r.slug IS NOT json_extract(s.baseline_revision_id, '$.slug')
                OR r.path IS NOT json_extract(s.baseline_revision_id, '$.path')
                OR r.description IS NOT json_extract(s.baseline_revision_id, '$.description')
                OR r.status IS NOT json_extract(s.baseline_revision_id, '$.status')
                OR r.visibility IS NOT json_extract(s.baseline_revision_id, '$.visibility')
                OR r.cover_asset_id IS NOT json_extract(s.baseline_revision_id, '$.coverAssetId')
                OR r.published_revision_id IS NOT json_extract(s.baseline_revision_id, '$.publishedRevisionId')
                OR r.published_at IS NOT json_extract(s.baseline_revision_id, '$.publishedAt')
                OR r.scheduled_at IS NOT json_extract(s.baseline_revision_id, '$.scheduledAt')
                OR (json_type(s.baseline_revision_id, '$.authorId') IS NOT NULL
                    AND r.author_id IS NOT json_extract(s.baseline_revision_id, '$.authorId'))
                OR (json_type(s.baseline_revision_id, '$.createdAt') IS NOT NULL
                    AND r.created_at IS NOT json_extract(s.baseline_revision_id, '$.createdAt'))
                OR (coalesce(json_extract(s.payload_json, '$.importMode'), 'snapshot') <> 'legacy'
                    AND r.created_at IS NOT cast(unixepoch(json_extract(s.payload_json, '$.createdAt')) AS integer))
              ))
            ))
          )
      )
      AND NOT EXISTS (
        SELECT 1
        FROM content_import_staging s
        LEFT JOIN resource_revisions rr ON rr.id = json_extract(s.payload_json, '$.id')
        WHERE s.job_id = ${jobId} AND s.entity_type = 'revision'
          AND (
            (s.baseline_revision_id IS NULL AND rr.id IS NOT NULL)
            OR (s.baseline_revision_id IS NOT NULL AND (
              rr.id IS NULL
              OR rr.resource_id IS NOT json_extract(s.payload_json, '$.resourceId')
              OR rr.resource_id IS NOT json_extract(s.baseline_revision_id, '$.resourceId')
              OR rr.version IS NOT cast(json_extract(s.payload_json, '$.version') AS integer)
              OR rr.title IS NOT json_extract(s.payload_json, '$.title')
              OR rr.slug IS NOT json_extract(s.payload_json, '$.slug')
              OR rr.path IS NOT json_extract(s.payload_json, '$.path')
              OR rr.description IS NOT json_extract(s.payload_json, '$.description')
              OR rr.visibility IS NOT json_extract(s.payload_json, '$.visibility')
              OR rr.content IS NOT s.content_text
              OR rr.content_format IS NOT json_extract(s.payload_json, '$.contentFormat')
              OR rr.metadata_json IS NOT json(json_extract(s.payload_json, '$.metadata'))
              OR rr.source_hash IS NOT json_extract(s.payload_json, '$.sourceHash')
              OR rr.change_summary IS NOT json_extract(s.payload_json, '$.changeSummary')
              OR (json_type(s.baseline_revision_id, '$.createdBy') IS NOT NULL
                  AND rr.created_by IS NOT json_extract(s.baseline_revision_id, '$.createdBy'))
              OR (json_type(s.payload_json, '$.createdBy') IS NOT NULL
                  AND rr.created_by IS NOT json_extract(s.payload_json, '$.createdBy'))
              OR rr.created_at IS NOT cast(unixepoch(json_extract(s.payload_json, '$.createdAt')) AS integer)
            ))
          )
      )
      AND NOT EXISTS (
        SELECT 1 FROM content_import_staging s
        LEFT JOIN categories c ON c.id=json_extract(s.payload_json, '$.id')
        WHERE s.job_id=${jobId} AND s.entity_type IN ('category', 'category-guard') AND (
          (s.baseline_revision_id IS NULL AND c.id IS NOT NULL)
          OR (s.baseline_revision_id IS NOT NULL AND (
            c.id IS NULL OR c.name IS NOT json_extract(s.baseline_revision_id, '$.name')
            OR c.slug IS NOT json_extract(s.baseline_revision_id, '$.slug')
            OR c.description IS NOT json_extract(s.baseline_revision_id, '$.description')
            OR c.parent_id IS NOT json_extract(s.baseline_revision_id, '$.parentId')
            OR c."order" IS NOT json_extract(s.baseline_revision_id, '$.order')
            OR (json_type(s.baseline_revision_id, '$.createdAt') IS NOT NULL
                AND c.created_at IS NOT json_extract(s.baseline_revision_id, '$.createdAt'))
            OR (s.entity_type='category'
                AND c.created_at IS NOT cast(unixepoch(json_extract(s.payload_json, '$.createdAt')) AS integer))
          ))
        )
      )
      AND NOT EXISTS (
        SELECT 1 FROM content_import_staging s
        LEFT JOIN tags t ON t.id=json_extract(s.payload_json, '$.id')
        WHERE s.job_id=${jobId} AND s.entity_type IN ('tag', 'tag-guard') AND (
          (s.baseline_revision_id IS NULL AND t.id IS NOT NULL)
          OR (s.baseline_revision_id IS NOT NULL AND (
            t.id IS NULL OR t.name IS NOT json_extract(s.baseline_revision_id, '$.name')
            OR t.slug IS NOT json_extract(s.baseline_revision_id, '$.slug')
            OR (json_type(s.baseline_revision_id, '$.createdAt') IS NOT NULL
                AND t.created_at IS NOT json_extract(s.baseline_revision_id, '$.createdAt'))
            OR (s.entity_type='tag'
                AND t.created_at IS NOT cast(unixepoch(json_extract(s.payload_json, '$.createdAt')) AS integer))
          ))
        )
      )
      AND NOT EXISTS (
        SELECT 1 FROM content_import_staging s
        LEFT JOIN assets a ON a.id=json_extract(s.payload_json, '$.id')
        WHERE s.job_id=${jobId} AND s.entity_type='asset' AND (
          (s.baseline_revision_id IS NULL AND a.id IS NOT NULL)
          OR (s.baseline_revision_id IS NOT NULL AND (
            a.id IS NULL OR a.key IS NOT json_extract(s.baseline_revision_id, '$.key')
            OR a.url IS NOT json_extract(s.baseline_revision_id, '$.url')
            OR a.updated_at IS NOT json_extract(s.baseline_revision_id, '$.updatedAt')
            OR (json_type(s.baseline_revision_id, '$.name') IS NOT NULL AND (
              a.name IS NOT json_extract(s.baseline_revision_id, '$.name')
              OR a.media_type IS NOT json_extract(s.baseline_revision_id, '$.mediaType')
              OR a.mime_type IS NOT json_extract(s.baseline_revision_id, '$.mimeType')
              OR a.size IS NOT json_extract(s.baseline_revision_id, '$.size')
              OR a.width IS NOT json_extract(s.baseline_revision_id, '$.width')
              OR a.height IS NOT json_extract(s.baseline_revision_id, '$.height')
              OR a.duration_seconds IS NOT json_extract(s.baseline_revision_id, '$.durationSeconds')
              OR a.checksum IS NOT json_extract(s.baseline_revision_id, '$.checksum')
              OR a.metadata_json IS NOT json_extract(s.baseline_revision_id, '$.metadataJson')
              OR (json_type(s.baseline_revision_id, '$.createdAt') IS NOT NULL
                  AND a.created_at IS NOT json_extract(s.baseline_revision_id, '$.createdAt'))
              OR (coalesce(json_extract(s.payload_json, '$.importMode'), 'snapshot') <> 'legacy'
                  AND a.created_at IS NOT cast(unixepoch(json_extract(s.payload_json, '$.createdAt')) AS integer))
            ))
          ))
        )
      )
      AND NOT EXISTS (
        SELECT 1 FROM content_import_staging s
        LEFT JOIN resource_routes rr ON rr.path=json_extract(s.payload_json, '$.path')
        WHERE s.job_id=${jobId} AND s.entity_type='route' AND (
          (s.baseline_revision_id IS NULL AND rr.path IS NOT NULL)
          OR (s.baseline_revision_id IS NOT NULL AND (
            rr.path IS NULL OR rr.resource_id IS NOT json_extract(s.baseline_revision_id, '$.resourceId')
            OR rr.canonical IS NOT json_extract(s.baseline_revision_id, '$.canonical')
            OR (json_type(s.baseline_revision_id, '$.createdAt') IS NOT NULL
                AND rr.created_at IS NOT json_extract(s.baseline_revision_id, '$.createdAt'))
            OR (coalesce(json_extract(s.payload_json, '$.importMode'), 'snapshot') <> 'legacy'
                AND rr.created_at IS NOT cast(unixepoch(json_extract(s.payload_json, '$.createdAt')) AS integer))
          ))
        )
      )
      AND NOT EXISTS (
        SELECT 1 FROM content_import_staging s
        LEFT JOIN redirects d ON d.from_path=json_extract(s.payload_json, '$.fromPath')
        WHERE s.job_id=${jobId} AND s.entity_type='redirect' AND (
          (s.baseline_revision_id IS NULL AND d.from_path IS NOT NULL)
          OR (s.baseline_revision_id IS NOT NULL AND (
            d.from_path IS NULL OR d.to_path IS NOT json_extract(s.baseline_revision_id, '$.toPath')
            OR d.status_code IS NOT json_extract(s.baseline_revision_id, '$.statusCode')
            OR (json_type(s.baseline_revision_id, '$.createdAt') IS NOT NULL
                AND d.created_at IS NOT json_extract(s.baseline_revision_id, '$.createdAt'))
          ))
        )
      )
      AND NOT EXISTS (
        SELECT 1 FROM content_import_staging s
        LEFT JOIN settings st ON st.id=json_extract(s.payload_json, '$.id')
        WHERE s.job_id=${jobId} AND s.entity_type='setting' AND (
          (s.baseline_revision_id IS NULL AND st.id IS NOT NULL)
          OR (s.baseline_revision_id IS NOT NULL AND (
            st.id IS NULL OR st.key IS NOT json_extract(s.baseline_revision_id, '$.key')
            OR st.value IS NOT json_extract(s.baseline_revision_id, '$.value')
            OR (json_type(s.baseline_revision_id, '$.createdAt') IS NOT NULL
                AND st.created_at IS NOT json_extract(s.baseline_revision_id, '$.createdAt'))
            OR st.created_at IS NOT cast(unixepoch(json_extract(s.payload_json, '$.createdAt')) AS integer)
            OR st.updated_at IS NOT json_extract(s.baseline_revision_id, '$.updatedAt')
          ))
        )
      )
      AND NOT EXISTS (
        SELECT 1 FROM content_import_staging s
        LEFT JOIN publication_events pe ON pe.id=json_extract(s.payload_json, '$.id')
        WHERE s.job_id=${jobId} AND s.entity_type='publication-event' AND (
          (s.baseline_revision_id IS NULL AND pe.id IS NOT NULL)
          OR (s.baseline_revision_id IS NOT NULL AND (
            pe.id IS NULL
            OR pe.resource_id IS NOT json_extract(s.baseline_revision_id, '$.resourceId')
            OR pe.revision_id IS NOT json_extract(s.baseline_revision_id, '$.revisionId')
            OR pe.event_type IS NOT json_extract(s.baseline_revision_id, '$.eventType')
            OR (json_type(s.baseline_revision_id, '$.actorId') IS NOT NULL
                AND pe.actor_id IS NOT json_extract(s.baseline_revision_id, '$.actorId'))
            OR pe.data_json IS NOT json_extract(s.baseline_revision_id, '$.dataJson')
            OR pe.created_at IS NOT json_extract(s.baseline_revision_id, '$.createdAt')
            OR pe.resource_id IS NOT json_extract(s.payload_json, '$.resourceId')
            OR pe.revision_id IS NOT json_extract(s.payload_json, '$.revisionId')
            OR pe.event_type IS NOT json_extract(s.payload_json, '$.eventType')
            OR (json_type(s.payload_json, '$.actorId') IS NOT NULL
                AND pe.actor_id IS NOT json_extract(s.payload_json, '$.actorId'))
            OR pe.data_json IS NOT json(json_extract(s.payload_json, '$.data'))
            OR pe.created_at IS NOT cast(unixepoch(json_extract(s.payload_json, '$.createdAt')) AS integer)
          ))
        )
      )
      AND NOT EXISTS (
        SELECT 1 FROM content_import_staging s
        LEFT JOIN user u ON u.id=CASE s.entity_type
          WHEN 'resource' THEN json_extract(s.payload_json, '$.authorId')
          WHEN 'revision' THEN json_extract(s.payload_json, '$.createdBy')
          WHEN 'publication-event' THEN json_extract(s.payload_json, '$.actorId')
        END
        WHERE s.job_id=${jobId} AND (
          (s.entity_type='resource' AND json_type(s.payload_json, '$.authorId')='text')
          OR (s.entity_type='revision' AND json_type(s.payload_json, '$.createdBy')='text')
          OR (s.entity_type='publication-event' AND json_type(s.payload_json, '$.actorId')='text')
        ) AND u.id IS NULL
      )
      AND NOT EXISTS (
        SELECT 1 FROM content_import_staging s
        JOIN resources r
          ON (r.path = json_extract(s.payload_json, '$.path')
              OR (r.type = json_extract(s.payload_json, '$.type') AND r.slug = json_extract(s.payload_json, '$.slug')))
         AND r.id <> json_extract(s.payload_json, '$.id')
        WHERE s.job_id = ${jobId} AND s.entity_type = 'resource'
      )
      AND NOT EXISTS (
        SELECT 1 FROM content_import_staging s
        JOIN categories c
          ON (c.name = json_extract(s.payload_json, '$.name') OR c.slug = json_extract(s.payload_json, '$.slug'))
         AND c.id <> json_extract(s.payload_json, '$.id')
        WHERE s.job_id = ${jobId} AND s.entity_type = 'category'
      )
      AND NOT EXISTS (
        SELECT 1 FROM content_import_staging s
        JOIN tags t
          ON (t.name = json_extract(s.payload_json, '$.name') OR t.slug = json_extract(s.payload_json, '$.slug'))
         AND t.id <> json_extract(s.payload_json, '$.id')
        WHERE s.job_id = ${jobId} AND s.entity_type = 'tag'
      )
      AND NOT EXISTS (
        SELECT 1 FROM content_import_staging s
        JOIN assets a ON a.key = json_extract(s.payload_json, '$.key')
                     AND a.id <> json_extract(s.payload_json, '$.id')
        WHERE s.job_id = ${jobId} AND s.entity_type = 'asset'
      )
      AND NOT EXISTS (
        SELECT 1 FROM content_import_staging s
        JOIN resource_routes rr ON rr.path = json_extract(s.payload_json, '$.path')
                               AND rr.resource_id <> json_extract(s.payload_json, '$.resourceId')
        WHERE s.job_id = ${jobId} AND s.entity_type = 'route'
      )
    `),
    guarded(sql`
      INSERT INTO categories (id, name, slug, description, parent_id, "order", created_at)
      SELECT json_extract(s.payload_json, '$.id'), json_extract(s.payload_json, '$.name'),
             json_extract(s.payload_json, '$.slug'), json_extract(s.payload_json, '$.description'),
             NULL, cast(json_extract(s.payload_json, '$.order') AS integer),
             cast(unixepoch(json_extract(s.payload_json, '$.createdAt')) AS integer)
      FROM content_import_staging s JOIN content_import_commits c ON c.job_id = s.job_id
      WHERE s.job_id = ${jobId} AND s.entity_type = 'category'
      ON CONFLICT(id) DO UPDATE SET name=excluded.name, slug=excluded.slug,
        description=excluded.description, "order"=excluded."order"
    `),
    guarded(sql`
      UPDATE categories
      SET parent_id = (SELECT json_extract(s.payload_json, '$.parentId') FROM content_import_staging s
        WHERE s.job_id = ${jobId} AND s.entity_type = 'category'
          AND json_extract(s.payload_json, '$.id') = categories.id)
      WHERE ${hasCommit} AND id IN (SELECT json_extract(payload_json, '$.id') FROM content_import_staging
        WHERE job_id = ${jobId} AND entity_type = 'category')
    `),
    guarded(sql`
      INSERT INTO tags (id, name, slug, created_at)
      SELECT json_extract(s.payload_json, '$.id'), json_extract(s.payload_json, '$.name'),
             json_extract(s.payload_json, '$.slug'), cast(unixepoch(json_extract(s.payload_json, '$.createdAt')) AS integer)
      FROM content_import_staging s JOIN content_import_commits c ON c.job_id = s.job_id
      WHERE s.job_id = ${jobId} AND s.entity_type = 'tag'
      ON CONFLICT(id) DO UPDATE SET name=excluded.name, slug=excluded.slug
    `),
    guarded(sql`
      INSERT INTO assets (id, key, url, name, media_type, mime_type, size, width, height, duration_seconds, checksum, metadata_json, created_at, updated_at)
      SELECT json_extract(s.payload_json, '$.id'), json_extract(s.payload_json, '$.key'),
             json_extract(s.payload_json, '$.url'), json_extract(s.payload_json, '$.name'),
             json_extract(s.payload_json, '$.mediaType'), json_extract(s.payload_json, '$.mimeType'),
             cast(json_extract(s.payload_json, '$.size') AS integer), cast(json_extract(s.payload_json, '$.width') AS integer),
             cast(json_extract(s.payload_json, '$.height') AS integer), cast(json_extract(s.payload_json, '$.durationSeconds') AS integer),
             json_extract(s.payload_json, '$.checksum'), json(json_extract(s.payload_json, '$.metadata')),
             cast(unixepoch(json_extract(s.payload_json, '$.createdAt')) AS integer),
             cast(unixepoch(json_extract(s.payload_json, '$.updatedAt')) AS integer)
      FROM content_import_staging s JOIN content_import_commits c ON c.job_id = s.job_id
      WHERE s.job_id = ${jobId} AND s.entity_type = 'asset'
      ON CONFLICT(id) DO UPDATE SET key=excluded.key, url=excluded.url, name=excluded.name,
        media_type=excluded.media_type, mime_type=excluded.mime_type, size=excluded.size,
        width=excluded.width, height=excluded.height, duration_seconds=excluded.duration_seconds,
        checksum=excluded.checksum, metadata_json=excluded.metadata_json, updated_at=excluded.updated_at
    `),
    guarded(sql`
      INSERT INTO resources (id, type, title, slug, path, description, status, visibility, cover_asset_id,
        current_revision_id, published_revision_id, author_id, published_at, scheduled_at, created_at, updated_at)
      SELECT json_extract(s.payload_json, '$.id'), json_extract(s.payload_json, '$.type'),
        json_extract(s.payload_json, '$.title'), json_extract(s.payload_json, '$.slug'), json_extract(s.payload_json, '$.path'),
        json_extract(s.payload_json, '$.description'), json_extract(s.payload_json, '$.status'),
        json_extract(s.payload_json, '$.visibility'),
        CASE WHEN json_extract(s.payload_json, '$.importMode') = 'legacy'
                    AND coalesce(cast(json_extract(s.payload_json, '$.managedCover') AS integer), 0) <> 1
          THEN (SELECT existing.cover_asset_id FROM resources existing
                WHERE existing.id = json_extract(s.payload_json, '$.id'))
          ELSE json_extract(s.payload_json, '$.coverAssetId') END,
        json_extract(s.payload_json, '$.currentRevisionId'), json_extract(s.payload_json, '$.publishedRevisionId'),
        CASE WHEN json_type(s.payload_json, '$.authorId') IS NULL
          THEN (SELECT existing.author_id FROM resources existing
                WHERE existing.id=json_extract(s.payload_json, '$.id'))
          ELSE json_extract(s.payload_json, '$.authorId') END,
        cast(unixepoch(json_extract(s.payload_json, '$.publishedAt')) AS integer),
        cast(unixepoch(json_extract(s.payload_json, '$.scheduledAt')) AS integer),
        cast(unixepoch(json_extract(s.payload_json, '$.createdAt')) AS integer),
        cast(unixepoch(json_extract(s.payload_json, '$.updatedAt')) AS integer)
      FROM content_import_staging s JOIN content_import_commits c ON c.job_id = s.job_id
      WHERE s.job_id = ${jobId} AND s.entity_type = 'resource'
      ON CONFLICT(id) DO UPDATE SET type=excluded.type,
        title=CASE WHEN excluded.published_revision_id=excluded.current_revision_id OR resources.published_revision_id IS NULL
          THEN excluded.title ELSE resources.title END,
        slug=CASE WHEN excluded.published_revision_id=excluded.current_revision_id OR resources.published_revision_id IS NULL
          THEN excluded.slug ELSE resources.slug END,
        path=CASE WHEN excluded.published_revision_id=excluded.current_revision_id OR resources.published_revision_id IS NULL
          THEN excluded.path ELSE resources.path END,
        description=CASE WHEN excluded.published_revision_id=excluded.current_revision_id OR resources.published_revision_id IS NULL
          THEN excluded.description ELSE resources.description END,
        status=excluded.status,
        visibility=CASE WHEN excluded.published_revision_id=excluded.current_revision_id OR resources.published_revision_id IS NULL
          THEN excluded.visibility ELSE resources.visibility END,
        cover_asset_id=excluded.cover_asset_id, current_revision_id=excluded.current_revision_id,
        published_revision_id=excluded.published_revision_id, published_at=excluded.published_at,
        scheduled_at=excluded.scheduled_at, author_id=excluded.author_id, updated_at=excluded.updated_at
    `),
    guarded(sql`
      INSERT INTO resource_revisions (id, resource_id, version, title, slug, path, description, visibility,
        content, content_format, metadata_json, source_hash, change_summary, created_by, created_at)
      SELECT json_extract(s.payload_json, '$.id'), json_extract(s.payload_json, '$.resourceId'),
        CASE WHEN cast(json_extract(s.payload_json, '$.version') AS integer) > 0
          THEN cast(json_extract(s.payload_json, '$.version') AS integer)
          ELSE coalesce((SELECT max(rr.version) + 1 FROM resource_revisions rr
                         WHERE rr.resource_id = json_extract(s.payload_json, '$.resourceId')), 1) END,
        json_extract(s.payload_json, '$.title'), json_extract(s.payload_json, '$.slug'), json_extract(s.payload_json, '$.path'),
        json_extract(s.payload_json, '$.description'), json_extract(s.payload_json, '$.visibility'),
        s.content_text, json_extract(s.payload_json, '$.contentFormat'),
        json(json_extract(s.payload_json, '$.metadata')), json_extract(s.payload_json, '$.sourceHash'),
        json_extract(s.payload_json, '$.changeSummary'),
        CASE WHEN json_type(s.payload_json, '$.createdBy') IS NULL
          THEN (SELECT existing.created_by FROM resource_revisions existing
                WHERE existing.id=json_extract(s.payload_json, '$.id'))
          ELSE json_extract(s.payload_json, '$.createdBy') END,
        cast(unixepoch(json_extract(s.payload_json, '$.createdAt')) AS integer)
      FROM content_import_staging s JOIN content_import_commits c ON c.job_id = s.job_id
      WHERE s.job_id = ${jobId} AND s.entity_type = 'revision'
      ON CONFLICT(id) DO UPDATE SET version=excluded.version, title=excluded.title, slug=excluded.slug,
        path=excluded.path, description=excluded.description, visibility=excluded.visibility, content=excluded.content,
        content_format=excluded.content_format, metadata_json=excluded.metadata_json, source_hash=excluded.source_hash,
        change_summary=excluded.change_summary, created_by=excluded.created_by
    `),
    guarded(sql`DELETE FROM resource_routes WHERE ${hasCommit} AND (
      path IN (SELECT json_extract(payload_json, '$.path') FROM content_import_staging
        WHERE job_id=${jobId} AND entity_type='route' AND json_extract(payload_json, '$.importMode')='legacy')
      OR resource_id IN (SELECT json_extract(payload_json, '$.resourceId') FROM content_import_staging
        WHERE job_id=${jobId} AND entity_type='route'
          AND coalesce(json_extract(payload_json, '$.importMode'), 'snapshot') <> 'legacy'))`),
    guarded(sql`DELETE FROM resource_categories WHERE ${hasCommit} AND resource_id IN
      (SELECT json_extract(payload_json, '$.id') FROM content_import_staging
       WHERE job_id=${jobId} AND entity_type='resource'
         AND (coalesce(json_extract(payload_json, '$.importMode'), 'snapshot') <> 'legacy'
              OR cast(json_extract(payload_json, '$.managedTaxonomy') AS integer) = 1))`),
    guarded(sql`DELETE FROM resource_tags WHERE ${hasCommit} AND resource_id IN
      (SELECT json_extract(payload_json, '$.id') FROM content_import_staging
       WHERE job_id=${jobId} AND entity_type='resource'
         AND (coalesce(json_extract(payload_json, '$.importMode'), 'snapshot') <> 'legacy'
              OR cast(json_extract(payload_json, '$.managedTaxonomy') AS integer) = 1))`),
    guarded(sql`DELETE FROM resource_assets WHERE ${hasCommit} AND resource_id IN
      (SELECT json_extract(payload_json, '$.id') FROM content_import_staging
       WHERE job_id=${jobId} AND entity_type='resource'
         AND coalesce(json_extract(payload_json, '$.importMode'), 'snapshot') <> 'legacy')`),
    guarded(sql`DELETE FROM collection_items WHERE ${hasCommit} AND collection_resource_id IN
      (SELECT json_extract(payload_json, '$.id') FROM content_import_staging
       WHERE job_id=${jobId} AND entity_type='resource'
         AND coalesce(json_extract(payload_json, '$.importMode'), 'snapshot') <> 'legacy')`),
    guarded(sql`DELETE FROM resource_relations WHERE ${hasCommit} AND (source_resource_id IN
      (SELECT json_extract(payload_json, '$.id') FROM content_import_staging
       WHERE job_id=${jobId} AND entity_type='resource'
         AND coalesce(json_extract(payload_json, '$.importMode'), 'snapshot') <> 'legacy')
      OR target_resource_id IN
      (SELECT json_extract(payload_json, '$.id') FROM content_import_staging
       WHERE job_id=${jobId} AND entity_type='resource'
         AND coalesce(json_extract(payload_json, '$.importMode'), 'snapshot') <> 'legacy'))`),
    guarded(sql`
      INSERT INTO articles (resource_id, toc, share, giscus, searchable, reading_minutes)
      SELECT json_extract(s.payload_json, '$.resourceId'), cast(json_extract(s.payload_json, '$.toc') AS integer),
        cast(json_extract(s.payload_json, '$.share') AS integer), cast(json_extract(s.payload_json, '$.giscus') AS integer),
        cast(json_extract(s.payload_json, '$.searchable') AS integer), json_extract(s.payload_json, '$.readingMinutes')
      FROM content_import_staging s JOIN content_import_commits c ON c.job_id=s.job_id
      WHERE s.job_id=${jobId} AND s.entity_type='article'
      ON CONFLICT(resource_id) DO UPDATE SET toc=excluded.toc, share=excluded.share, giscus=excluded.giscus,
        searchable=excluded.searchable, reading_minutes=excluded.reading_minutes
    `),
    guarded(sql`
      INSERT INTO documents (resource_id, source_type, repository, source_path, "commit", sync_status, synced_at)
      SELECT json_extract(s.payload_json, '$.resourceId'), json_extract(s.payload_json, '$.sourceType'),
        json_extract(s.payload_json, '$.repository'), json_extract(s.payload_json, '$.sourcePath'),
        json_extract(s.payload_json, '$.commit'), coalesce(json_extract(s.payload_json, '$.syncStatus'), 'idle'),
        cast(unixepoch(json_extract(s.payload_json, '$.syncedAt')) AS integer)
      FROM content_import_staging s JOIN content_import_commits c ON c.job_id=s.job_id
      WHERE s.job_id=${jobId} AND s.entity_type='document'
      ON CONFLICT(resource_id) DO UPDATE SET source_type=excluded.source_type, repository=excluded.repository,
        source_path=excluded.source_path, "commit"=excluded."commit", sync_status=excluded.sync_status, synced_at=excluded.synced_at
    `),
    guarded(sql`
      INSERT INTO resource_albums (resource_id, artist, color, release_date, sort_order)
      SELECT json_extract(s.payload_json, '$.resourceId'), json_extract(s.payload_json, '$.artist'),
        json_extract(s.payload_json, '$.color'), cast(unixepoch(json_extract(s.payload_json, '$.releaseDate')) AS integer),
        cast(json_extract(s.payload_json, '$.sortOrder') AS integer)
      FROM content_import_staging s JOIN content_import_commits c ON c.job_id=s.job_id
      WHERE s.job_id=${jobId} AND s.entity_type='album'
      ON CONFLICT(resource_id) DO UPDATE SET artist=excluded.artist, color=excluded.color,
        release_date=excluded.release_date, sort_order=excluded.sort_order
    `),
    guarded(sql`
      INSERT INTO tracks (resource_id, album_resource_id, audio_asset_id, external_url, source_type,
        duration, duration_seconds, track_number, lyrics)
      SELECT json_extract(s.payload_json, '$.resourceId'), json_extract(s.payload_json, '$.albumResourceId'),
        json_extract(s.payload_json, '$.audioAssetId'), json_extract(s.payload_json, '$.externalUrl'),
        json_extract(s.payload_json, '$.sourceType'), json_extract(s.payload_json, '$.duration'),
        cast(json_extract(s.payload_json, '$.durationSeconds') AS integer),
        cast(json_extract(s.payload_json, '$.trackNumber') AS integer), json_extract(s.payload_json, '$.lyrics')
      FROM content_import_staging s JOIN content_import_commits c ON c.job_id=s.job_id
      WHERE s.job_id=${jobId} AND s.entity_type='track'
      ON CONFLICT(resource_id) DO UPDATE SET album_resource_id=excluded.album_resource_id,
        audio_asset_id=excluded.audio_asset_id, external_url=excluded.external_url, source_type=excluded.source_type,
        duration=excluded.duration, duration_seconds=excluded.duration_seconds, track_number=excluded.track_number, lyrics=excluded.lyrics
    `),
    guarded(sql`
      INSERT INTO collections (resource_id, layout)
      SELECT json_extract(s.payload_json, '$.resourceId'), json_extract(s.payload_json, '$.layout')
      FROM content_import_staging s JOIN content_import_commits c ON c.job_id=s.job_id
      WHERE s.job_id=${jobId} AND s.entity_type='collection'
      ON CONFLICT(resource_id) DO UPDATE SET layout=excluded.layout
    `),
    guarded(sql`
      INSERT INTO resource_routes (path, resource_id, canonical, created_at)
      SELECT json_extract(s.payload_json, '$.path'), json_extract(s.payload_json, '$.resourceId'),
        cast(json_extract(s.payload_json, '$.canonical') AS integer),
        cast(unixepoch(json_extract(s.payload_json, '$.createdAt')) AS integer)
      FROM content_import_staging s JOIN content_import_commits c ON c.job_id=s.job_id
      WHERE s.job_id=${jobId} AND s.entity_type='route'
      ON CONFLICT(path) DO UPDATE SET resource_id=excluded.resource_id, canonical=excluded.canonical
    `),
    guarded(sql`INSERT OR IGNORE INTO resource_categories (resource_id, category_id)
      SELECT json_extract(s.payload_json, '$.resourceId'), json_extract(s.payload_json, '$.categoryId')
      FROM content_import_staging s JOIN content_import_commits c ON c.job_id=s.job_id
      WHERE s.job_id=${jobId} AND s.entity_type='category-link'`),
    guarded(sql`INSERT OR IGNORE INTO resource_tags (resource_id, tag_id)
      SELECT json_extract(s.payload_json, '$.resourceId'), json_extract(s.payload_json, '$.tagId')
      FROM content_import_staging s JOIN content_import_commits c ON c.job_id=s.job_id
      WHERE s.job_id=${jobId} AND s.entity_type='tag-link'`),
    guarded(sql`INSERT OR IGNORE INTO resource_assets (resource_id, asset_id, role, sort_order)
      SELECT json_extract(s.payload_json, '$.resourceId'), json_extract(s.payload_json, '$.assetId'),
        json_extract(s.payload_json, '$.role'), cast(json_extract(s.payload_json, '$.sortOrder') AS integer)
      FROM content_import_staging s JOIN content_import_commits c ON c.job_id=s.job_id
      WHERE s.job_id=${jobId} AND s.entity_type='asset-link'`),
    guarded(sql`INSERT OR IGNORE INTO collection_items (collection_resource_id, resource_id, section, note, sort_order)
      SELECT json_extract(s.payload_json, '$.collectionResourceId'), json_extract(s.payload_json, '$.resourceId'),
        json_extract(s.payload_json, '$.section'), json_extract(s.payload_json, '$.note'),
        cast(json_extract(s.payload_json, '$.sortOrder') AS integer)
      FROM content_import_staging s JOIN content_import_commits c ON c.job_id=s.job_id
      WHERE s.job_id=${jobId} AND s.entity_type='collection-item'`),
    guarded(sql`
      INSERT INTO resource_relations (source_resource_id, target_resource_id, relation_type, sort_order, metadata_json)
      SELECT json_extract(s.payload_json, '$.sourceResourceId'), json_extract(s.payload_json, '$.targetResourceId'),
        json_extract(s.payload_json, '$.relationType'), cast(json_extract(s.payload_json, '$.sortOrder') AS integer),
        json(json_extract(s.payload_json, '$.metadata'))
      FROM content_import_staging s JOIN content_import_commits c ON c.job_id=s.job_id
      WHERE s.job_id=${jobId} AND s.entity_type='relation'
      ON CONFLICT(source_resource_id, target_resource_id, relation_type)
      DO UPDATE SET sort_order=excluded.sort_order, metadata_json=excluded.metadata_json
    `),
    guarded(sql`
      INSERT INTO redirects (from_path, to_path, status_code, created_at)
      SELECT json_extract(s.payload_json, '$.fromPath'), json_extract(s.payload_json, '$.toPath'),
        cast(json_extract(s.payload_json, '$.statusCode') AS integer),
        CASE WHEN json_type(s.payload_json, '$.createdAt') IS NULL
          THEN coalesce((SELECT existing.created_at FROM redirects existing
                         WHERE existing.from_path=json_extract(s.payload_json, '$.fromPath')),
                        ${Math.floor(Date.now() / 1_000)})
          ELSE cast(unixepoch(json_extract(s.payload_json, '$.createdAt')) AS integer) END
      FROM content_import_staging s JOIN content_import_commits c ON c.job_id=s.job_id
      WHERE s.job_id=${jobId} AND s.entity_type='redirect'
      ON CONFLICT(from_path) DO UPDATE SET to_path=excluded.to_path, status_code=excluded.status_code,
        created_at=excluded.created_at
    `),
    guarded(sql`INSERT OR IGNORE INTO publication_events (id, resource_id, revision_id, event_type, actor_id, data_json, created_at)
      SELECT json_extract(s.payload_json, '$.id'), json_extract(s.payload_json, '$.resourceId'),
        json_extract(s.payload_json, '$.revisionId'), json_extract(s.payload_json, '$.eventType'),
        json_extract(s.payload_json, '$.actorId'),
        json(json_extract(s.payload_json, '$.data')),
        cast(unixepoch(json_extract(s.payload_json, '$.createdAt')) AS integer)
      FROM content_import_staging s JOIN content_import_commits c ON c.job_id=s.job_id
      WHERE s.job_id=${jobId} AND s.entity_type='publication-event'`),
    guarded(sql`
      INSERT INTO settings (id, key, value, created_at, updated_at)
      SELECT json_extract(s.payload_json, '$.id'), json_extract(s.payload_json, '$.key'),
        json_extract(s.payload_json, '$.value'),
        cast(unixepoch(json_extract(s.payload_json, '$.createdAt')) AS integer),
        cast(unixepoch(json_extract(s.payload_json, '$.updatedAt')) AS integer)
      FROM content_import_staging s JOIN content_import_commits c ON c.job_id=s.job_id
      WHERE s.job_id=${jobId} AND s.entity_type='setting'
      ON CONFLICT(id) DO UPDATE SET key=excluded.key, value=excluded.value, updated_at=excluded.updated_at
    `),
    guarded(sql`DELETE FROM resource_search WHERE ${hasCommit} AND resource_id IN
      (SELECT json_extract(payload_json, '$.id') FROM content_import_staging WHERE job_id=${jobId} AND entity_type='resource')`),
    guarded(sql`
      INSERT INTO resource_search (resource_id, title, description, content, tokens)
      SELECT r.id, rr.title, coalesce(rr.description, ''), rr.content,
             lower(rr.title || ' ' || coalesce(rr.description, ''))
      FROM resources r JOIN resource_revisions rr ON rr.id=r.published_revision_id
      JOIN content_import_staging s ON s.job_id=${jobId} AND s.entity_type='resource'
        AND json_extract(s.payload_json, '$.id')=r.id
      JOIN content_import_commits c ON c.job_id=s.job_id
      WHERE r.status='published'
        AND (r.type <> 'article' OR coalesce(json_extract(rr.metadata_json, '$.search'), 1)=1)
    `),
  ]

  if (statements.length !== CONTENT_IMPORT_CUTOVER_STATEMENTS) {
    throw new Error('Content import cut-over query budget changed without an explicit review.')
  }
  return statements
}

/**
 * Performs a single atomic cut-over. The guard row is created only when every
 * frozen current-revision baseline and every unique owner still match. Every
 * mutation joins/checks that guard, so a failed guard changes no public row.
 */
export async function commitContentImport(jobId: string) {
  const findCommit = async () => {
    const [commit] = await db.select({ jobId: contentImportCommits.jobId })
      .from(contentImportCommits)
      .where(eq(contentImportCommits.jobId, jobId))
      .limit(1)
    return commit
  }
  const alreadyCommitted = await findCommit()
  if (alreadyCommitted) return { committed: true, statements: 0 }
  const statements = buildContentImportCutoverStatements(jobId)
  try {
    await db.batch(statements as [BatchItem<'sqlite'>, ...BatchItem<'sqlite'>[]])
  } catch (error) {
    // A network/SDK error may arrive after D1 committed the atomic batch. The
    // marker is in that same transaction, so a successful reconciliation is
    // authoritative. If reconciliation itself is unavailable, callers must
    // keep the job retryable rather than deleting a possibly-live import.
    try {
      if (await findCommit()) return { committed: true, statements: statements.length }
    } catch (reconciliationError) {
      throw new ContentImportCommitUncertainError(new AggregateError(
        [error, reconciliationError],
        'D1 cut-over and reconciliation both returned errors.',
      ))
    }
    throw error
  }
  let commit: { jobId: string } | undefined
  try {
    commit = await findCommit()
  } catch (error) {
    throw new ContentImportCommitUncertainError(error)
  }
  if (!commit) throw new Error('Content changed after preflight; atomic import cut-over was cancelled.')
  return { committed: true, statements: statements.length }
}

export async function clearContentImportStaging(jobId: string, options?: { preserveCommit?: boolean }) {
  await db.delete(contentImportStaging).where(eq(contentImportStaging.jobId, jobId))
  // A completed job keeps its tiny commit fence. This makes a lease holder
  // that resumes after terminal cleanup observe the prior cut-over instead of
  // recreating an empty marker after the staged rows have been removed.
  if (!options?.preserveCommit) {
    await db.delete(contentImportCommits).where(eq(contentImportCommits.jobId, jobId))
  }
}

export async function hasStagedImportRecord(jobId: string, entityType: ImportEntityType, entityKey: string) {
  const [row] = await db.select({ entityKey: contentImportStaging.entityKey })
    .from(contentImportStaging)
    .where(and(
      eq(contentImportStaging.jobId, jobId),
      eq(contentImportStaging.entityType, entityType),
      eq(contentImportStaging.entityKey, entityKey),
    ))
    .limit(1)
  return Boolean(row)
}
