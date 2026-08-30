import type { BatchItem } from 'drizzle-orm/batch'
import { eq, inArray, or, sql } from 'drizzle-orm'

import { db } from '@/lib/db'
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
  resourceRevisions,
  resourceRoutes,
  resources,
  resourceTags,
  settings,
  tags,
  tracks,
} from '@/lib/db/schema'
import { assertContentFitsD1 } from '@/modules/resources/domain/types'

import {
  CONTENT_SNAPSHOT_PATH,
  contentBundleSchema,
  contentSnapshotSchema,
  readEmbeddedFile,
  type ContentBundle,
  type ContentSnapshot,
} from './contract'

export interface ContentImportPlan {
  resources: { total: number; create: number; update: number }
  revisions: number
  categories: number
  tags: number
  assets: number
  routes: number
  relations: number
  conflicts: string[]
}

export type ContentImportBaselines = Record<string, string | null>

const MAX_IN_MEMORY_COMPAT_SNAPSHOT_CHARS = 4 * 1024 * 1024

export function contentImportBaselineKey(entityType: string, entityKey: string) {
  return `${entityType}:${entityKey}`
}

export function snapshotResourceBaselineConflict(
  existing: { currentRevisionId: string | null; sourceHash: string | null },
  incoming: { currentRevisionId: string; sourceHash: string | null },
) {
  return existing.currentRevisionId !== incoming.currentRevisionId
    || existing.sourceHash !== incoming.sourceHash
}

function chunks<T>(values: T[], size: number) {
  const result: T[][] = []
  for (let index = 0; index < values.length; index += size) result.push(values.slice(index, index + size))
  return result
}

function date(value: string | null) {
  return value ? new Date(value) : null
}

function d1Timestamp(value: Date) {
  // Drizzle's SQLite `timestamp` mode hydrates seconds into a Date, while the
  // raw CAS performed during cut-over compares the underlying integer value.
  return Math.floor(value.valueOf() / 1_000)
}

function normalizedJson(value: string) {
  try { return JSON.stringify(JSON.parse(value)) } catch { return value }
}

export function extractContentSnapshot(bundleInput: unknown) {
  // This entrypoint remains only for small compatibility calls and unit tests.
  // Production imports persist the request stream and range-index the snapshot.
  const rawFiles = bundleInput && typeof bundleInput === 'object' && !Array.isArray(bundleInput)
    ? (bundleInput as { files?: unknown }).files
    : undefined
  const rawSnapshot = Array.isArray(rawFiles)
    ? rawFiles.find((candidate) => candidate && typeof candidate === 'object'
      && (candidate as { path?: unknown }).path === CONTENT_SNAPSHOT_PATH) as { content?: unknown } | undefined
    : undefined
  if (typeof rawSnapshot?.content === 'string' && rawSnapshot.content.length > MAX_IN_MEMORY_COMPAT_SNAPSHOT_CHARS) {
    throw new Error('Large content snapshots must use the persisted streaming import job.')
  }
  const bundle = contentBundleSchema.parse(bundleInput)
  const file = bundle.files.find((candidate) => candidate.path === CONTENT_SNAPSHOT_PATH)
  if (!file) throw new Error(`Bundle is missing ${CONTENT_SNAPSHOT_PATH}.`)
  if (file.encoding === 'external') throw new Error('Content snapshot must be embedded.')
  const snapshot = contentSnapshotSchema.parse(JSON.parse(readEmbeddedFile(file)))
  for (const resource of snapshot.resources) {
    for (const revision of resource.revisions) assertContentFitsD1(revision.content)
  }
  return { bundle, snapshot }
}

