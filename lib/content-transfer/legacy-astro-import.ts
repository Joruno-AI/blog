import { eq, sql } from 'drizzle-orm'

import { db } from '@/lib/db'
import { getPostById } from '@/lib/db/queries/posts'
import { assets, categories, tags } from '@/lib/db/schema'
import { createArticle, updateArticle } from '@/modules/articles/application/article-service'
import { createGenericResource, updateGenericResource } from '@/modules/resources/application/resource-service'
import { getStudioResource } from '@/modules/resources/application/queries'
import { resourceSlug } from '@/modules/resources/domain/slug'
import type { ResourceType } from '@/modules/resources/domain/types'
import { assertContentFitsD1 } from '@/modules/resources/domain/types'

import { contentBundleSchema, readEmbeddedFile, type BundleFile, type ContentBundle } from './contract'
import { stageImportRecords, type ImportStageRecord } from './import-staging'
import { isArticleMarkdownPath, parseArticleMarkdown } from './markdown'

export interface LegacyEntry {
  filePath: string
  type: ResourceType
  slug: string
  path: string
  article: boolean
}

interface LegacyProjectEntry {
  id: string
  link: string
  desc: string
  icon: string
  category: string
}

interface LegacyStreamEntry {
  id: string
  link: string
  pubDate: Date
  radio: boolean
  video: boolean
  platform: string
}

export interface LegacySkillEntry {
  id: string
  name: string
  author: string
  desc: string
  descZh: string
  category: string
  stars: number
  installs: number | null
  qualityScore: number
  securityGrade: string
  platforms: string[]
  tags: string[]
  official: boolean
  keywords: string
  pushedAt: Date | null
  createdAt: Date | null
  language: string | null
  starsDelta: number | null
}

export interface LegacyMusicSongEntry {
  id: string
  name: string
  duration: string
  url: string | null
  hasLyrics: boolean
  quality: Record<string, unknown> | null
}

export interface LegacyMusicAlbumEntry {
  id: string
  name: string
  artist: string
  description: string | null
  cover: string | null
  color: string | null
  releaseDate: Date | null
  songs: LegacyMusicSongEntry[]
}

export interface LegacyPhotoEntry {
  id: string
  desc: string
}

type LegacyCandidate =
  | { kind: 'markdown'; entry: LegacyEntry; source: string }
  | { kind: 'project'; entry: LegacyEntry; project: LegacyProjectEntry; order: number }
  | { kind: 'stream'; entry: LegacyEntry; stream: LegacyStreamEntry; order: number }
  | { kind: 'skill'; entry: LegacyEntry; skill: LegacySkillEntry; readme: string; order: number }
  | { kind: 'album'; entry: LegacyEntry; album: LegacyMusicAlbumEntry; order: number }
  | { kind: 'track'; entry: LegacyEntry; albumEntry: LegacyEntry; song: LegacyMusicSongEntry; order: number }
  | { kind: 'photo'; entry: LegacyEntry; photo: LegacyPhotoEntry; order: number }
  | { kind: 'home'; entry: LegacyEntry; source: string }
  | { kind: 'raw-data'; entry: LegacyEntry; source: string; title: string }

export function legacyContentEntry(filePath: string): LegacyEntry | null {
  const article = filePath.match(/^src\/content\/blog\/(?:.*\/)?([^/]+)\.(?:md|mdx)$/i)
  if (article) return { filePath, type: 'article', slug: article[1], path: `/blog/${article[1]}`, article: true }
  const short = filePath.match(/^src\/content\/shorts\/(.+)\.(?:md|mdx)$/i)
  if (short) return { filePath, type: 'short', slug: short[1], path: `/shorts/${short[1]}`, article: false }
  const changelog = filePath.match(/^src\/content\/changelog\/(.+)\.(?:md|mdx)$/i)
  if (changelog) {
    // Astro serializes dotted changelog IDs without periods in the route
    // parameter (`3.0.0.md` -> `/changelog/300/`). Keep the CMS identity and
    // route aligned with the public URL instead of the source filename.
    const slug = changelog[1].replaceAll('.', '')
    return { filePath, type: 'document', slug, path: `/changelog/${slug}`, article: false }
  }
  return null
}

/**
 * Older imports used the dotted changelog filename as the public path even
 * though Astro removes periods from the generated route parameter. Retaining
 * that old path as an identity candidate lets a re-import migrate the record
 * instead of creating a duplicate document.
 */
export function legacyIdentityPaths(entry: LegacyEntry) {
  const changelog = entry.filePath.match(/^src\/content\/changelog\/(.+)\.(?:md|mdx)$/i)
  const legacyPath = changelog ? `/changelog/${changelog[1]}` : null
  return legacyPath && legacyPath !== entry.path
    ? [entry.path, legacyPath]
    : [entry.path]
}

export function legacyIdentityKey(entry: LegacyEntry) {
  return `${entry.type}:${entry.path}`
}

export interface LegacyIdentity {
  id: string
  currentRevisionId?: string | null
  publishedRevisionId?: string | null
  sourceHash?: string | null
  metadataJson?: string
  status?: string
  publishedAt?: number | null
  scheduledAt?: number | null
  updatedAt?: number | null
  title?: string
  slug?: string
  path?: string
  description?: string | null
  visibility?: string
  content?: string
  contentFormat?: string
}

export type LegacyIdentityMap = Map<string, LegacyIdentity>
export type LegacyIdentityLookup = (entries: readonly LegacyEntry[]) => Promise<LegacyIdentityMap>

/** Resolves every canonical/legacy path in one D1 query and prefers canonical paths. */
export const findLegacyResourceIdentities: LegacyIdentityLookup = async (candidateEntries) => {
  if (candidateEntries.length === 0) return new Map()
  const requested = candidateEntries.flatMap((entry) => legacyIdentityPaths(entry).map((path, priority) => ({
    key: legacyIdentityKey(entry),
    type: entry.type,
    path,
    priority,
  })))
  const rows = await db.all<{
    key: string
    id: string
    priority: number
    currentRevisionId: string | null
    publishedRevisionId: string | null
    sourceHash: string | null
    metadataJson: string
    status: string
    publishedAt: number | null
    scheduledAt: number | null
    updatedAt: number
    title: string
    slug: string
    path: string
    description: string | null
    visibility: string
    content: string
    contentFormat: string
  }>(sql`
    SELECT
      json_extract(requested.value, '$.key') AS key,
      imported.id AS id,
      cast(json_extract(requested.value, '$.priority') AS integer) AS priority,
      imported.current_revision_id AS currentRevisionId,
      imported.published_revision_id AS publishedRevisionId,
      current_revision.source_hash AS sourceHash,
      current_revision.metadata_json AS metadataJson,
      imported.status AS status,
      imported.published_at AS publishedAt,
      imported.scheduled_at AS scheduledAt,
      imported.updated_at AS updatedAt,
      current_revision.title AS title,
      current_revision.slug AS slug,
      current_revision.path AS path,
      current_revision.description AS description,
      current_revision.visibility AS visibility,
      current_revision.content AS content,
      current_revision.content_format AS contentFormat
    FROM json_each(${JSON.stringify(requested)}) AS requested
    JOIN resources AS imported
      ON imported.type = json_extract(requested.value, '$.type')
     AND imported.path = json_extract(requested.value, '$.path')
    JOIN resource_revisions AS current_revision ON current_revision.id = imported.current_revision_id
    ORDER BY priority ASC
  `)
  const identities: LegacyIdentityMap = new Map()
  for (const row of rows) {
    if (!identities.has(row.key)) identities.set(row.key, row)
  }
  return identities
}

function parseJson(value: string) {
  try {
    const parsed: unknown = JSON.parse(value)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {}
  } catch {
    return {}
  }
}

export function parseLegacyProjects(source: string): LegacyProjectEntry[] {
  try {
    const value: unknown = JSON.parse(source)
    if (!Array.isArray(value)) return []
    return value.flatMap((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return []
      const record = item as Record<string, unknown>
      const id = typeof record.id === 'string' ? record.id.trim() : ''
      const link = typeof record.link === 'string' ? record.link.trim() : ''
      const desc = typeof record.desc === 'string' ? record.desc.trim() : ''
      const icon = typeof record.icon === 'string' ? record.icon.trim() : ''
      const category = typeof record.category === 'string' ? record.category.trim() : ''
      return id && link && desc && category ? [{ id, link, desc, icon, category }] : []
    })
  } catch {
    return []
  }
}

export function parseLegacyStreams(source: string): LegacyStreamEntry[] {
  try {
    const value: unknown = JSON.parse(source)
    if (!Array.isArray(value)) return []
    return value.flatMap((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return []
      const record = item as Record<string, unknown>
      const id = typeof record.id === 'string' ? record.id.trim() : ''
      const link = typeof record.link === 'string' ? record.link.trim() : ''
      const pubDate = new Date(typeof record.pubDate === 'string' ? record.pubDate : '')
      if (!id || !link || Number.isNaN(pubDate.valueOf())) return []
      return [{
        id,
        link,
        pubDate,
        radio: record.radio === true,
        video: record.video === true,
        platform: typeof record.platform === 'string' ? record.platform.trim() : '',
      }]
    })
  } catch {
    return []
  }
}

function stringList(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean)
    : []
}

