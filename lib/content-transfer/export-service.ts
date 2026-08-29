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
  tags,
  tracks,
  settings,
} from '@/lib/db/schema'

import {
  CONTENT_BUNDLE_VERSION,
  CONTENT_SNAPSHOT_PATH,
  contentBundleSchema,
  contentSnapshotSchema,
  normalizeBundlePath,
  type BundleFile,
  type ContentBundle,
} from './contract'
import { articleMarkdownPath, serializeArticleMarkdown } from './markdown'

function iso(value: Date | null) {
  return value ? value.toISOString() : null
}

function metadata(value: string) {
  try {
    const parsed: unknown = JSON.parse(value)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {}
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

export async function createContentBundle(input: {
  repository?: string | null
  ref?: string | null
  commit?: string | null
} = {}): Promise<ContentBundle> {
  const [
    resourceRows,
    revisionRows,
    categoryRows,
    tagRows,
    assetRows,
    articleRows,
    documentRows,
    albumRows,
    trackRows,
    collectionRows,
    categoryLinks,
    tagLinks,
    assetLinks,
    itemRows,
    relationRows,
    routeRows,
    redirectRows,
    publicationEventRows,
    settingRows,
    postRows,
  ] = await Promise.all([
    db.select().from(resources),
    db.select().from(resourceRevisions),
    db.select().from(categories),
    db.select().from(tags),
    db.select().from(assets),
    db.select().from(articles),
    db.select().from(documents),
    db.select().from(resourceAlbums),
    db.select().from(tracks),
    db.select().from(collections),
    db.select().from(resourceCategories),
    db.select().from(resourceTags),
    db.select().from(resourceAssets),
    db.select().from(collectionItems),
    db.select().from(resourceRelations),
    db.select().from(resourceRoutes),
    db.select().from(redirects),
    db.select().from(publicationEvents),
    db.select().from(settings),
    getPostsWithCategoryPath({ limit: 1_000 }),
  ])

  const revisionsByResource = new Map<string, typeof revisionRows>()
  for (const revision of revisionRows) {
    const current = revisionsByResource.get(revision.resourceId) ?? []
    current.push(revision)
    revisionsByResource.set(revision.resourceId, current)
  }

  const snapshot = contentSnapshotSchema.parse({
    resources: resourceRows.map((row) => ({
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
      publishedAt: iso(row.publishedAt),
      scheduledAt: iso(row.scheduledAt),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      revisions: (revisionsByResource.get(row.id) ?? []).map((revision) => ({
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
        createdAt: revision.createdAt.toISOString(),
      })),
    })),
    categories: categoryRows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })),
    tags: tagRows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })),
    assets: assetRows.map((row) => ({
      ...row,
      metadata: metadata(row.metadataJson),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      metadataJson: undefined,
    })),
    articles: articleRows,
    documents: documentRows.map((row) => ({ ...row, syncedAt: iso(row.syncedAt) })),
    albums: albumRows.map((row) => ({ ...row, releaseDate: iso(row.releaseDate) })),
    tracks: trackRows,
    collections: collectionRows,
    categoryLinks,
    tagLinks,
    assetLinks,
    collectionItems: itemRows,
    relations: relationRows.map((row) => ({ ...row, metadata: metadata(row.metadataJson), metadataJson: undefined })),
    routes: routeRows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })),
    redirects: redirectRows.map(({ fromPath, toPath, statusCode }) => ({ fromPath, toPath, statusCode })),
    publicationEvents: publicationEventRows.map((row) => ({
      id: row.id,
      resourceId: row.resourceId,
      revisionId: row.revisionId,
      eventType: row.eventType,
      data: metadata(row.dataJson),
      createdAt: row.createdAt.toISOString(),
    })),
    settings: settingRows.map((row) => ({
      ...row,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    })),
  })

  const files: BundleFile[] = [{
    path: CONTENT_SNAPSHOT_PATH,
    kind: 'data',
    encoding: 'utf8',
    mediaType: 'application/json',
    content: `${JSON.stringify(snapshot, null, 2)}\n`,
  }]

  for (const post of postRows) {
    files.push({
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
    })
  }

  const resourcesByType = new Map<string, typeof snapshot.resources>()
  for (const resource of snapshot.resources) {
    const entries = resourcesByType.get(resource.type) ?? []
    entries.push(resource)
    resourcesByType.set(resource.type, entries)
  }
  for (const [type, entries] of resourcesByType) {
    if (!entries || type === 'article') continue
    files.push({
      path: `.joruno/resources/${type}.json`,
      kind: 'data',
      encoding: 'utf8',
      mediaType: 'application/json',
      content: `${JSON.stringify(entries, null, 2)}\n`,
    })
  }

  for (const asset of snapshot.assets) {
    files.push({
      path: assetBundlePath(asset.key, asset.id),
      kind: 'asset',
      encoding: 'external',
      mediaType: asset.mimeType ?? 'application/octet-stream',
      url: asset.url,
      checksum: asset.checksum,
      size: asset.size,
    })
  }

  return contentBundleSchema.parse({
    schemaVersion: CONTENT_BUNDLE_VERSION,
    generatedAt: new Date().toISOString(),
    source: {
      repository: input.repository ?? null,
      ref: input.ref ?? null,
      commit: input.commit ?? null,
    },
    files,
  })
}