export async function planContentImport(bundleInput: unknown): Promise<{
  bundle: ContentBundle
  snapshot: ContentSnapshot
  plan: ContentImportPlan
  baselines: ContentImportBaselines
}> {
  const { bundle, snapshot } = extractContentSnapshot(bundleInput)
  const [existingResources, existingCategories, existingTags, existingAssets, existingRoutes, existingRedirects, existingSettings] = await Promise.all([
    db.select({
      id: resources.id,
      type: resources.type,
      title: resources.title,
      slug: resources.slug,
      path: resources.path,
      description: resources.description,
      status: resources.status,
      visibility: resources.visibility,
      coverAssetId: resources.coverAssetId,
      currentRevisionId: resources.currentRevisionId,
      publishedRevisionId: resources.publishedRevisionId,
      publishedAt: resources.publishedAt,
      scheduledAt: resources.scheduledAt,
      authorId: resources.authorId,
      createdAt: resources.createdAt,
      sourceHash: resourceRevisions.sourceHash,
      updatedAt: resources.updatedAt,
    }).from(resources).leftJoin(resourceRevisions, eq(resourceRevisions.id, resources.currentRevisionId)),
    db.select().from(categories),
    db.select().from(tags),
    db.select().from(assets),
    db.select({
      path: resourceRoutes.path,
      resourceId: resourceRoutes.resourceId,
      canonical: resourceRoutes.canonical,
      createdAt: resourceRoutes.createdAt,
    }).from(resourceRoutes),
    db.select().from(redirects),
    db.select().from(settings),
  ])
  const conflicts: string[] = []
  const resourceIdSet = new Set(existingResources.map((row) => row.id))
  const resourceById = new Map(existingResources.map((row) => [row.id, row]))
  const resourcePathOwner = new Map(existingResources.map((row) => [row.path, row.id]))
  const resourceSlugOwner = new Map(existingResources.map((row) => [`${row.type}:${row.slug}`, row.id]))
  const categoryNameOwner = new Map(existingCategories.map((row) => [row.name, row.id]))
  const categorySlugOwner = new Map(existingCategories.map((row) => [row.slug, row.id]))
  const tagNameOwner = new Map(existingTags.map((row) => [row.name, row.id]))
  const tagSlugOwner = new Map(existingTags.map((row) => [row.slug, row.id]))
  const assetKeyOwner = new Map(existingAssets.map((row) => [row.key, row.id]))
  const routeOwner = new Map(existingRoutes.map((row) => [row.path, row.resourceId]))
  const baselines: ContentImportBaselines = {}
  for (const resource of snapshot.resources) {
    const row = resourceById.get(resource.id)
    baselines[contentImportBaselineKey('resource', resource.id)] = row
      ? JSON.stringify({
        type: row.type, title: row.title, slug: row.slug, path: row.path, description: row.description,
        status: row.status, visibility: row.visibility, coverAssetId: row.coverAssetId,
        currentRevisionId: row.currentRevisionId, publishedRevisionId: row.publishedRevisionId,
        publishedAt: row.publishedAt ? d1Timestamp(row.publishedAt) : null,
        scheduledAt: row.scheduledAt ? d1Timestamp(row.scheduledAt) : null,
        authorId: row.authorId,
        createdAt: d1Timestamp(row.createdAt),
        updatedAt: d1Timestamp(row.updatedAt),
      })
      : null
  }
  for (const category of snapshot.categories) {
    const row = existingCategories.find((item) => item.id === category.id)
    baselines[contentImportBaselineKey('category', category.id)] = row
      ? JSON.stringify({
        name: row.name, slug: row.slug, description: row.description,
        parentId: row.parentId, order: row.order, createdAt: d1Timestamp(row.createdAt),
      })
      : null
  }
  for (const tag of snapshot.tags) {
    const row = existingTags.find((item) => item.id === tag.id)
    baselines[contentImportBaselineKey('tag', tag.id)] = row
      ? JSON.stringify({ name: row.name, slug: row.slug, createdAt: d1Timestamp(row.createdAt) })
      : null
  }
  for (const asset of snapshot.assets) {
    const row = existingAssets.find((item) => item.id === asset.id)
    baselines[contentImportBaselineKey('asset', asset.id)] = row
      ? JSON.stringify({
        key: row.key, url: row.url, name: row.name, mediaType: row.mediaType, mimeType: row.mimeType,
        size: row.size, width: row.width, height: row.height, durationSeconds: row.durationSeconds,
        checksum: row.checksum, metadataJson: row.metadataJson,
        createdAt: d1Timestamp(row.createdAt), updatedAt: d1Timestamp(row.updatedAt),
      })
      : null
  }
  for (const route of snapshot.routes) {
    const row = existingRoutes.find((item) => item.path === route.path)
    baselines[contentImportBaselineKey('route', route.path)] = row
      ? JSON.stringify({ resourceId: row.resourceId, canonical: row.canonical, createdAt: d1Timestamp(row.createdAt) })
      : null
  }
  for (const redirect of snapshot.redirects) {
    const row = existingRedirects.find((item) => item.fromPath === redirect.fromPath)
    baselines[contentImportBaselineKey('redirect', redirect.fromPath)] = row
      ? JSON.stringify({ toPath: row.toPath, statusCode: row.statusCode, createdAt: d1Timestamp(row.createdAt) })
      : null
  }
  for (const setting of snapshot.settings) {
    const row = existingSettings.find((item) => item.id === setting.id)
    baselines[contentImportBaselineKey('setting', setting.id)] = row
      ? JSON.stringify({
        key: row.key, value: row.value,
        createdAt: d1Timestamp(row.createdAt), updatedAt: d1Timestamp(row.updatedAt),
      })
      : null
  }

  for (const resource of snapshot.resources) {
    const pathOwner = resourcePathOwner.get(resource.path)
    if (pathOwner && pathOwner !== resource.id) conflicts.push(`Resource path ${resource.path} belongs to ${pathOwner}.`)
    const slugOwner = resourceSlugOwner.get(`${resource.type}:${resource.slug}`)
    if (slugOwner && slugOwner !== resource.id) conflicts.push(`${resource.type} slug ${resource.slug} belongs to ${slugOwner}.`)
    const existing = resourceById.get(resource.id)
    const incomingHash = resource.revisions.find((revision) => revision.id === resource.currentRevisionId)?.sourceHash ?? null
    if (existing && snapshotResourceBaselineConflict(existing, {
      currentRevisionId: resource.currentRevisionId,
      sourceHash: incomingHash,
    })) {
      conflicts.push(`Resource ${resource.id} changed after the source snapshot was created.`)
    } else if (existing && (
      d1Timestamp(existing.createdAt) !== Math.floor(new Date(resource.createdAt).valueOf() / 1_000)
      || d1Timestamp(existing.updatedAt) !== Math.floor(new Date(resource.updatedAt).valueOf() / 1_000)
      || existing.type !== resource.type || existing.title !== resource.title || existing.slug !== resource.slug
      || existing.path !== resource.path || existing.description !== resource.description
      || existing.status !== resource.status || existing.visibility !== resource.visibility
      || existing.coverAssetId !== resource.coverAssetId
      || existing.publishedRevisionId !== resource.publishedRevisionId
      || (existing.publishedAt ? d1Timestamp(existing.publishedAt) : null)
        !== (resource.publishedAt ? Math.floor(new Date(resource.publishedAt).valueOf() / 1_000) : null)
      || (existing.scheduledAt ? d1Timestamp(existing.scheduledAt) : null)
        !== (resource.scheduledAt ? Math.floor(new Date(resource.scheduledAt).valueOf() / 1_000) : null)
      || (resource.authorId !== undefined && existing.authorId !== resource.authorId)
    )) {
      conflicts.push(`Resource ${resource.id} changed after the source snapshot was created.`)
    }
  }
  for (const category of snapshot.categories) {
    const nameOwner = categoryNameOwner.get(category.name)
    const slugOwner = categorySlugOwner.get(category.slug)
    if (nameOwner && nameOwner !== category.id) conflicts.push(`Category name ${category.name} belongs to ${nameOwner}.`)
    if (slugOwner && slugOwner !== category.id) conflicts.push(`Category slug ${category.slug} belongs to ${slugOwner}.`)
    const existing = existingCategories.find((row) => row.id === category.id)
    if (existing && (existing.name !== category.name || existing.slug !== category.slug
      || existing.description !== category.description || existing.parentId !== category.parentId
      || existing.order !== category.order
      || d1Timestamp(existing.createdAt) !== Math.floor(new Date(category.createdAt).valueOf() / 1_000))) {
      conflicts.push(`Category ${category.id} changed after the source snapshot was created.`)
    }
  }
  for (const tag of snapshot.tags) {
    const nameOwner = tagNameOwner.get(tag.name)
    const slugOwner = tagSlugOwner.get(tag.slug)
    if (nameOwner && nameOwner !== tag.id) conflicts.push(`Tag name ${tag.name} belongs to ${nameOwner}.`)
    if (slugOwner && slugOwner !== tag.id) conflicts.push(`Tag slug ${tag.slug} belongs to ${slugOwner}.`)
    const existing = existingTags.find((row) => row.id === tag.id)
    if (existing && (existing.name !== tag.name || existing.slug !== tag.slug
      || d1Timestamp(existing.createdAt) !== Math.floor(new Date(tag.createdAt).valueOf() / 1_000))) {
      conflicts.push(`Tag ${tag.id} changed after the source snapshot was created.`)
    }
  }
  for (const asset of snapshot.assets) {
    const owner = assetKeyOwner.get(asset.key)
    if (owner && owner !== asset.id) conflicts.push(`Asset key ${asset.key} belongs to ${owner}.`)
    const existing = existingAssets.find((row) => row.id === asset.id)
    if (existing && (
      d1Timestamp(existing.createdAt) !== Math.floor(new Date(asset.createdAt).valueOf() / 1_000)
      || d1Timestamp(existing.updatedAt) !== Math.floor(new Date(asset.updatedAt).valueOf() / 1_000)
      || existing.key !== asset.key || existing.url !== asset.url || existing.name !== asset.name
      || existing.mediaType !== asset.mediaType || existing.mimeType !== asset.mimeType || existing.size !== asset.size
      || existing.width !== asset.width || existing.height !== asset.height
      || existing.durationSeconds !== asset.durationSeconds || existing.checksum !== asset.checksum
      || normalizedJson(existing.metadataJson) !== JSON.stringify(asset.metadata)
    )) {
      conflicts.push(`Asset ${asset.id} changed after the source snapshot was created.`)
    }
  }
  for (const route of snapshot.routes) {
    const owner = routeOwner.get(route.path)
    if (owner && owner !== route.resourceId) conflicts.push(`Route ${route.path} belongs to ${owner}.`)
    const existing = existingRoutes.find((row) => row.path === route.path)
    if (existing && (existing.resourceId !== route.resourceId || Boolean(existing.canonical) !== route.canonical
      || d1Timestamp(existing.createdAt) !== Math.floor(new Date(route.createdAt).valueOf() / 1_000))) {
      conflicts.push(`Route ${route.path} changed after the source snapshot was created.`)
    }
  }
  for (const redirect of snapshot.redirects) {
    const existing = existingRedirects.find((row) => row.fromPath === redirect.fromPath)
    if (existing && (existing.toPath !== redirect.toPath || existing.statusCode !== redirect.statusCode
      || (redirect.createdAt !== undefined
        && d1Timestamp(existing.createdAt) !== Math.floor(new Date(redirect.createdAt).valueOf() / 1_000)))) {
      conflicts.push(`Redirect ${redirect.fromPath} changed after the source snapshot was created.`)
    }
  }
  for (const setting of snapshot.settings) {
    const existing = existingSettings.find((row) => row.id === setting.id)
    if (existing && (d1Timestamp(existing.createdAt) !== Math.floor(new Date(setting.createdAt).valueOf() / 1_000)
      || d1Timestamp(existing.updatedAt) !== Math.floor(new Date(setting.updatedAt).valueOf() / 1_000))) {
      conflicts.push(`Setting ${setting.id} changed after the source snapshot was created.`)
    }
  }

  return {
    bundle,
    snapshot,
    plan: {
      resources: {
        total: snapshot.resources.length,
        create: snapshot.resources.filter((resource) => !resourceIdSet.has(resource.id)).length,
        update: snapshot.resources.filter((resource) => resourceIdSet.has(resource.id)).length,
      },
      revisions: snapshot.resources.reduce((count, resource) => count + resource.revisions.length, 0),
      categories: snapshot.categories.length,
      tags: snapshot.tags.length,
      assets: snapshot.assets.length,
      routes: snapshot.routes.length,
      relations: snapshot.categoryLinks.length + snapshot.tagLinks.length + snapshot.assetLinks.length
        + snapshot.collectionItems.length + snapshot.relations.length,
      conflicts: [...new Set(conflicts)],
    },
    baselines,
  }
}