function optionalDate(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) return null
  const date = new Date(value)
  return Number.isNaN(date.valueOf()) ? null : date
}

export function parseLegacySkills(source: string): LegacySkillEntry[] {
  try {
    const value: unknown = JSON.parse(source)
    if (!Array.isArray(value)) return []
    return value.flatMap((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return []
      const record = item as Record<string, unknown>
      const id = typeof record.id === 'string' ? record.id.trim() : ''
      const name = typeof record.name === 'string' ? record.name.trim() : ''
      const author = typeof record.author === 'string' ? record.author.trim() : ''
      const category = typeof record.category === 'string' ? record.category.trim() : ''
      const stars = typeof record.stars === 'number' && Number.isFinite(record.stars) ? record.stars : null
      const qualityScore = typeof record.qualityScore === 'number' && Number.isFinite(record.qualityScore)
        ? record.qualityScore
        : null
      if (!id || !name || !author || !category || stars === null || qualityScore === null || !id.includes('/')) return []
      return [{
        id,
        name,
        author,
        desc: typeof record.desc === 'string' ? record.desc.trim() : '',
        descZh: typeof record.descZh === 'string' ? record.descZh.trim() : '',
        category,
        stars,
        installs: typeof record.installs === 'number' && Number.isFinite(record.installs) ? record.installs : null,
        qualityScore,
        securityGrade: typeof record.securityGrade === 'string' ? record.securityGrade.trim() || 'unknown' : 'unknown',
        platforms: stringList(record.platforms),
        tags: stringList(record.tags),
        official: record.official === true,
        keywords: typeof record.keywords === 'string' ? record.keywords.trim() : '',
        pushedAt: optionalDate(record.pushedAt),
        createdAt: optionalDate(record.createdAt),
        language: typeof record.language === 'string' ? record.language.trim() || null : null,
        starsDelta: typeof record.starsDelta === 'number' && Number.isFinite(record.starsDelta) ? record.starsDelta : null,
      }]
    })
  } catch {
    return []
  }
}

export function parseLegacyMusicCatalog(source: string): LegacyMusicAlbumEntry[] {
  try {
    const value: unknown = JSON.parse(source)
    if (!Array.isArray(value)) return []
    return value.flatMap((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return []
      const album = item as Record<string, unknown>
      const id = typeof album.id === 'string' ? album.id.trim() : ''
      const name = typeof album.name === 'string' ? album.name.trim() : ''
      const artist = typeof album.artist === 'string' ? album.artist.trim() : ''
      if (!id || !name || !artist || !Array.isArray(album.songs)) return []
      const songs = album.songs.flatMap((candidate): LegacyMusicSongEntry[] => {
        if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return []
        const song = candidate as Record<string, unknown>
        const songId = typeof song.id === 'string' ? song.id.trim() : ''
        const songName = typeof song.name === 'string' ? song.name.trim() : ''
        if (!songId || !songName) return []
        return [{
          id: songId,
          name: songName,
          duration: typeof song.duration === 'string' && song.duration ? song.duration : '0:00',
          url: typeof song.url === 'string' && song.url ? song.url : null,
          hasLyrics: song.hasLyrics === true,
          quality: song.quality && typeof song.quality === 'object' && !Array.isArray(song.quality)
            ? song.quality as Record<string, unknown>
            : null,
        }]
      })
      const parsedReleaseDate = typeof album.releaseDate === 'string' ? new Date(album.releaseDate) : null
      return [{
        id,
        name,
        artist,
        description: typeof album.description === 'string' ? album.description : null,
        cover: typeof album.cover === 'string' && album.cover ? album.cover : null,
        color: typeof album.color === 'string' && album.color ? album.color : null,
        releaseDate: parsedReleaseDate && !Number.isNaN(parsedReleaseDate.valueOf()) ? parsedReleaseDate : null,
        songs,
      }]
    })
  } catch {
    return []
  }
}

export function parseLegacyPhotos(source: string): LegacyPhotoEntry[] {
  try {
    const value: unknown = JSON.parse(source)
    if (!Array.isArray(value)) return []
    return value.flatMap((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return []
      const photo = item as Record<string, unknown>
      const id = typeof photo.id === 'string' ? photo.id.trim() : ''
      if (!id) return []
      return [{ id, desc: typeof photo.desc === 'string' ? photo.desc.trim() : '' }]
    })
  } catch {
    return []
  }
}

async function ensureCategory(name: string | null) {
  if (!name) return null
  const normalizedName = name.split('/').at(-1)?.trim()
  if (!normalizedName) return null
  const [existing] = await db.select().from(categories).where(eq(categories.name, normalizedName)).limit(1)
  if (existing) return existing.id
  const baseSlug = resourceSlug(normalizedName)
  const [slugOwner] = await db.select({ id: categories.id }).from(categories).where(eq(categories.slug, baseSlug)).limit(1)
  const id = crypto.randomUUID()
  const slug = slugOwner ? `${baseSlug}-${id.slice(0, 8)}` : baseSlug
  await db.insert(categories).values({ id, name: normalizedName, slug, parentId: null, order: 0, createdAt: new Date() })
  return id
}

async function ensureTags(names: string[]) {
  const requested = [...new Set(names.map((name) => name.trim()).filter(Boolean))]
    .map((name) => ({ name, slug: resourceSlug(name) }))
  if (requested.length === 0) return []
  const existing = await db.all<{ id: string; name: string; slug: string }>(sql`
    SELECT id, name, slug
    FROM tags
    WHERE name IN (SELECT json_extract(value, '$.name') FROM json_each(${JSON.stringify(requested)}))
       OR slug IN (SELECT json_extract(value, '$.slug') FROM json_each(${JSON.stringify(requested)}))
  `)
  const byName = new Map(existing.map((row) => [row.name, row]))
  const occupiedSlugs = new Set(existing.map((row) => row.slug))
  const created: Array<{ id: string; name: string; slug: string; createdAt: Date }> = []
  for (const item of requested) {
    if (byName.has(item.name)) continue
    const id = crypto.randomUUID()
    const slug = occupiedSlugs.has(item.slug) ? `${item.slug}-${id.slice(0, 8)}` : item.slug
    occupiedSlugs.add(slug)
    const row = { id, name: item.name, slug, createdAt: new Date() }
    created.push(row)
    byName.set(item.name, row)
  }
  if (created.length) await db.insert(tags).values(created)
  return requested.map((item) => byName.get(item.name)!.id)
}

const LEGACY_MAPPED_CONTENT_FILES = new Set([
  'src/content/home/index.md',
  'src/content/projects/data.json',
  'src/content/streams/data.json',
  'src/content/skills/data.json',
  'src/content/skills/desc-zh.json',
  'src/content/skills/meta.json',
  'src/content/music/fallback-catalog.json',
  'src/content/music/data.json',
  'src/content/music/audio-quality.json',
  'src/content/music/lyric-alignment.json',
  'src/content/photos/data.json',
])

function rawDataCandidate(file: BundleFile, source: string): LegacyCandidate {
  const slug = resourceSlug(file.path)
  return {
    kind: 'raw-data',
    entry: {
      filePath: `${file.path}#raw`,
      type: 'document',
      slug,
      path: `/internal/source-data/${slug}`,
      article: false,
    },
    source,
    title: `Imported source: ${file.path}`,
  }
}

function photoAssetSpec(photo: LegacyPhotoEntry, rewriteUrl: (value: string) => string = (value) => value) {
  const slug = resourceSlug(photo.id)
  return {
    id: `asset:legacy-photo:${slug}`,
    key: `legacy-photos/${slug}`,
    url: rewriteUrl(photo.id),
  }
}

