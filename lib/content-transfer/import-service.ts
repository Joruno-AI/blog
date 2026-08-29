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

import {
  CONTENT_SNAPSHOT_PATH,
  contentBundleSchema,
  contentSnapshotSchema,
  readEmbeddedFile,
  type ContentBundle,
  type ContentSnapshot,
} from './contract'

const BATCH_SIZE = 50

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

function chunks<T>(values: T[], size = BATCH_SIZE) {
  const result: T[][] = []
  for (let index = 0; index < values.length; index += size) result.push(values.slice(index, index + size))
  return result
}

async function runBatches(items: BatchItem<'sqlite'>[]) {
  for (const group of chunks(items)) {
    if (group.length) await db.batch(group as [BatchItem<'sqlite'>, ...BatchItem<'sqlite'>[]])
  }
}

function date(value: string | null) {
  return value ? new Date(value) : null
}

export function extractContentSnapshot(bundleInput: unknown) {
  const bundle = contentBundleSchema.parse(bundleInput)
  const file = bundle.files.find((candidate) => candidate.path === CONTENT_SNAPSHOT_PATH)
  if (!file) throw new Error(`Bundle is missing ${CONTENT_SNAPSHOT_PATH}.`)
  if (file.encoding === 'external') throw new Error('Content snapshot must be embedded.')
  return { bundle, snapshot: contentSnapshotSchema.parse(JSON.parse(readEmbeddedFile(file))) }
}

export async function planContentImport(bundleInput: unknown): Promise<{
  bundle: ContentBundle
  snapshot: ContentSnapshot
  plan: ContentImportPlan
}> {
  const { bundle, snapshot } = extractContentSnapshot(bundleInput)
  const [existingResources, existingCategories, existingTags, existingAssets, existingRoutes] = await Promise.all([
    db.select({ id: resources.id, type: resources.type, slug: resources.slug, path: resources.path }).from(resources),
    db.select({ id: categories.id, name: categories.name, slug: categories.slug }).from(categories),
    db.select({ id: tags.id, name: tags.name, slug: tags.slug }).from(tags),
    db.select({ id: assets.id, key: assets.key }).from(assets),
    db.select({ path: resourceRoutes.path, resourceId: resourceRoutes.resourceId }).from(resourceRoutes),
  ])
  const conflicts: string[] = []
  const resourceIdSet = new Set(existingResources.map((row) => row.id))
  const resourcePathOwner = new Map(existingResources.map((row) => [row.path, row.id]))
  const resourceSlugOwner = new Map(existingResources.map((row) => [`${row.type}:${row.slug}`, row.id]))
  const categoryNameOwner = new Map(existingCategories.map((row) => [row.name, row.id]))
  const categorySlugOwner = new Map(existingCategories.map((row) => [row.slug, row.id]))
  const tagNameOwner = new Map(existingTags.map((row) => [row.name, row.id]))
  const tagSlugOwner = new Map(existingTags.map((row) => [row.slug, row.id]))
  const assetKeyOwner = new Map(existingAssets.map((row) => [row.key, row.id]))
  const routeOwner = new Map(existingRoutes.map((row) => [row.path, row.resourceId]))

  for (const resource of snapshot.resources) {
    const pathOwner = resourcePathOwner.get(resource.path)
    if (pathOwner && pathOwner !== resource.id) conflicts.push(`Resource path ${resource.path} belongs to ${pathOwner}.`)
    const slugOwner = resourceSlugOwner.get(`${resource.type}:${resource.slug}`)
    if (slugOwner && slugOwner !== resource.id) conflicts.push(`${resource.type} slug ${resource.slug} belongs to ${slugOwner}.`)
  }
  for (const category of snapshot.categories) {
    const nameOwner = categoryNameOwner.get(category.name)
    const slugOwner = categorySlugOwner.get(category.slug)
    if (nameOwner && nameOwner !== category.id) conflicts.push(`Category name ${category.name} belongs to ${nameOwner}.`)
    if (slugOwner && slugOwner !== category.id) conflicts.push(`Category slug ${category.slug} belongs to ${slugOwner}.`)
  }
  for (const tag of snapshot.tags) {
    const nameOwner = tagNameOwner.get(tag.name)
    const slugOwner = tagSlugOwner.get(tag.slug)
    if (nameOwner && nameOwner !== tag.id) conflicts.push(`Tag name ${tag.name} belongs to ${nameOwner}.`)
    if (slugOwner && slugOwner !== tag.id) conflicts.push(`Tag slug ${tag.slug} belongs to ${slugOwner}.`)
  }
  for (const asset of snapshot.assets) {
    const owner = assetKeyOwner.get(asset.key)
    if (owner && owner !== asset.id) conflicts.push(`Asset key ${asset.key} belongs to ${owner}.`)
  }
  for (const route of snapshot.routes) {
    const owner = routeOwner.get(route.path)
    if (owner && owner !== route.resourceId) conflicts.push(`Route ${route.path} belongs to ${owner}.`)
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
  }
}