export const CONTENT_IMPORT_STATEMENTS_PER_PAGE = 20

type StatementFactory = () => BatchItem<'sqlite'>

function contentImportStatementFactories(snapshot: ContentSnapshot): StatementFactory[] {
  const statements: StatementFactory[] = []

  statements.push(...snapshot.categories.map((row) => () => db.insert(categories).values({
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    parentId: null,
    order: row.order,
    createdAt: new Date(row.createdAt),
  }).onConflictDoUpdate({
    target: categories.id,
    set: { name: row.name, slug: row.slug, description: row.description, parentId: null, order: row.order },
  })))
  statements.push(...snapshot.categories.filter((row) => row.parentId).map((row) => () =>
    db.update(categories).set({ parentId: row.parentId }).where(eq(categories.id, row.id))))

  statements.push(...snapshot.tags.map((row) => () => db.insert(tags).values({ ...row, createdAt: new Date(row.createdAt) }).onConflictDoUpdate({
    target: tags.id,
    set: { name: row.name, slug: row.slug },
  })))

  statements.push(...snapshot.assets.map((row) => () => db.insert(assets).values({
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
    metadataJson: JSON.stringify(row.metadata),
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  }).onConflictDoUpdate({
    target: assets.id,
    set: {
      key: row.key, url: row.url, name: row.name, mediaType: row.mediaType, mimeType: row.mimeType,
      size: row.size, width: row.width, height: row.height, durationSeconds: row.durationSeconds,
      checksum: row.checksum, metadataJson: JSON.stringify(row.metadata), updatedAt: new Date(row.updatedAt),
    },
  })))

  statements.push(...snapshot.resources.map((row) => () => db.insert(resources).values({
    id: row.id,
    type: row.type,
    title: row.title,
    slug: row.slug,
    path: row.path,
    description: row.description,
    status: row.status,
    visibility: row.visibility,
    coverAssetId: null,
    currentRevisionId: row.currentRevisionId,
    publishedRevisionId: row.publishedRevisionId,
    authorId: row.authorId ?? null,
    publishedAt: date(row.publishedAt),
    scheduledAt: date(row.scheduledAt),
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  }).onConflictDoUpdate({
    target: resources.id,
    set: {
      type: row.type, title: row.title, slug: row.slug, path: row.path, description: row.description,
      status: row.status, visibility: row.visibility, coverAssetId: null,
      currentRevisionId: row.currentRevisionId, publishedRevisionId: row.publishedRevisionId,
      publishedAt: date(row.publishedAt), scheduledAt: date(row.scheduledAt),
      ...(row.authorId !== undefined ? { authorId: row.authorId } : {}),
      updatedAt: new Date(row.updatedAt),
    },
  })))

  statements.push(...snapshot.resources.flatMap((resource) => resource.revisions.map((revision) => () =>
    db.insert(resourceRevisions).values({
      id: revision.id,
      resourceId: resource.id,
      version: revision.version,
      title: revision.title,
      slug: revision.slug,
      path: revision.path,
      description: revision.description,
      visibility: revision.visibility,
      content: revision.content,
      contentFormat: revision.contentFormat,
      metadataJson: JSON.stringify(revision.metadata),
      sourceHash: revision.sourceHash,
      changeSummary: revision.changeSummary,
      createdBy: revision.createdBy ?? null,
      createdAt: new Date(revision.createdAt),
    }).onConflictDoUpdate({
      target: resourceRevisions.id,
      set: {
        version: revision.version, title: revision.title, slug: revision.slug, path: revision.path,
        description: revision.description, visibility: revision.visibility, content: revision.content,
        contentFormat: revision.contentFormat, metadataJson: JSON.stringify(revision.metadata),
        sourceHash: revision.sourceHash, changeSummary: revision.changeSummary,
        ...(revision.createdBy !== undefined ? { createdBy: revision.createdBy } : {}),
      },
    }))))
  statements.push(...snapshot.resources.map((row) => () => db.update(resources).set({
    coverAssetId: row.coverAssetId,
    currentRevisionId: row.currentRevisionId,
    publishedRevisionId: row.publishedRevisionId,
  }).where(eq(resources.id, row.id))))

  const importedIds = snapshot.resources.map((resource) => resource.id)
  for (const group of chunks(importedIds, 40)) {
    statements.push(
      () => db.delete(resourceRoutes).where(inArray(resourceRoutes.resourceId, group)),
      () => db.delete(resourceCategories).where(inArray(resourceCategories.resourceId, group)),
      () => db.delete(resourceTags).where(inArray(resourceTags.resourceId, group)),
      () => db.delete(resourceAssets).where(inArray(resourceAssets.resourceId, group)),
      () => db.delete(collectionItems).where(inArray(collectionItems.collectionResourceId, group)),
      () => db.delete(resourceRelations).where(or(
        inArray(resourceRelations.sourceResourceId, group),
        inArray(resourceRelations.targetResourceId, group),
      )),
    )
  }

  statements.push(...snapshot.articles.map((row) => () => db.insert(articles).values(row).onConflictDoUpdate({
    target: articles.resourceId,
    set: { toc: row.toc, share: row.share, giscus: row.giscus, searchable: row.searchable, readingMinutes: row.readingMinutes },
  })))
  statements.push(...snapshot.documents.map((row) => () => db.insert(documents).values({ ...row, syncedAt: date(row.syncedAt) }).onConflictDoUpdate({
    target: documents.resourceId,
    set: {
      sourceType: row.sourceType, repository: row.repository, sourcePath: row.sourcePath,
      commit: row.commit, syncStatus: row.syncStatus, syncedAt: date(row.syncedAt),
    },
  })))
  statements.push(...snapshot.albums.map((row) => () => db.insert(resourceAlbums).values({ ...row, releaseDate: date(row.releaseDate) }).onConflictDoUpdate({
    target: resourceAlbums.resourceId,
    set: { artist: row.artist, color: row.color, releaseDate: date(row.releaseDate), sortOrder: row.sortOrder },
  })))
  statements.push(...snapshot.tracks.map((row) => () => db.insert(tracks).values(row).onConflictDoUpdate({
    target: tracks.resourceId,
    set: {
      albumResourceId: row.albumResourceId, audioAssetId: row.audioAssetId, externalUrl: row.externalUrl,
      sourceType: row.sourceType, duration: row.duration, durationSeconds: row.durationSeconds,
      trackNumber: row.trackNumber, lyrics: row.lyrics,
    },
  })))
  statements.push(...snapshot.collections.map((row) => () => db.insert(collections).values(row).onConflictDoUpdate({
    target: collections.resourceId,
    set: { layout: row.layout },
  })))

  statements.push(...snapshot.routes.map((row) => () => db.insert(resourceRoutes).values({ ...row, createdAt: new Date(row.createdAt) }).onConflictDoUpdate({
    target: resourceRoutes.path,
    set: { resourceId: row.resourceId, canonical: row.canonical },
  })))
  statements.push(...snapshot.categoryLinks.map((row) => () => db.insert(resourceCategories).values(row).onConflictDoNothing()))
  statements.push(...snapshot.tagLinks.map((row) => () => db.insert(resourceTags).values(row).onConflictDoNothing()))
  statements.push(...snapshot.assetLinks.map((row) => () => db.insert(resourceAssets).values(row).onConflictDoNothing()))
  statements.push(...snapshot.collectionItems.map((row) => () => db.insert(collectionItems).values(row).onConflictDoNothing()))
  statements.push(...snapshot.relations.map((row) => () => db.insert(resourceRelations).values({
    sourceResourceId: row.sourceResourceId,
    targetResourceId: row.targetResourceId,
    relationType: row.relationType,
    sortOrder: row.sortOrder,
    metadataJson: JSON.stringify(row.metadata),
  }).onConflictDoUpdate({
    target: [resourceRelations.sourceResourceId, resourceRelations.targetResourceId, resourceRelations.relationType],
    set: { sortOrder: row.sortOrder, metadataJson: JSON.stringify(row.metadata) },
  })))
  statements.push(...snapshot.redirects.map((row) => () => db.insert(redirects).values({
    fromPath: row.fromPath,
    toPath: row.toPath,
    statusCode: row.statusCode,
    ...(row.createdAt !== undefined ? { createdAt: new Date(row.createdAt) } : {}),
  }).onConflictDoUpdate({
    target: redirects.fromPath,
    set: {
      toPath: row.toPath,
      statusCode: row.statusCode,
      ...(row.createdAt !== undefined ? { createdAt: new Date(row.createdAt) } : {}),
    },
  })))
  statements.push(...snapshot.publicationEvents.map((row) => () => db.insert(publicationEvents).values({
    id: row.id,
    resourceId: row.resourceId,
    revisionId: row.revisionId,
    eventType: row.eventType,
    actorId: row.actorId ?? null,
    dataJson: JSON.stringify(row.data),
    createdAt: new Date(row.createdAt),
  }).onConflictDoNothing()))
  statements.push(...snapshot.settings.map((row) => () => db.insert(settings).values({
    ...row,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  }).onConflictDoUpdate({
    target: settings.id,
    set: { key: row.key, value: row.value, updatedAt: new Date(row.updatedAt) },
  })))

  return statements
}