function entries(bundle: ContentBundle): LegacyCandidate[] {
  const readmes = new Map(bundle.files.flatMap((file) => {
    if (file.encoding === 'external') return []
    const match = file.path.match(/^src\/data\/skills-readmes\/(.+)\.md$/i)
    return match ? [[match[1], readEmbeddedFile(file)] as const] : []
  }))
  const fallbackCatalog = bundle.files.find((file) => file.path === 'src/content/music/fallback-catalog.json' && file.encoding !== 'external')
  const legacyCatalog = bundle.files.find((file) => file.path === 'src/content/music/data.json' && file.encoding !== 'external')
  const authoritativeCatalog = fallbackCatalog ?? legacyCatalog
  return bundle.files.flatMap((file): LegacyCandidate[] => {
    if (file.encoding === 'external') return []
    const source = readEmbeddedFile(file)
    const raw = file.path.endsWith('.json') && LEGACY_MAPPED_CONTENT_FILES.has(file.path)
      ? [rawDataCandidate(file, source)]
      : []
    if (file.path === 'src/content/home/index.md') {
      return [{
        kind: 'home',
        entry: { filePath: file.path, type: 'document', slug: 'home', path: '/', article: false },
        source,
      }]
    }
    if (file.path === 'src/content/projects/data.json') {
      return [...parseLegacyProjects(source).map((project, order) => ({
        kind: 'project' as const,
        entry: {
          filePath: file.path,
          type: 'project' as const,
          slug: resourceSlug(project.id),
          path: `/projects/${resourceSlug(project.id)}`,
          article: false,
        },
        project,
        order,
      })), ...raw]
    }
    if (file.path === 'src/content/streams/data.json') {
      return [...parseLegacyStreams(source).map((stream, order) => ({
        kind: 'stream' as const,
        entry: {
          filePath: file.path,
          type: 'document' as const,
          slug: resourceSlug(stream.id),
          path: `/streams/${resourceSlug(stream.id)}`,
          article: false,
        },
        stream,
        order,
      })), ...raw]
    }
    if (file.path === 'src/content/skills/data.json') {
      return [...parseLegacySkills(source).map((skill, order) => ({
        kind: 'skill' as const,
        entry: {
          filePath: `${file.path}#${skill.id}`,
          type: 'tool' as const,
          slug: skill.id,
          path: `/agent/${skill.id}`,
          article: false,
        },
        skill,
        readme: readmes.get(skill.id.replace('/', '__')) ?? '',
        order,
      })), ...raw]
    }
    if (file === authoritativeCatalog) {
      const catalog = parseLegacyMusicCatalog(source)
      const music = catalog.flatMap((album, order): LegacyCandidate[] => {
        const albumEntry: LegacyEntry = {
          filePath: `${file.path}#album:${album.id}`,
          type: 'album',
          slug: album.id,
          path: `/music/albums/${album.id}`,
          article: false,
        }
        return [
          { kind: 'album', entry: albumEntry, album, order },
          ...album.songs.map((song, songOrder): LegacyCandidate => ({
            kind: 'track',
            entry: {
              filePath: `${file.path}#track:${song.id}`,
              type: 'track',
              slug: song.id,
              path: `/music/tracks/${song.id}`,
              article: false,
            },
            albumEntry,
            song,
            order: songOrder,
          })),
        ]
      })
      return [...music, ...raw]
    }
    if (file.path === 'src/content/photos/data.json') {
      const photos = parseLegacyPhotos(source).map((photo, order): LegacyCandidate => {
        const slug = resourceSlug(photo.id)
        return {
          kind: 'photo',
          entry: {
            filePath: `${file.path}#photo:${slug}`,
            type: 'photo',
            slug,
            path: `/photos/${slug}`,
            article: false,
          },
          photo,
          order,
        }
      })
      return [...photos, ...raw]
    }
    const entry = legacyContentEntry(file.path)
    if (entry) return [{ kind: 'markdown' as const, entry, source }]
    return raw
  })
}

function assertNoUnmappedLegacyContent(bundle: ContentBundle) {
  const unsupported = bundle.files.filter((file) => {
    if (!file.path.startsWith('src/content/') || file.encoding === 'external') return false
    if (LEGACY_MAPPED_CONTENT_FILES.has(file.path)) return false
    return legacyContentEntry(file.path) === null
  }).map((file) => file.path)
  if (unsupported.length) {
    const sample = unsupported.slice(0, 8).join(', ')
    throw new Error(`Invalid legacy content bundle: unsupported source files would be dropped (${sample}${unsupported.length > 8 ? ', ...' : ''}).`)
  }
}