export async function applyContentImport(bundleInput: unknown) {
  const { bundle, snapshot, plan } = await planContentImport(bundleInput)
  if (plan.conflicts.length) {
    const error = new Error('Content bundle conflicts with existing unique paths or slugs.')
    Object.assign(error, { conflicts: plan.conflicts })
    throw error
  }

  await runBatches(snapshot.categories.map((row) => db.insert(categories).values({
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
  await runBatches(snapshot.categories.filter((row) => row.parentId).map((row) =>
    db.update(categories).set({ parentId: row.parentId }).where(eq(categories.id, row.id))))

  await runBatches(snapshot.tags.map((row) => db.insert(tags).values({ ...row, createdAt: new Date(row.createdAt) }).onConflictDoUpdate({
    target: tags.id,
    set: { name: row.name, slug: row.slug },
  })))

  await runBatches(snapshot.assets.map((row) => db.insert(assets).values({
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

  await runBatches(snapshot.resources.map((row) => db.insert(resources).values({
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
    authorId: null,
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
      publishedAt: date(row.publishedAt), scheduledAt: date(row.scheduledAt), updatedAt: new Date(row.updatedAt),
    },
  })))

  const revisionQueries = snapshot.resources.flatMap((resource) => resource.revisions.map((revision) =>
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
      createdBy: null,
      createdAt: new Date(revision.createdAt),
    }).onConflictDoUpdate({
      target: resourceRevisions.id,
      set: {
        version: revision.version, title: revision.title, slug: revision.slug, path: revision.path,
        description: revision.description, visibility: revision.visibility, content: revision.content,
        contentFormat: revision.contentFormat, metadataJson: JSON.stringify(revision.metadata),
        sourceHash: revision.sourceHash, changeSummary: revision.changeSummary,
      },
    })))
  await runBatches(revisionQueries)
  await runBatches(snapshot.resources.map((row) => db.update(resources).set({
    coverAssetId: row.coverAssetId,
    currentRevisionId: row.currentRevisionId,
    publishedRevisionId: row.publishedRevisionId,
  }).where(eq(resources.id, row.id))))

  const importedIds = snapshot.resources.map((resource) => resource.id)
  // The relation cleanup binds each id twice (source and target). Keep the
  // statement below D1's 100-variable ceiling.
  for (const group of chunks(importedIds, 40)) {
    await db.batch([
      db.delete(resourceRoutes).where(inArray(resourceRoutes.resourceId, group)),
      db.delete(resourceCategories).where(inArray(resourceCategories.resourceId, group)),
      db.delete(resourceTags).where(inArray(resourceTags.resourceId, group)),
      db.delete(resourceAssets).where(inArray(resourceAssets.resourceId, group)),
      db.delete(collectionItems).where(inArray(collectionItems.collectionResourceId, group)),
      db.delete(resourceRelations).where(or(
        inArray(resourceRelations.sourceResourceId, group),
        inArray(resourceRelations.targetResourceId, group),
      )),
    ] as const)
  }

  await runBatches(snapshot.articles.map((row) => db.insert(articles).values(row).onConflictDoUpdate({
    target: articles.resourceId,
    set: { toc: row.toc, share: row.share, giscus: row.giscus, searchable: row.searchable, readingMinutes: row.readingMinutes },
  })))
  await runBatches(snapshot.documents.map((row) => db.insert(documents).values({ ...row, syncedAt: date(row.syncedAt) }).onConflictDoUpdate({
    target: documents.resourceId,
    set: {
      sourceType: row.sourceType, repository: row.repository, sourcePath: row.sourcePath,
      commit: row.commit, syncStatus: row.syncStatus, syncedAt: date(row.syncedAt),
    },
  })))
  await runBatches(snapshot.albums.map((row) => db.insert(resourceAlbums).values({ ...row, releaseDate: date(row.releaseDate) }).onConflictDoUpdate({
    target: resourceAlbums.resourceId,
    set: { artist: row.artist, color: row.color, releaseDate: date(row.releaseDate), sortOrder: row.sortOrder },
  })))
  await runBatches(snapshot.tracks.map((row) => db.insert(tracks).values(row).onConflictDoUpdate({
    target: tracks.resourceId,
    set: {
      albumResourceId: row.albumResourceId, audioAssetId: row.audioAssetId, externalUrl: row.externalUrl,
      sourceType: row.sourceType, duration: row.duration, durationSeconds: row.durationSeconds,
      trackNumber: row.trackNumber, lyrics: row.lyrics,
    },
  })))
  await runBatches(snapshot.collections.map((row) => db.insert(collections).values(row).onConflictDoUpdate({
    target: collections.resourceId,
    set: { layout: row.layout },
  })))

  await runBatches(snapshot.routes.map((row) => db.insert(resourceRoutes).values({ ...row, createdAt: new Date(row.createdAt) }).onConflictDoUpdate({
    target: resourceRoutes.path,
    set: { resourceId: row.resourceId, canonical: row.canonical },
  })))
  await runBatches(snapshot.categoryLinks.map((row) => db.insert(resourceCategories).values(row).onConflictDoNothing()))
  await runBatches(snapshot.tagLinks.map((row) => db.insert(resourceTags).values(row).onConflictDoNothing()))
  await runBatches(snapshot.assetLinks.map((row) => db.insert(resourceAssets).values(row).onConflictDoNothing()))
  await runBatches(snapshot.collectionItems.map((row) => db.insert(collectionItems).values(row).onConflictDoNothing()))
  await runBatches(snapshot.relations.map((row) => db.insert(resourceRelations).values({
    sourceResourceId: row.sourceResourceId,
    targetResourceId: row.targetResourceId,
    relationType: row.relationType,
    sortOrder: row.sortOrder,
    metadataJson: JSON.stringify(row.metadata),
  }).onConflictDoUpdate({
    target: [resourceRelations.sourceResourceId, resourceRelations.targetResourceId, resourceRelations.relationType],
    set: { sortOrder: row.sortOrder, metadataJson: JSON.stringify(row.metadata) },
  })))
  await runBatches(snapshot.redirects.map((row) => db.insert(redirects).values(row).onConflictDoUpdate({
    target: redirects.fromPath,
    set: { toPath: row.toPath, statusCode: row.statusCode },
  })))
  await runBatches(snapshot.publicationEvents.map((row) => db.insert(publicationEvents).values({
    id: row.id,
    resourceId: row.resourceId,
    revisionId: row.revisionId,
    eventType: row.eventType,
    actorId: null,
    dataJson: JSON.stringify(row.data),
    createdAt: new Date(row.createdAt),
  }).onConflictDoNothing()))
  await runBatches(snapshot.settings.map((row) => db.insert(settings).values({
    ...row,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  }).onConflictDoUpdate({
    target: settings.id,
    set: { key: row.key, value: row.value, updatedAt: new Date(row.updatedAt) },
  })))

  await db.run(sql`DELETE FROM resource_search`)
  await db.run(sql`
    INSERT INTO resource_search (resource_id, title, description, content, tokens)
    SELECT r.id, rr.title, coalesce(rr.description, ''), rr.content,
           lower(rr.title || ' ' || coalesce(rr.description, ''))
    FROM resources r
    JOIN resource_revisions rr ON rr.id = r.published_revision_id
    WHERE r.status = 'published'
      AND (r.type <> 'article' OR coalesce(json_extract(rr.metadata_json, '$.search'), 1) = 1)
  `)

  return { schemaVersion: bundle.schemaVersion, generatedAt: bundle.generatedAt, applied: true, plan }
}