const SEARCH_REBUILD_STATEMENTS = 2

export function contentImportStatementCount(bundleInput: unknown) {
  const { snapshot } = extractContentSnapshot(bundleInput)
  return contentImportStatementFactories(snapshot).length + SEARCH_REBUILD_STATEMENTS
}

export function contentImportPageBounds(total: number, cursor: number) {
  const start = Math.min(Math.max(cursor, 0), Math.max(total, 0))
  const end = Math.min(Math.max(total, 0), start + CONTENT_IMPORT_STATEMENTS_PER_PAGE)
  return { start, end, statementCount: end - start, done: end >= total }
}

/** Executes at most 20 D1 statements for one persisted import-job invocation. */
export async function applyContentImportPage(bundleInput: unknown, cursor: number) {
  const { bundle, snapshot } = extractContentSnapshot(bundleInput)
  const factories = contentImportStatementFactories(snapshot)
  const total = factories.length + SEARCH_REBUILD_STATEMENTS
  const bounds = contentImportPageBounds(total, cursor)
  let nextCursor = bounds.start
  let remaining = bounds.statementCount

  if (nextCursor < factories.length && remaining > 0) {
    const end = Math.min(factories.length, nextCursor + remaining)
    const statements = factories.slice(nextCursor, end).map((factory) => factory())
    if (statements.length) await db.batch(statements as [BatchItem<'sqlite'>, ...BatchItem<'sqlite'>[]])
    remaining -= statements.length
    nextCursor = end
  }
  if (nextCursor === factories.length && remaining > 0) {
    await db.run(sql`DELETE FROM resource_search`)
    nextCursor += 1
    remaining -= 1
  }
  if (nextCursor === factories.length + 1 && remaining > 0) {
    await db.run(sql`
      INSERT INTO resource_search (resource_id, title, description, content, tokens)
      SELECT r.id, rr.title, coalesce(rr.description, ''), rr.content,
             lower(rr.title || ' ' || coalesce(rr.description, ''))
      FROM resources r
      JOIN resource_revisions rr ON rr.id = r.published_revision_id
      WHERE r.status = 'published'
        AND (r.type <> 'article' OR coalesce(json_extract(rr.metadata_json, '$.search'), 1) = 1)
    `)
    nextCursor += 1
  }

  return {
    schemaVersion: bundle.schemaVersion,
    generatedAt: bundle.generatedAt,
    cursor: nextCursor,
    total,
    done: nextCursor >= total,
  }
}

/** Compatibility entrypoint for tiny bundles; larger work must use the job API. */
export async function applyContentImport(bundleInput: unknown) {
  const { bundle, plan } = await planContentImport(bundleInput)
  if (plan.conflicts.length) {
    const error = new Error('Content bundle conflicts with existing unique paths or slugs.')
    Object.assign(error, { conflicts: plan.conflicts })
    throw error
  }
  const total = contentImportStatementCount(bundle)
  if (total > CONTENT_IMPORT_STATEMENTS_PER_PAGE) {
    throw new Error('Large content snapshots must be applied through a persisted content-import job.')
  }
  const page = await applyContentImportPage(bundle, 0)
  return { schemaVersion: bundle.schemaVersion, generatedAt: bundle.generatedAt, applied: page.done, plan }
}
