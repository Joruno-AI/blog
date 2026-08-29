import { z } from 'zod'

import { contentFormats, resourceStatuses, resourceTypes, resourceVisibilities } from '@/modules/resources/domain/types'

export const CONTENT_BUNDLE_VERSION = 'joruno-content/v1' as const
export const CONTENT_SNAPSHOT_PATH = '.joruno/content.json' as const

export const bundleFileSchema = z.object({
  path: z.string().trim().min(1).max(1_500),
  kind: z.enum(['content', 'data', 'asset']),
  encoding: z.enum(['utf8', 'base64', 'external']),
  mediaType: z.string().trim().min(1).max(255),
  content: z.string().optional(),
  url: z.string().url().max(4_000).optional(),
  checksum: z.string().max(256).nullable().optional(),
  size: z.number().int().nonnegative().optional(),
}).superRefine((file, context) => {
  try {
    normalizeBundlePath(file.path)
  } catch (error) {
    context.addIssue({ code: 'custom', message: error instanceof Error ? error.message : 'Invalid path' })
  }
  if (file.encoding === 'external' && !file.url) {
    context.addIssue({ code: 'custom', message: 'External files require a URL.', path: ['url'] })
  }
  if (file.encoding !== 'external' && typeof file.content !== 'string') {
    context.addIssue({ code: 'custom', message: 'Embedded files require content.', path: ['content'] })
  }
})

const transferRevisionSchema = z.object({
  id: z.string().min(1),
  version: z.number().int().positive(),
  title: z.string(),
  slug: z.string(),
  path: z.string(),
  description: z.string().nullable(),
  visibility: z.enum(resourceVisibilities),
  content: z.string(),
  contentFormat: z.enum(contentFormats),
  metadata: z.record(z.string(), z.unknown()),
  sourceHash: z.string().nullable(),
  changeSummary: z.string().nullable(),
  createdAt: z.string().datetime(),
})

export const transferResourceSchema = z.object({
  id: z.string().min(1),
  type: z.enum(resourceTypes),
  title: z.string(),
  slug: z.string(),
  path: z.string(),
  description: z.string().nullable(),
  status: z.enum(resourceStatuses),
  visibility: z.enum(resourceVisibilities),
  coverAssetId: z.string().nullable(),
  currentRevisionId: z.string().min(1),
  publishedRevisionId: z.string().nullable(),
  publishedAt: z.string().datetime().nullable(),
  scheduledAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  revisions: z.array(transferRevisionSchema).min(1),
}).superRefine((resource, context) => {
  const ids = new Set(resource.revisions.map((revision) => revision.id))
  if (!ids.has(resource.currentRevisionId)) {
    context.addIssue({ code: 'custom', message: 'Current revision is missing.', path: ['currentRevisionId'] })
  }
  if (resource.publishedRevisionId && !ids.has(resource.publishedRevisionId)) {
    context.addIssue({ code: 'custom', message: 'Published revision is missing.', path: ['publishedRevisionId'] })
  }
})

const categorySchema = z.object({
  id: z.string(), name: z.string(), slug: z.string(), description: z.string().nullable(),
  parentId: z.string().nullable(), order: z.number().int(), createdAt: z.string().datetime(),
})
const tagSchema = z.object({ id: z.string(), name: z.string(), slug: z.string(), createdAt: z.string().datetime() })
const assetSchema = z.object({
  id: z.string(), key: z.string(), url: z.string(), name: z.string(),
  mediaType: z.enum(['image', 'audio', 'video', 'document', 'archive', 'other']),
  mimeType: z.string().nullable(), size: z.number().int().nonnegative(), width: z.number().int().nullable(),
  height: z.number().int().nullable(), durationSeconds: z.number().int().nullable(), checksum: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()), createdAt: z.string().datetime(), updatedAt: z.string().datetime(),
})