function legacyAssets(bundle: ContentBundle) {
  return bundle.files.filter((file): file is BundleFile & { encoding: 'external'; url: string } =>
    file.kind === 'asset' && file.encoding === 'external' && typeof file.url === 'string')
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function legacyImportFingerprint(value: {
  type: string
  title: string
  slug?: string
  path?: string
  description?: string | null
  visibility?: string
  content?: string
  contentFormat?: string
  metadata?: Record<string, unknown>
}) {
  return sha256(JSON.stringify(value))
}

export async function legacyImportStateFingerprint(value: {
  sourceFingerprint: string
  status: string | null | undefined
  publishedRevisionId: string | null | undefined
  publishedAt: Date | number | string | null | undefined
  scheduledAt: Date | number | string | null | undefined
}) {
  const timestamp = (input: Date | number | string | null | undefined) => {
    if (input === null || input === undefined) return null
    const parsed = input instanceof Date
      ? input
      : typeof input === 'number' ? new Date(input * 1_000) : new Date(input)
    // D1 stores timestamps in whole seconds. Hash the persisted precision so
    // a round-trip cannot turn `.123Z` into a false Studio conflict.
    return new Date(Math.floor(parsed.valueOf() / 1_000) * 1_000).toISOString()
  }
  return sha256(JSON.stringify({
    sourceFingerprint: value.sourceFingerprint,
    status: value.status ?? null,
    publishedRevisionId: value.publishedRevisionId ?? null,
    publishedAt: timestamp(value.publishedAt),
    scheduledAt: timestamp(value.scheduledAt),
  }))
}

interface LegacyFrozenIdentity {
  id: string
  currentRevisionId?: string | null
  publishedRevisionId?: string | null
  status?: string
  publishedAt?: number | null
  scheduledAt?: number | null
  updatedAt?: number | null
  importRevisionId?: string | null
  importSourceHash?: string | null
  importStateHash?: string | null
  currentSourceFingerprint?: string | null
  currentStateFingerprint?: string | null
}

function withoutImportMarkers(metadataJson: string | undefined) {
  const metadata = parseJson(metadataJson ?? '{}')
  delete metadata.importSourceHash
  delete metadata.importRevisionId
  delete metadata.importStateHash
  delete metadata.commit
  return metadata
}

export async function legacySourceFingerprint(value: Parameters<typeof legacyImportFingerprint>[0]) {
  const metadata = { ...(value.metadata ?? {}) }
  delete metadata.importSourceHash
  delete metadata.importRevisionId
  delete metadata.importStateHash
  // A no-op Git commit must not manufacture a revision for unchanged content.
  delete metadata.commit
  return legacyImportFingerprint({ ...value, metadata })
}

async function freezeLegacyIdentity(candidate: LegacyCandidate, identity: LegacyIdentity): Promise<LegacyFrozenIdentity> {
  const metadata = parseJson(identity.metadataJson ?? '{}')
  let currentSourceFingerprint: string | null = null
  let currentStateFingerprint: string | null = null
  if (identity.title !== undefined) {
    currentSourceFingerprint = await legacySourceFingerprint({
      type: candidate.entry.type,
      title: identity.title,
      slug: identity.slug,
      path: identity.path,
      description: identity.description,
      visibility: identity.visibility,
      content: identity.content,
      contentFormat: identity.contentFormat,
      metadata: withoutImportMarkers(identity.metadataJson),
    })
    currentStateFingerprint = await legacyImportStateFingerprint({
      sourceFingerprint: currentSourceFingerprint,
      status: identity.status,
      publishedRevisionId: identity.publishedRevisionId,
      publishedAt: identity.publishedAt,
      scheduledAt: identity.scheduledAt,
    })
  }
  return {
    id: identity.id,
    currentRevisionId: identity.currentRevisionId,
    publishedRevisionId: identity.publishedRevisionId,
    status: identity.status,
    publishedAt: identity.publishedAt,
    scheduledAt: identity.scheduledAt,
    updatedAt: identity.updatedAt,
    importRevisionId: typeof metadata.importRevisionId === 'string' ? metadata.importRevisionId : null,
    importSourceHash: typeof metadata.importSourceHash === 'string' ? metadata.importSourceHash : null,
    importStateHash: typeof metadata.importStateHash === 'string' ? metadata.importStateHash : null,
    currentSourceFingerprint,
    currentStateFingerprint,
  }
}

function candidateContent(candidate: LegacyCandidate) {
  if (candidate.kind === 'markdown') return parseArticleMarkdown(candidate.entry.filePath, candidate.source).content
  if (candidate.kind === 'skill') return candidate.readme
  if (candidate.kind === 'album') return candidate.album.description ?? ''
  if (candidate.kind === 'home' || candidate.kind === 'raw-data') return candidate.source
  return ''
}

async function baselineConflict(candidate: LegacyCandidate, identity: LegacyIdentity) {
  // Injected lookup seams used by unit tests intentionally carry identity only.
  if (identity.currentRevisionId === undefined) return false
  const metadata = parseJson(identity.metadataJson ?? '{}')
  if (typeof metadata.importSourceHash === 'string' && identity.title !== undefined) {
    if (metadata.importRevisionId !== identity.currentRevisionId) return true
    const frozen = await freezeLegacyIdentity(candidate, identity)
    if (frozen.currentSourceFingerprint !== metadata.importSourceHash) return true
    // Publication changes do not necessarily create a revision, so protect
    // schedule/unpublish state with a separate marker as well.
    if (typeof metadata.importStateHash !== 'string') return true
    return frozen.currentStateFingerprint !== metadata.importStateHash
  }
  // Unmarked rows predate full revision/publication fingerprints. Body hashes
  // alone cannot prove that title, taxonomy or publication state is untouched,
  // so require an explicit adoption flow instead of silently overwriting them.
  return true
}

function legacyAssetId(bundle: ContentBundle, file: BundleFile) {
  return `asset:git:${bundle.source.repository ?? 'uploaded-bundle'}:${file.path}`
}

function legacyAssetBaselineKey(id: string) {
  return `legacy-asset:${id}`
}

function normalizeCategoryName(name: string | null) {
  return name?.split('/').at(-1)?.trim() || null
}

function legacyTaxonomyBaselineKey(kind: 'category' | 'tag', name: string) {
  return `legacy-taxonomy:${kind}:${name}`
}

function legacyRouteBaselineKey(path: string) {
  return `legacy-route:${path}`
}

function legacyTaxonomyRequests(candidates: readonly LegacyCandidate[]) {
  const requested = new Map<string, { kind: 'category' | 'tag'; name: string; slug: string }>()
  for (const candidate of candidates) {
    if (candidate.kind !== 'markdown' || (!candidate.entry.article && !isArticleMarkdownPath(candidate.entry.filePath))) continue
    const parsed = parseArticleMarkdown(candidate.entry.filePath, candidate.source)
    const category = normalizeCategoryName(parsed.categoryName)
    const values = [
      ...(category ? [{ kind: 'category' as const, name: category }] : []),
      ...[...new Set(parsed.tagNames.map((name) => name.trim()).filter(Boolean))]
        .map((name) => ({ kind: 'tag' as const, name })),
    ]
    for (const value of values) {
      requested.set(legacyTaxonomyBaselineKey(value.kind, value.name), {
        ...value,
        slug: resourceSlug(value.name),
      })
    }
  }
  return [...requested.values()]
}

function legacyAssetRewriter(bundle: ContentBundle) {
  const replacements = new Map(legacyAssets(bundle).map((file) => [
    `/${file.path.replace(/^public\//, '')}`,
    file.url,
  ]))
  const pattern = replacements.size
    ? new RegExp([...replacements.keys()]
      .sort((left, right) => right.length - left.length)
      .map((value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('|'), 'g')
    : null
  const rewrite = <T>(value: T): T => {
    if (typeof value === 'string') {
      return (pattern ? value.replace(pattern, (match) => replacements.get(match) ?? match) : value) as T
    }
    if (Array.isArray(value)) return value.map((item) => rewrite(item)) as T
    if (value && typeof value === 'object') {
      return Object.fromEntries(Object.entries(value as Record<string, unknown>)
        .map(([key, item]) => [key, rewrite(item)])) as T
    }
    return value
  }
  return rewrite
}

function importedAssetType(mediaType: string): 'image' | 'audio' | 'video' | 'document' | 'archive' | 'other' {
  if (mediaType.startsWith('image/')) return 'image'
  if (mediaType.startsWith('audio/')) return 'audio'
  if (mediaType.startsWith('video/')) return 'video'
  if (/zip|tar|gzip|archive/.test(mediaType)) return 'archive'
  if (mediaType.startsWith('text/') || mediaType.includes('pdf') || mediaType.includes('document')) return 'document'
  return 'other'
}

async function applyLegacyAsset(bundle: ContentBundle, file: BundleFile & { encoding: 'external'; url: string }) {
  const source = bundle.source.repository ?? 'uploaded-bundle'
  const id = `asset:git:${source}:${file.path}`
  const key = file.sourceKey || file.path.replace(/^public\//, '')
  const now = new Date(bundle.generatedAt)
  await db.insert(assets).values({
    id,
    key,
    url: file.url,
    name: file.path.split('/').at(-1) ?? file.path,
    mediaType: importedAssetType(file.mediaType),
    mimeType: file.mediaType,
    size: file.size ?? 0,
    checksum: file.checksum ?? null,
    metadataJson: JSON.stringify({ sourceType: 'git', repository: bundle.source.repository, sourcePath: file.path, commit: bundle.source.commit }),
    createdAt: now,
    updatedAt: now,
  }).onConflictDoUpdate({
    target: assets.key,
    set: {
      url: file.url,
      name: file.path.split('/').at(-1) ?? file.path,
      mediaType: importedAssetType(file.mediaType),
      mimeType: file.mediaType,
      size: file.size ?? 0,
      checksum: file.checksum ?? null,
      metadataJson: JSON.stringify({ sourceType: 'git', repository: bundle.source.repository, sourcePath: file.path, commit: bundle.source.commit }),
      updatedAt: now,
    },
  })
}

export async function planLegacyAstroImport(
  bundleInput: unknown,
  identityLookup: LegacyIdentityLookup = findLegacyResourceIdentities,
) {
  const bundle = contentBundleSchema.parse(bundleInput)
  assertNoUnmappedLegacyContent(bundle)
  const candidates = entries(bundle)
  const importedAssets = legacyAssets(bundle)
  const rewriteAssetReferences = legacyAssetRewriter(bundle)
  const identities = await identityLookup(candidates.map(({ entry }) => entry))
  for (const candidate of candidates) assertContentFitsD1(candidateContent(candidate))
  const useDatabaseBaselines = identityLookup === findLegacyResourceIdentities
  const requestedAssets = [
    ...importedAssets.map((file) => ({
      key: file.sourceKey || file.path.replace(/^public\//, ''),
      id: legacyAssetId(bundle, file),
      url: file.url,
    })),
    ...candidates.flatMap((candidate) => candidate.kind === 'photo'
      ? [photoAssetSpec(candidate.photo, rewriteAssetReferences)]
      : []),
  ]
  const requestedTaxonomy = legacyTaxonomyRequests(candidates)
  const requestedRoutes = [...new Set(candidates.map(({ entry }) => entry.path))]
  const [assetOwners, taxonomyRows, routeRows] = await Promise.all([
    useDatabaseBaselines && requestedAssets.length ? db.all<{
      key: string
      id: string
      url: string
      updatedAt: number
    }>(sql`
      SELECT a.key AS key, a.id AS id, a.url AS url, a.updated_at AS updatedAt
      FROM assets a
      WHERE a.key IN (SELECT json_extract(value, '$.key') FROM json_each(${JSON.stringify(requestedAssets)}))
         OR a.id IN (SELECT json_extract(value, '$.id') FROM json_each(${JSON.stringify(requestedAssets)}))
    `) : Promise.resolve([]),
    useDatabaseBaselines && requestedTaxonomy.length ? db.all<{
      kind: 'category' | 'tag'
      id: string
      name: string
      slug: string
      description: string | null
      parentId: string | null
      sortOrder: number | null
    }>(sql`
      SELECT 'category' AS kind, id, name, slug, description, parent_id AS parentId, "order" AS sortOrder
      FROM categories
      WHERE name IN (SELECT json_extract(value, '$.name') FROM json_each(${JSON.stringify(requestedTaxonomy.filter((item) => item.kind === 'category'))}))
         OR slug IN (SELECT json_extract(value, '$.slug') FROM json_each(${JSON.stringify(requestedTaxonomy.filter((item) => item.kind === 'category'))}))
      UNION ALL
      SELECT 'tag' AS kind, id, name, slug, NULL AS description, NULL AS parentId, NULL AS sortOrder
      FROM tags
      WHERE name IN (SELECT json_extract(value, '$.name') FROM json_each(${JSON.stringify(requestedTaxonomy.filter((item) => item.kind === 'tag'))}))
         OR slug IN (SELECT json_extract(value, '$.slug') FROM json_each(${JSON.stringify(requestedTaxonomy.filter((item) => item.kind === 'tag'))}))
    `) : Promise.resolve([]),
    useDatabaseBaselines && requestedRoutes.length ? db.all<{ path: string; resourceId: string; canonical: number }>(sql`
      SELECT path, resource_id AS resourceId, canonical
      FROM resource_routes
      WHERE path IN (SELECT value FROM json_each(${JSON.stringify(requestedRoutes)}))
    `) : Promise.resolve([]),
  ])
  let create = 0
  let update = 0
  const conflicts: string[] = []
  for (const { entry } of candidates) {
    const existing = identities.get(legacyIdentityKey(entry))
    if (existing) update += 1
    else create += 1
  }
  const frozenIdentities = new Map<string, LegacyFrozenIdentity>()
  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index]
    const identity = identities.get(legacyIdentityKey(candidate.entry))
    if (identity) {
      frozenIdentities.set(legacyIdentityKey(candidate.entry), await freezeLegacyIdentity(candidate, identity))
      if (await baselineConflict(candidate, identity)) {
        conflicts.push(`Resource ${candidate.entry.path} changed in Studio after its last Git import.`)
      }
    }
  }
  const expectedAssets = new Map(requestedAssets.map((item) => [item.key, item.id]))
  for (const owner of assetOwners) {
    const expectedId = expectedAssets.get(owner.key)
    if (expectedId && expectedId !== owner.id) conflicts.push(`Asset key ${owner.key} belongs to ${owner.id}.`)
  }
  for (const item of requestedTaxonomy) {
    const byName = taxonomyRows.find((row) => row.kind === item.kind && row.name === item.name)
    const slugOwner = taxonomyRows.find((row) => row.kind === item.kind && row.slug === item.slug)
    if (!byName && slugOwner) {
      conflicts.push(`${item.kind === 'tag' ? 'Tag' : 'Category'} slug ${item.slug} belongs to ${slugOwner.name}.`)
    }
  }
  const routeByPath = new Map(routeRows.map((row) => [row.path, row]))
  for (const candidate of candidates) {
    const identity = identities.get(legacyIdentityKey(candidate.entry))
    const owner = routeByPath.get(candidate.entry.path)
    if (owner && owner.resourceId !== identity?.id) {
      conflicts.push(`Route ${candidate.entry.path} belongs to ${owner.resourceId}.`)
    }
  }
  const baselines: Record<string, string | null> = {}
  for (const { entry } of candidates) {
    const key = legacyIdentityKey(entry)
    baselines[`legacy:${key}`] = frozenIdentities.has(key)
      ? JSON.stringify(frozenIdentities.get(key))
      : null
    const route = routeByPath.get(entry.path)
    baselines[legacyRouteBaselineKey(entry.path)] = route
      ? JSON.stringify({ resourceId: route.resourceId, canonical: route.canonical })
      : null
  }
  for (const item of requestedAssets) {
    const owner = assetOwners.find((row) => row.id === item.id)
    baselines[legacyAssetBaselineKey(item.id)] = owner
      ? JSON.stringify({ key: owner.key, url: owner.url, updatedAt: owner.updatedAt })
      : null
  }
  for (const item of requestedTaxonomy) {
    const row = taxonomyRows.find((candidate) => candidate.kind === item.kind && candidate.name === item.name)
    baselines[legacyTaxonomyBaselineKey(item.kind, item.name)] = row
      ? JSON.stringify(item.kind === 'category'
        ? { id: row.id, name: row.name, slug: row.slug, description: row.description, parentId: row.parentId, order: row.sortOrder }
        : { id: row.id, name: row.name, slug: row.slug })
      : null
  }
  return {
    bundle,
    baselines,
    plan: {
      resources: { total: candidates.length, create, update },
      revisions: candidates.length,
      categories: 0,
      tags: 0,
      assets: requestedAssets.length,
      routes: candidates.length,
      relations: 0,
      conflicts: [...new Set(conflicts)],
      sourceMode: 'legacy-astro' as const,
    },
  }
}

async function applyLegacyCandidates(
  bundle: ContentBundle,
  candidates: readonly LegacyCandidate[],
  actorId?: string | null,
) {
  const identities = await findLegacyResourceIdentities(candidates.map(({ entry }) => entry))
  let created = 0
  let updated = 0
  let unchanged = 0

  for (const candidate of candidates) {
    const { entry } = candidate
    if (candidate.kind === 'project') {
      const { project, order } = candidate
      const identity = identities.get(legacyIdentityKey(entry))
      const metadata = {
        externalUrl: project.link,
        icon: project.icon,
        category: project.category,
        order,
        sourceType: 'git',
        repository: bundle.source.repository,
        sourcePath: 'src/content/projects/data.json',
        commit: bundle.source.commit,
      }
      const input = {
        type: entry.type,
        title: project.id,
        slug: entry.slug,
        path: entry.path,
        description: project.desc,
        visibility: 'public' as const,
        content: '',
        contentFormat: 'json' as const,
        metadata,
        published: true,
        publishedAt: null,
        authorId: actorId,
        changeSummary: `Imported from GitHub ${bundle.source.commit ?? bundle.source.ref ?? ''}`.trim(),
      }
      if (!identity) {
        await createGenericResource(input)
        created += 1
      } else {
        const current = await getStudioResource(identity.id)
        const same = current
          && current.title === input.title && current.slug === input.slug && current.path === input.path
          && current.description === input.description && current.visibility === input.visibility
          && current.content === input.content && current.contentFormat === input.contentFormat
          && JSON.stringify(parseJson(current.metadataJson)) === JSON.stringify(metadata)
          && current.status === 'published'
        if (same) unchanged += 1
        else {
          await updateGenericResource(identity.id, input)
          updated += 1
        }
      }
      continue
    }

    if (candidate.kind === 'stream') {
      const { stream, order } = candidate
      const identity = identities.get(legacyIdentityKey(entry))
      const metadata = {
        externalUrl: stream.link,
        radio: stream.radio,
        video: stream.video,
        platform: stream.platform,
        order,
        sourceType: 'git',
        repository: bundle.source.repository,
        sourcePath: `src/content/streams/data.json#${entry.slug}`,
        commit: bundle.source.commit,
      }
      const input = {
        type: entry.type,
        title: stream.id,
        slug: entry.slug,
        path: entry.path,
        description: stream.platform || null,
        visibility: 'public' as const,
        content: '',
        contentFormat: 'json' as const,
        metadata,
        published: true,
        publishedAt: stream.pubDate,
        authorId: actorId,
        changeSummary: `Imported from GitHub ${bundle.source.commit ?? bundle.source.ref ?? ''}`.trim(),
      }
      if (!identity) {
        await createGenericResource(input)
        created += 1
      } else {
        const current = await getStudioResource(identity.id)
        const same = current
          && current.title === input.title && current.slug === input.slug && current.path === input.path
          && current.description === input.description && current.visibility === input.visibility
          && current.content === input.content && current.contentFormat === input.contentFormat
          && JSON.stringify(parseJson(current.metadataJson)) === JSON.stringify(metadata)
          && current.status === 'published'
          && current.publishedAt?.valueOf() === stream.pubDate.valueOf()
        if (same) unchanged += 1
        else {
          await updateGenericResource(identity.id, input)
          updated += 1
        }
      }
      continue
    }

    if (candidate.kind === 'skill') {
      const { skill, readme, order } = candidate
      const identity = identities.get(legacyIdentityKey(entry))
      const metadata = {
        repo: skill.id,
        author: skill.author,
        category: skill.category,
        desc: skill.desc,
        descZh: skill.descZh,
        stars: skill.stars,
        installs: skill.installs,
        qualityScore: skill.qualityScore,
        securityGrade: skill.securityGrade,
        platforms: skill.platforms,
        tags: skill.tags,
        official: skill.official,
        keywords: skill.keywords,
        pushedAt: skill.pushedAt?.toISOString() ?? null,
        createdAt: skill.createdAt?.toISOString() ?? null,
        language: skill.language,
        starsDelta: skill.starsDelta,
        order,
        sourceType: 'git',
        repository: bundle.source.repository,
        sourcePath: `src/content/skills/data.json#${skill.id}`,
        readmePath: readme ? `src/data/skills-readmes/${skill.id.replace('/', '__')}.md` : null,
        commit: bundle.source.commit,
      }
      const input = {
        type: entry.type,
        title: skill.name,
        slug: entry.slug,
        path: entry.path,
        description: skill.descZh || skill.desc || null,
        visibility: 'public' as const,
        content: readme,
        contentFormat: 'markdown' as const,
        metadata,
        published: true,
        publishedAt: skill.pushedAt,
        authorId: actorId,
        changeSummary: `Imported from GitHub ${bundle.source.commit ?? bundle.source.ref ?? ''}`.trim(),
      }
      if (!identity) {
        await createGenericResource(input)
        created += 1
      } else {
        const current = await getStudioResource(identity.id)
        const same = current
          && current.title === input.title && current.slug === resourceSlug(input.slug) && current.path === input.path
          && current.description === input.description && current.visibility === input.visibility
          && current.content === input.content && current.contentFormat === input.contentFormat
          && JSON.stringify(parseJson(current.metadataJson)) === JSON.stringify(metadata)
          && current.status === 'published'
          && current.publishedAt?.valueOf() === skill.pushedAt?.valueOf()
        if (same) unchanged += 1
        else {
          await updateGenericResource(identity.id, input)
          updated += 1
        }
      }
      continue
    }

    if (candidate.kind !== 'markdown') {
      throw new Error('Specialized legacy content must be applied through a persisted content-import job.')
    }
    const { source } = candidate
    const parsed = parseArticleMarkdown(entry.filePath, source)
    const identity = identities.get(legacyIdentityKey(entry))
    if (entry.article || isArticleMarkdownPath(entry.filePath)) {
      const categoryId = await ensureCategory(parsed.categoryName)
      const tagIds = await ensureTags(parsed.tagNames)
      const input = {
        title: parsed.title,
        slug: parsed.slug,
        subtitle: parsed.subtitle,
        content: parsed.content,
        excerpt: parsed.excerpt,
        ogImage: parsed.ogImage,
        draft: parsed.draft,
        visibility: parsed.visibility,
        toc: parsed.toc,
        share: parsed.share,
        giscus: parsed.giscus,
        search: parsed.search,
        radio: parsed.radio,
        video: parsed.video,
        platform: parsed.platform,
        minutesRead: parsed.minutesRead,
        pubDate: parsed.pubDate ?? undefined,
        categoryId,
        tagIds,
        authorId: actorId,
        changeSummary: `Imported from GitHub ${bundle.source.commit ?? bundle.source.ref ?? ''}`.trim(),
      }
      if (!identity) {
        await createArticle(input)
        created += 1
      } else {
        const current = await getPostById(identity.id)
        const currentTagIds = current?.postTags.map((relation) => relation.tagId).sort() ?? []
        const same = current
          && current.title === input.title && current.slug === input.slug && current.subtitle === input.subtitle
          && current.content === input.content && current.excerpt === input.excerpt && current.ogImage === input.ogImage
          && current.draft === input.draft && current.visibility === input.visibility && current.toc === input.toc
          && current.share === input.share && current.giscus === input.giscus && current.search === input.search
          && current.radio === input.radio && current.video === input.video && current.platform === input.platform
          && current.minutesRead === input.minutesRead && current.categoryId === input.categoryId
          && JSON.stringify(currentTagIds) === JSON.stringify([...tagIds].sort())
        if (same) unchanged += 1
        else {
          await updateArticle(identity.id, input)
          updated += 1
        }
      }
      continue
    }

    const metadata = {
      tags: parsed.tagNames,
      toc: parsed.toc,
      share: parsed.share,
      giscus: parsed.giscus,
      search: parsed.search,
      ogImage: parsed.ogImageDisabled ? false : parsed.ogImage,
      pubDate: parsed.pubDate?.toISOString() ?? null,
      sourceType: 'git',
      repository: bundle.source.repository,
      sourcePath: entry.filePath,
      commit: bundle.source.commit,
    }
    const input = {
      type: entry.type,
      title: parsed.title,
      slug: resourceSlug(entry.slug),
      path: entry.path,
      description: parsed.excerpt ?? parsed.subtitle,
      visibility: parsed.visibility,
      content: parsed.content,
      contentFormat: 'markdown' as const,
      metadata,
      published: !parsed.draft,
      publishedAt: parsed.pubDate,
      authorId: actorId,
      changeSummary: `Imported from GitHub ${bundle.source.commit ?? bundle.source.ref ?? ''}`.trim(),
    }
    if (!identity) {
      await createGenericResource(input)
      created += 1
    } else {
      const current = await getStudioResource(identity.id)
      const same = current
        && current.title === input.title && current.slug === input.slug && current.path === input.path
        && current.description === input.description && current.visibility === input.visibility
        && current.content === input.content && current.contentFormat === input.contentFormat
        && JSON.stringify(parseJson(current.metadataJson)) === JSON.stringify(metadata)
        && (current.status === 'published') === input.published
      if (same) unchanged += 1
      else {
        await updateGenericResource(identity.id, input)
        updated += 1
      }
    }
  }

  return { created, updated, unchanged }
}

interface TaxonomyTarget {
  category: {
    id: string
    name: string
    slug: string
    description: string | null
    parentId: string | null
    order: number
    baseline: string | null
    existing: boolean
  } | null
  tags: Array<{ id: string; name: string; slug: string; baseline: string | null; existing: boolean }>
}

export function legacyTaxonomyId(jobId: string, kind: 'category' | 'tag', name: string) {
  return `import-taxonomy:${jobId}:${kind}:${resourceSlug(name)}`
}

function resolveStageTaxonomy(
  jobId: string,
  categoryName: string | null,
  tagNames: string[],
  baselines: Record<string, string | null>,
): TaxonomyTarget {
  const normalizedCategory = normalizeCategoryName(categoryName)
  const requestedTags = [...new Set(tagNames.map((name) => name.trim()).filter(Boolean))]
  const resolve = (kind: 'category' | 'tag', name: string) => {
    const baselineKey = legacyTaxonomyBaselineKey(kind, name)
    if (!Object.prototype.hasOwnProperty.call(baselines, baselineKey)) {
      throw new Error(`Import baseline is missing for ${baselineKey}.`)
    }
    const slug = resourceSlug(name)
    const baseline = baselines[baselineKey]
    if (baseline) {
      const row = JSON.parse(baseline) as {
        id: string
        name: string
        slug: string
        description?: string | null
        parentId?: string | null
        order?: number
      }
      return {
        id: row.id,
        name: row.name,
        slug: row.slug,
        description: row.description ?? null,
        parentId: row.parentId ?? null,
        order: row.order ?? 0,
        baseline: JSON.stringify(kind === 'category'
          ? { name: row.name, slug: row.slug, description: row.description ?? null, parentId: row.parentId ?? null, order: row.order ?? 0 }
          : { name: row.name, slug: row.slug }),
        existing: true,
      }
    }
    return {
      id: legacyTaxonomyId(jobId, kind, name),
      name,
      slug,
      description: null,
      parentId: null,
      order: 0,
      baseline: null,
      existing: false,
    }
  }
  return {
    category: normalizedCategory ? resolve('category', normalizedCategory) : null,
    tags: requestedTags.map((name) => {
      const target = resolve('tag', name)
      return { id: target.id, name: target.name, slug: target.slug, baseline: target.baseline, existing: target.existing }
    }),
  }
}

function iso(value: Date | number | null | undefined) {
  if (value === null || value === undefined) return null
  // Raw D1 integer timestamps are seconds; Date values are already hydrated.
  return (value instanceof Date ? value : new Date(value * 1_000)).toISOString()
}

async function legacyStageId(jobId: string, kind: 'resource' | 'revision' | 'event', entry: LegacyEntry) {
  return `import:${kind}:${await sha256(`${jobId}:${legacyIdentityKey(entry)}`)}`
}

async function legacyCandidateStageRecords(
  bundle: ContentBundle,
  candidate: LegacyCandidate,
  identity: LegacyFrozenIdentity | undefined,
  jobId: string,
  baselines: Record<string, string | null>,
  actorId?: string | null,
): Promise<ImportStageRecord[]> {
  const now = new Date()
  const rewriteAssetReferences = legacyAssetRewriter(bundle)
  const entry = candidate.entry
  const resourceId = identity?.id
    ?? (candidate.kind === 'album'
      ? `album:${candidate.album.id}`
      : candidate.kind === 'track'
        ? `track:${candidate.song.id}`
        : candidate.kind === 'photo'
          ? `photo:${resourceSlug(candidate.photo.id)}`
          : await legacyStageId(jobId, 'resource', entry))
  const revisionId = await legacyStageId(jobId, 'revision', entry)
  let title: string
  let slug: string
  let description: string | null
  let visibility: 'public' | 'unlisted' | 'private'
  let content: string
  let contentFormat: 'markdown' | 'json' | 'text'
  let published = true
  let publishAt: Date | null = null
  let metadata: Record<string, unknown>
  let article: Record<string, unknown> | null = null
  let document: Record<string, unknown> | null = null
  let album: Record<string, unknown> | null = null
  let track: Record<string, unknown> | null = null
  let coverAssetId: string | null = null
  let managedCover = false
  let taxonomy: TaxonomyTarget = { category: null, tags: [] }

  if (candidate.kind === 'album') {
    title = candidate.album.name
    slug = candidate.album.id
    description = candidate.album.description
    visibility = 'public'
    content = candidate.album.description ?? ''
    contentFormat = 'markdown'
    publishAt = candidate.album.releaseDate
    metadata = {
      cover: candidate.album.cover,
      artist: candidate.album.artist,
      color: candidate.album.color ?? '#1a1a2e',
      sourceType: 'git', repository: bundle.source.repository,
      sourcePath: candidate.entry.filePath, commit: bundle.source.commit,
    }
    album = {
      resourceId,
      artist: candidate.album.artist,
      color: candidate.album.color ?? '#1a1a2e',
      releaseDate: candidate.album.releaseDate?.toISOString() ?? null,
      sortOrder: candidate.order,
    }
  } else if (candidate.kind === 'track') {
    const albumBaselineKey = `legacy:${legacyIdentityKey(candidate.albumEntry)}`
    if (!Object.prototype.hasOwnProperty.call(baselines, albumBaselineKey)) {
      throw new Error(`Import baseline is missing for ${albumBaselineKey}.`)
    }
    const frozenAlbum = baselines[albumBaselineKey]
      ? JSON.parse(baselines[albumBaselineKey]!) as LegacyFrozenIdentity
      : null
    const albumResourceId = frozenAlbum?.id ?? `album:${candidate.albumEntry.slug}`
    title = candidate.song.name
    slug = candidate.song.id
    description = null
    visibility = 'public'
    content = ''
    contentFormat = 'text'
    metadata = {
      duration: candidate.song.duration,
      hasLyrics: candidate.song.hasLyrics,
      quality: candidate.song.quality,
      sourceType: 'git', repository: bundle.source.repository,
      sourcePath: candidate.entry.filePath, commit: bundle.source.commit,
    }
    const parts = candidate.song.duration.split(':').map(Number)
    const durationSeconds = parts.length && parts.every((part) => Number.isFinite(part) && part >= 0)
      ? parts.reduce((total, part) => total * 60 + part, 0)
      : null
    track = {
      resourceId,
      albumResourceId,
      audioAssetId: null,
      externalUrl: candidate.song.url,
      sourceType: 'external',
      duration: candidate.song.duration,
      durationSeconds,
      trackNumber: candidate.order + 1,
      lyrics: null,
    }
  } else if (candidate.kind === 'photo') {
    const asset = photoAssetSpec(candidate.photo, rewriteAssetReferences)
    title = candidate.photo.desc || `Photo ${candidate.order + 1}`
    slug = entry.slug
    description = candidate.photo.desc || null
    visibility = 'public'
    content = ''
    contentFormat = 'markdown'
    coverAssetId = asset.id
    managedCover = true
    metadata = {
      sourceUrl: candidate.photo.id,
      order: candidate.order,
      sourceType: 'git', repository: bundle.source.repository,
      sourcePath: candidate.entry.filePath, commit: bundle.source.commit,
    }
  } else if (candidate.kind === 'home') {
    title = candidate.source.match(/^#\s+(.+)$/m)?.[1]?.trim() || 'Home'
    slug = 'home'
    description = null
    visibility = 'public'
    content = candidate.source
    contentFormat = 'markdown'
    metadata = {
      sourceType: 'git', repository: bundle.source.repository,
      sourcePath: candidate.entry.filePath, commit: bundle.source.commit,
    }
    document = {
      resourceId, sourceType: 'git', repository: bundle.source.repository,
      sourcePath: candidate.entry.filePath, commit: bundle.source.commit,
      syncStatus: 'ready', syncedAt: now.toISOString(),
    }
  } else if (candidate.kind === 'raw-data') {
    title = candidate.title
    slug = entry.slug
    description = `Lossless source archive for ${entry.filePath.replace(/#raw$/, '')}`
    visibility = 'private'
    content = candidate.source
    contentFormat = 'json'
    published = false
    metadata = {
      losslessSource: true,
      sourceType: 'git', repository: bundle.source.repository,
      sourcePath: entry.filePath.replace(/#raw$/, ''), commit: bundle.source.commit,
    }
    document = {
      resourceId, sourceType: 'git', repository: bundle.source.repository,
      sourcePath: entry.filePath.replace(/#raw$/, ''), commit: bundle.source.commit,
      syncStatus: 'ready', syncedAt: now.toISOString(),
    }
  } else if (candidate.kind === 'project') {
    title = candidate.project.id
    slug = entry.slug
    description = candidate.project.desc
    visibility = 'public'
    content = ''
    contentFormat = 'json'
    metadata = {
      externalUrl: candidate.project.link, icon: candidate.project.icon, category: candidate.project.category,
      order: candidate.order, sourceType: 'git', repository: bundle.source.repository,
      sourcePath: 'src/content/projects/data.json', commit: bundle.source.commit,
    }
  } else if (candidate.kind === 'stream') {
    title = candidate.stream.id
    slug = entry.slug
    description = candidate.stream.platform || null
    visibility = 'public'
    content = ''
    contentFormat = 'json'
    publishAt = candidate.stream.pubDate
    metadata = {
      externalUrl: candidate.stream.link, radio: candidate.stream.radio, video: candidate.stream.video,
      platform: candidate.stream.platform, order: candidate.order, sourceType: 'git',
      repository: bundle.source.repository, sourcePath: `src/content/streams/data.json#${entry.slug}`,
      commit: bundle.source.commit,
    }
    document = {
      resourceId, sourceType: 'git', repository: bundle.source.repository,
      sourcePath: `src/content/streams/data.json#${entry.slug}`, commit: bundle.source.commit,
      syncStatus: 'ready', syncedAt: now.toISOString(),
    }
  } else if (candidate.kind === 'skill') {
    title = candidate.skill.name
    slug = resourceSlug(entry.slug)
    description = candidate.skill.descZh || candidate.skill.desc || null
    visibility = 'public'
    content = candidate.readme
    contentFormat = 'markdown'
    publishAt = candidate.skill.pushedAt
    metadata = {
      repo: candidate.skill.id, author: candidate.skill.author, category: candidate.skill.category,
      desc: candidate.skill.desc, descZh: candidate.skill.descZh, stars: candidate.skill.stars,
      installs: candidate.skill.installs, qualityScore: candidate.skill.qualityScore,
      securityGrade: candidate.skill.securityGrade, platforms: candidate.skill.platforms, tags: candidate.skill.tags,
      official: candidate.skill.official, keywords: candidate.skill.keywords,
      pushedAt: candidate.skill.pushedAt?.toISOString() ?? null,
      createdAt: candidate.skill.createdAt?.toISOString() ?? null, language: candidate.skill.language,
      starsDelta: candidate.skill.starsDelta, order: candidate.order, sourceType: 'git',
      repository: bundle.source.repository, sourcePath: `src/content/skills/data.json#${candidate.skill.id}`,
      readmePath: candidate.readme ? `src/data/skills-readmes/${candidate.skill.id.replace('/', '__')}.md` : null,
      commit: bundle.source.commit,
    }
  } else {
    const parsed = parseArticleMarkdown(entry.filePath, candidate.source)
    title = parsed.title
    slug = entry.article ? parsed.slug : resourceSlug(entry.slug)
    description = entry.article ? parsed.excerpt : parsed.excerpt ?? parsed.subtitle
    visibility = parsed.visibility
    content = parsed.content
    contentFormat = 'markdown'
    published = !parsed.draft
    publishAt = parsed.pubDate
    if (entry.article || isArticleMarkdownPath(entry.filePath)) {
      taxonomy = resolveStageTaxonomy(jobId, parsed.categoryName, parsed.tagNames, baselines)
      metadata = {
        subtitle: parsed.subtitle ?? null, ogImage: parsed.ogImage ?? null, radio: parsed.radio,
        video: parsed.video, platform: parsed.platform ?? null, categoryId: taxonomy.category?.id ?? null,
        tagIds: taxonomy.tags.map((tag) => tag.id), toc: parsed.toc, share: parsed.share,
        giscus: parsed.giscus, search: parsed.search, minutesRead: parsed.minutesRead ?? null,
        sourceType: 'git', repository: bundle.source.repository, sourcePath: entry.filePath, commit: bundle.source.commit,
      }
      article = {
        resourceId, toc: parsed.toc, share: parsed.share, giscus: parsed.giscus,
        searchable: parsed.search, readingMinutes: parsed.minutesRead ?? null,
      }
    } else {
      metadata = {
        tags: parsed.tagNames, toc: parsed.toc, share: parsed.share, giscus: parsed.giscus, search: parsed.search,
        ogImage: parsed.ogImageDisabled ? false : parsed.ogImage, pubDate: parsed.pubDate?.toISOString() ?? null,
        sourceType: 'git', repository: bundle.source.repository, sourcePath: entry.filePath, commit: bundle.source.commit,
      }
      if (entry.type === 'document') {
        document = {
          resourceId, sourceType: 'git', repository: bundle.source.repository, sourcePath: entry.filePath,
          commit: bundle.source.commit, syncStatus: 'ready', syncedAt: now.toISOString(),
        }
      }
    }
  }

  content = rewriteAssetReferences(content)
  metadata = rewriteAssetReferences(metadata)
  if (track) track = rewriteAssetReferences(track)
  metadata = {
    ...metadata,
    importPublicationIntent: { published, publishAt: publishAt?.toISOString() ?? null },
  }
  assertContentFitsD1(content)
  const sourceHash = await sha256(content)
  const importSourceHash = await legacySourceFingerprint({
    type: entry.type, title, slug, path: entry.path, description, visibility, content, contentFormat, metadata,
  })
  if (identity?.importRevisionId && identity.importRevisionId !== identity.currentRevisionId) {
    throw new Error(`Resource ${entry.path} changed in Studio after its last Git import.`)
  }
  if (identity?.importSourceHash === importSourceHash
    && identity.currentSourceFingerprint === identity.importSourceHash
    && identity.importStateHash
    && identity.currentStateFingerprint === identity.importStateHash) {
    return []
  }

  const wantsSchedule = published && Boolean(publishAt && publishAt > now)
  const retainsPublished = Boolean(identity?.publishedRevisionId) && (!published || wantsSchedule)
  const publishedRevisionId = published && !wantsSchedule
    ? revisionId
    : retainsPublished ? identity?.publishedRevisionId ?? null : null
  const status = published && !wantsSchedule
    ? 'published'
    : retainsPublished ? 'published' : wantsSchedule ? 'scheduled' : 'draft'
  const publishedAt = published && !wantsSchedule
    ? (publishAt ?? now).toISOString()
    : retainsPublished ? iso(identity?.publishedAt) : null
  const scheduledAt = wantsSchedule ? publishAt?.toISOString() ?? null : null
  const importStateHash = await legacyImportStateFingerprint({
    sourceFingerprint: importSourceHash,
    status,
    publishedRevisionId,
    publishedAt,
    scheduledAt,
  })
  metadata = { ...metadata, importSourceHash, importRevisionId: revisionId, importStateHash }
  const createdAt = now.toISOString()
  const records: ImportStageRecord[] = [
    {
      entityType: 'resource', entityKey: resourceId,
      baselineRevisionId: identity ? JSON.stringify({
        currentRevisionId: identity.currentRevisionId ?? null,
        updatedAt: identity.updatedAt ?? null,
      }) : null,
      payload: {
        id: resourceId, type: entry.type, title, slug, path: entry.path, description, status, visibility,
        coverAssetId, currentRevisionId: revisionId, publishedRevisionId, publishedAt, scheduledAt,
        createdAt, updatedAt: createdAt, importMode: 'legacy', managedTaxonomy: Boolean(article), managedCover,
      },
    },
    {
      entityType: 'revision', entityKey: revisionId, contentText: content,
      payload: {
        id: revisionId, resourceId, version: 0, title, slug, path: entry.path, description, visibility,
        contentFormat, metadata, sourceHash,
        changeSummary: `Imported from GitHub ${bundle.source.commit ?? bundle.source.ref ?? ''}`.trim(), createdAt,
      },
    },
  ]
  const shouldReplaceRoute = candidate.kind !== 'raw-data'
    && (!identity || publishedRevisionId === revisionId || !identity.publishedRevisionId)
  if (shouldReplaceRoute) {
    const routeBaselineKey = legacyRouteBaselineKey(entry.path)
    if (!Object.prototype.hasOwnProperty.call(baselines, routeBaselineKey)) {
      throw new Error(`Import baseline is missing for ${routeBaselineKey}.`)
    }
    records.push({
      entityType: 'route', entityKey: entry.path,
      baselineRevisionId: baselines[routeBaselineKey],
      payload: { path: entry.path, resourceId, canonical: true, createdAt, importMode: 'legacy' },
    })
  }
  if (article) records.push({ entityType: 'article', entityKey: resourceId, payload: article })
  if (document) records.push({ entityType: 'document', entityKey: resourceId, payload: document })
  if (album) records.push({ entityType: 'album', entityKey: resourceId, payload: album })
  if (track) {
    records.push({ entityType: 'track', entityKey: resourceId, payload: track })
    records.push({
      entityType: 'relation', entityKey: `${resourceId}:${String(track.albumResourceId)}:part_of`,
      payload: {
        sourceResourceId: resourceId,
        targetResourceId: track.albumResourceId,
        relationType: 'part_of',
        sortOrder: track.trackNumber,
        metadata: { source: 'legacy-astro' },
      },
    })
  }
  if (candidate.kind === 'photo') {
    const asset = photoAssetSpec(candidate.photo, rewriteAssetReferences)
    const baselineKey = legacyAssetBaselineKey(asset.id)
    if (!Object.prototype.hasOwnProperty.call(baselines, baselineKey)) {
      throw new Error(`Import baseline is missing for ${baselineKey}.`)
    }
    const frozenAsset = baselines[baselineKey]
      ? JSON.parse(baselines[baselineKey]!) as { key: string; url: string; updatedAt: number }
      : null
    if (!frozenAsset || frozenAsset.key !== asset.key || frozenAsset.url !== asset.url) {
      records.push({
        entityType: 'asset', entityKey: asset.id, baselineRevisionId: baselines[baselineKey],
        payload: {
          ...asset,
          name: candidate.photo.desc || candidate.photo.id,
          mediaType: 'image', mimeType: 'image/jpeg', size: 0,
          width: null, height: null, durationSeconds: null, checksum: null,
          metadata: { sourceType: 'git', sourcePath: candidate.entry.filePath },
          createdAt, updatedAt: createdAt,
        },
      })
    }
  }
  if (taxonomy.category) {
    records.push({
      entityType: taxonomy.category.existing ? 'category-guard' : 'category', entityKey: taxonomy.category.id,
      baselineRevisionId: taxonomy.category.baseline,
      payload: {
        id: taxonomy.category.id, name: taxonomy.category.name, slug: taxonomy.category.slug,
        description: taxonomy.category.description, parentId: taxonomy.category.parentId,
        order: taxonomy.category.order, createdAt,
      },
    })
    records.push({
      entityType: 'category-link', entityKey: `${resourceId}:${taxonomy.category.id}`,
      payload: { resourceId, categoryId: taxonomy.category.id },
    })
  }
  for (const tag of taxonomy.tags) {
    records.push({
      entityType: tag.existing ? 'tag-guard' : 'tag', entityKey: tag.id, baselineRevisionId: tag.baseline,
      payload: { id: tag.id, name: tag.name, slug: tag.slug, createdAt },
    })
    records.push({ entityType: 'tag-link', entityKey: `${resourceId}:${tag.id}`, payload: { resourceId, tagId: tag.id } })
  }
  const eventId = await legacyStageId(jobId, 'event', entry)
  records.push({
    entityType: 'publication-event', entityKey: eventId,
    payload: {
      id: eventId, resourceId, revisionId,
      eventType: publishedRevisionId === revisionId ? 'published' : identity ? 'draft_saved' : 'created',
      data: { source: 'github', actorId: actorId ?? null }, createdAt,
    },
  })
  return records
}

export const LEGACY_IMPORT_CANDIDATES_PER_PAGE = 1

export function legacyAstroImportCandidateCount(bundleInput: unknown) {
  const bundle = contentBundleSchema.parse(bundleInput)
  return legacyAssets(bundle).length + entries(bundle).length
}

/** Applies one persisted-job page so a Worker invocation stays below 50 D1 queries. */
export async function applyLegacyAstroImportPage(
  bundleInput: unknown,
  actorId: string | null | undefined,
  cursor: number,
) {
  const bundle = contentBundleSchema.parse(bundleInput)
  const importedAssets = legacyAssets(bundle)
  const candidates = entries(bundle)
  const total = importedAssets.length + candidates.length
  const start = Math.min(Math.max(cursor, 0), total)
  if (start < importedAssets.length) {
    await applyLegacyAsset(bundle, importedAssets[start])
    const nextCursor = start + 1
    return { cursor: nextCursor, total, done: nextCursor >= total, result: { created: 0, updated: 0, unchanged: 0, assets: 1 } }
  }
  const candidateIndex = start - importedAssets.length
  const page = candidates.slice(candidateIndex, candidateIndex + LEGACY_IMPORT_CANDIDATES_PER_PAGE)
  const result = await applyLegacyCandidates(bundle, page, actorId)
  const nextCursor = start + page.length
  return { cursor: nextCursor, total, done: nextCursor >= total, result: { ...result, assets: 0 } }
}

/**
 * Builds one invisible legacy write-set page without touching D1. Keeping the
 * page builder pure makes a crashed page replay deterministic and lets the
 * persisted-job contract be exercised independently from a Worker binding.
 */
export async function buildLegacyAstroImportStagePage(
  bundleInput: unknown,
  jobId: string,
  actorId: string | null | undefined,
  cursor: number,
  baselines: Record<string, string | null>,
) {
  const bundle = contentBundleSchema.parse(bundleInput)
  const importedAssets = legacyAssets(bundle)
  const candidates = entries(bundle)
  const total = importedAssets.length + candidates.length
  const start = Math.min(Math.max(cursor, 0), total)
  if (start < importedAssets.length) {
    const file = importedAssets[start]
    const id = legacyAssetId(bundle, file)
    const baselineKey = legacyAssetBaselineKey(id)
    if (!Object.prototype.hasOwnProperty.call(baselines, baselineKey)) {
      throw new Error(`Import baseline is missing for ${baselineKey}.`)
    }
    const frozenAsset = baselines[baselineKey]
      ? JSON.parse(baselines[baselineKey]!) as { key: string; url: string; updatedAt: number }
      : null
    const key = file.sourceKey || file.path.replace(/^public\//, '')
    const unchanged = Boolean(frozenAsset && frozenAsset.key === key && frozenAsset.url === file.url)
    const records: ImportStageRecord[] = unchanged ? [] : [{
      entityType: 'asset', entityKey: id,
      baselineRevisionId: baselines[baselineKey],
      payload: {
        id, key, url: file.url,
        name: file.path.split('/').at(-1) ?? file.path, mediaType: importedAssetType(file.mediaType),
        mimeType: file.mediaType, size: file.size ?? 0, width: null, height: null, durationSeconds: null,
        checksum: file.checksum ?? null,
        metadata: { sourceType: 'git', repository: bundle.source.repository, sourcePath: file.path, commit: bundle.source.commit },
        createdAt: bundle.generatedAt, updatedAt: bundle.generatedAt,
      },
    }]
    const nextCursor = start + 1
    return {
      ordinal: start,
      records,
      cursor: nextCursor,
      total,
      done: nextCursor >= total,
      result: { created: 0, updated: 0, unchanged: unchanged ? 1 : 0, assets: unchanged ? 0 : 1 },
    }
  }
  const candidate = candidates[start - importedAssets.length]
  if (!candidate) return {
    ordinal: start,
    records: [] as ImportStageRecord[],
    cursor: start,
    total,
    done: true,
    result: { created: 0, updated: 0, unchanged: 0, assets: 0 },
  }
  const baselineKey = `legacy:${legacyIdentityKey(candidate.entry)}`
  if (!Object.prototype.hasOwnProperty.call(baselines, baselineKey)) {
    throw new Error(`Import baseline is missing for ${baselineKey}.`)
  }
  const frozenIdentity = baselines[baselineKey]
  const identity = frozenIdentity ? JSON.parse(frozenIdentity) as LegacyFrozenIdentity : undefined
  const records = await legacyCandidateStageRecords(bundle, candidate, identity, jobId, baselines, actorId)
  const nextCursor = start + 1
  const stagedAssets = records.filter((record) => record.entityType === 'asset').length
  return {
    ordinal: start, records, cursor: nextCursor, total, done: nextCursor >= total,
    result: records.length
      ? { created: identity ? 0 : 1, updated: identity ? 1 : 0, unchanged: 0, assets: stagedAssets }
      : { created: 0, updated: 0, unchanged: 1, assets: 0 },
  }
}

/** Builds and persists one legacy page; no live/public table is touched. */
export async function stageLegacyAstroImportPage(
  bundleInput: unknown,
  jobId: string,
  actorId: string | null | undefined,
  cursor: number,
  baselines: Record<string, string | null>,
  leaseToken?: string,
) {
  const page = await buildLegacyAstroImportStagePage(bundleInput, jobId, actorId, cursor, baselines)
  await stageImportRecords(jobId, page.ordinal, page.records, leaseToken)
  return {
    cursor: page.cursor,
    total: page.total,
    done: page.done,
    result: page.result,
  }
}

/** Small-bundle compatibility entrypoint; large imports use the persisted job API. */
export async function applyLegacyAstroImport(bundleInput: unknown, actorId?: string | null) {
  const { bundle, plan } = await planLegacyAstroImport(bundleInput)
  const total = legacyAstroImportCandidateCount(bundle)
  if (total > LEGACY_IMPORT_CANDIDATES_PER_PAGE) {
    throw new Error('Large legacy imports must be applied through a persisted content-import job.')
  }
  const page = await applyLegacyAstroImportPage(bundle, actorId, 0)
  return {
    schemaVersion: bundle.schemaVersion,
    sourceMode: 'legacy-astro' as const,
    applied: page.done,
    plan,
    result: page.result,
  }
}