export const contentSnapshotSchema = z.object({
  resources: z.array(transferResourceSchema),
  categories: z.array(categorySchema),
  tags: z.array(tagSchema),
  assets: z.array(assetSchema),
  articles: z.array(z.object({
    resourceId: z.string(), toc: z.boolean(), share: z.boolean(), giscus: z.boolean(),
    searchable: z.boolean(), readingMinutes: z.number().nullable(),
  })),
  documents: z.array(z.object({
    resourceId: z.string(), sourceType: z.enum(['git', 'remote', 'upload', 'manual']),
    repository: z.string().nullable(), sourcePath: z.string().nullable(), commit: z.string().nullable(),
    syncStatus: z.enum(['idle', 'pending', 'syncing', 'ready', 'failed']), syncedAt: z.string().datetime().nullable(),
  })),
  albums: z.array(z.object({
    resourceId: z.string(), artist: z.string(), color: z.string().nullable(),
    releaseDate: z.string().datetime().nullable(), sortOrder: z.number().int(),
  })),
  tracks: z.array(z.object({
    resourceId: z.string(), albumResourceId: z.string(), audioAssetId: z.string().nullable(),
    externalUrl: z.string().nullable(), sourceType: z.enum(['upload', 'external']), duration: z.string().nullable(),
    durationSeconds: z.number().int().nullable(), trackNumber: z.number().int(), lyrics: z.string().nullable(),
  })),
  collections: z.array(z.object({ resourceId: z.string(), layout: z.enum(['list', 'grid', 'chapters', 'timeline']) })),
  categoryLinks: z.array(z.object({ resourceId: z.string(), categoryId: z.string() })),
  tagLinks: z.array(z.object({ resourceId: z.string(), tagId: z.string() })),
  assetLinks: z.array(z.object({
    resourceId: z.string(), assetId: z.string(),
    role: z.enum(['cover', 'body', 'audio', 'video', 'attachment', 'gallery', 'source', 'derived']),
    sortOrder: z.number().int(),
  })),
  collectionItems: z.array(z.object({
    collectionResourceId: z.string(), resourceId: z.string(), section: z.string().nullable(),
    note: z.string().nullable(), sortOrder: z.number().int(),
  })),
  relations: z.array(z.object({
    sourceResourceId: z.string(), targetResourceId: z.string(),
    relationType: z.enum(['part_of', 'prerequisite', 'continues', 'related_to', 'references', 'generated_from', 'alternative_to']),
    sortOrder: z.number().int(), metadata: z.record(z.string(), z.unknown()),
  })),
  routes: z.array(z.object({
    path: z.string(), resourceId: z.string(), canonical: z.boolean(), createdAt: z.string().datetime(),
  })),
  redirects: z.array(z.object({ fromPath: z.string(), toPath: z.string(), statusCode: z.number().int() })),
  publicationEvents: z.array(z.object({
    id: z.string(), resourceId: z.string(), revisionId: z.string().nullable(),
    eventType: z.enum(['created', 'draft_saved', 'scheduled', 'published', 'unpublished', 'archived', 'restored']),
    data: z.record(z.string(), z.unknown()), createdAt: z.string().datetime(),
  })),
  settings: z.array(z.object({
    id: z.string(), key: z.string(), value: z.string().nullable(),
    createdAt: z.string().datetime(), updatedAt: z.string().datetime(),
  })),
})

export const contentBundleSchema = z.object({
  schemaVersion: z.literal(CONTENT_BUNDLE_VERSION),
  generatedAt: z.string().datetime(),
  source: z.object({ repository: z.string().nullable(), ref: z.string().nullable(), commit: z.string().nullable() }),
  files: z.array(bundleFileSchema).max(20_000),
}).superRefine((bundle, context) => {
  const seen = new Set<string>()
  for (let index = 0; index < bundle.files.length; index += 1) {
    const path = normalizeBundlePath(bundle.files[index].path)
    if (seen.has(path)) context.addIssue({ code: 'custom', message: `Duplicate file path: ${path}`, path: ['files', index, 'path'] })
    seen.add(path)
  }
})

export type BundleFile = z.infer<typeof bundleFileSchema>
export type ContentBundle = z.infer<typeof contentBundleSchema>
export type ContentSnapshot = z.infer<typeof contentSnapshotSchema>

export function normalizeBundlePath(input: string) {
  const path = input.trim().replaceAll('\\', '/').replace(/^\.\//, '')
  if (!path || path.startsWith('/') || path.includes('\0')) throw new Error('Bundle paths must be relative.')
  const segments = path.split('/')
  if (segments.some((segment) => !segment || segment === '.' || segment === '..')) {
    throw new Error('Bundle paths cannot contain empty, current, or parent segments.')
  }
  return segments.join('/')
}

export function readEmbeddedFile(file: BundleFile) {
  if (file.encoding === 'external') throw new Error(`File ${file.path} is external.`)
  if (file.encoding === 'utf8') return file.content ?? ''
  const binary = atob(file.content ?? '')
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}
