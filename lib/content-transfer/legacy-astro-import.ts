import { and, eq } from 'drizzle-orm'

import { db } from '@/lib/db'
import { getPostById } from '@/lib/db/queries/posts'
import { categories, resources, tags } from '@/lib/db/schema'
import { createArticle, updateArticle } from '@/modules/articles/application/article-service'
import { createGenericResource, updateGenericResource } from '@/modules/resources/application/resource-service'
import { getStudioResource } from '@/modules/resources/application/queries'
import { resourceSlug } from '@/modules/resources/domain/slug'
import type { ResourceType } from '@/modules/resources/domain/types'

import { contentBundleSchema, readEmbeddedFile, type ContentBundle } from './contract'
import { isArticleMarkdownPath, parseArticleMarkdown } from './markdown'

interface LegacyEntry {
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

type LegacyCandidate =
  | { kind: 'markdown'; entry: LegacyEntry; source: string }
  | { kind: 'project'; entry: LegacyEntry; project: LegacyProjectEntry; order: number }
  | { kind: 'stream'; entry: LegacyEntry; stream: LegacyStreamEntry; order: number }
  | { kind: 'skill'; entry: LegacyEntry; skill: LegacySkillEntry; readme: string; order: number }

export function legacyContentEntry(filePath: string): LegacyEntry | null {
  const article = filePath.match(/^src\/content\/blog\/(?:.*\/)?([^/]+)\.(?:md|mdx)$/i)
  if (article) return { filePath, type: 'article', slug: article[1], path: `/blog/${article[1]}`, article: true }
  const short = filePath.match(/^src\/content\/shorts\/(.+)\.(?:md|mdx)$/i)
  if (short) return { filePath, type: 'short', slug: short[1], path: `/shorts/${short[1]}`, article: false }
  const changelog = filePath.match(/^src\/content\/changelog\/(.+)\.(?:md|mdx)$/i)
  if (changelog) return { filePath, type: 'document', slug: changelog[1], path: `/changelog/${changelog[1]}`, article: false }
  return null
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
  const ids: string[] = []
  for (const value of [...new Set(names.map((name) => name.trim()).filter(Boolean))]) {
    const [existing] = await db.select().from(tags).where(eq(tags.name, value)).limit(1)
    if (existing) {
      ids.push(existing.id)
      continue
    }
    const baseSlug = resourceSlug(value)
    const [slugOwner] = await db.select({ id: tags.id }).from(tags).where(eq(tags.slug, baseSlug)).limit(1)
    const id = crypto.randomUUID()
    const slug = slugOwner ? `${baseSlug}-${id.slice(0, 8)}` : baseSlug
    await db.insert(tags).values({ id, name: value, slug, createdAt: new Date() })
    ids.push(id)
  }
  return ids
}

function entries(bundle: ContentBundle): LegacyCandidate[] {
  const readmes = new Map(bundle.files.flatMap((file) => {
    if (file.encoding === 'external') return []
    const match = file.path.match(/^src\/data\/skills-readmes\/(.+)\.md$/i)
    return match ? [[match[1], readEmbeddedFile(file)] as const] : []
  }))
  return bundle.files.flatMap((file): LegacyCandidate[] => {
    if (file.encoding === 'external') return []
    if (file.path === 'src/content/projects/data.json') {
      return parseLegacyProjects(readEmbeddedFile(file)).map((project, order) => ({
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
      }))
    }
    if (file.path === 'src/content/streams/data.json') {
      return parseLegacyStreams(readEmbeddedFile(file)).map((stream, order) => ({
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
      }))
    }
    if (file.path === 'src/content/skills/data.json') {
      return parseLegacySkills(readEmbeddedFile(file)).map((skill, order) => ({
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
      }))
    }
    const entry = legacyContentEntry(file.path)
    return entry ? [{ kind: 'markdown' as const, entry, source: readEmbeddedFile(file) }] : []
  })
}

export async function planLegacyAstroImport(bundleInput: unknown) {
  const bundle = contentBundleSchema.parse(bundleInput)
  const candidates = entries(bundle)
  let create = 0
  let update = 0
  for (const { entry } of candidates) {
    const [existing] = await db.select({ id: resources.id }).from(resources).where(and(
      eq(resources.type, entry.type),
      eq(resources.path, entry.path),
    )).limit(1)
    if (existing) update += 1
    else create += 1
  }
  return {
    bundle,
    plan: {
      resources: { total: candidates.length, create, update },
      revisions: candidates.length,
      categories: 0,
      tags: 0,
      assets: 0,
      routes: candidates.length,
      relations: 0,
      conflicts: [] as string[],
      sourceMode: 'legacy-astro' as const,
    },
  }
}

export async function applyLegacyAstroImport(bundleInput: unknown, actorId?: string | null) {
  const { bundle, plan } = await planLegacyAstroImport(bundleInput)
  let created = 0
  let updated = 0
  let unchanged = 0

  for (const candidate of entries(bundle)) {
    const { entry } = candidate
    if (candidate.kind === 'project') {
      const { project, order } = candidate
      const [identity] = await db.select({ id: resources.id }).from(resources).where(and(
        eq(resources.type, entry.type),
        eq(resources.path, entry.path),
      )).limit(1)
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
      const [identity] = await db.select({ id: resources.id }).from(resources).where(and(
        eq(resources.type, entry.type),
        eq(resources.path, entry.path),
      )).limit(1)
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
      const [identity] = await db.select({ id: resources.id }).from(resources).where(and(
        eq(resources.type, entry.type),
        eq(resources.path, entry.path),
      )).limit(1)
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

    const { source } = candidate
    const parsed = parseArticleMarkdown(entry.filePath, source)
    const [identity] = await db.select({ id: resources.id }).from(resources).where(and(
      eq(resources.type, entry.type),
      eq(resources.path, entry.path),
    )).limit(1)
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
      ogImage: parsed.ogImage,
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

  return { schemaVersion: bundle.schemaVersion, sourceMode: 'legacy-astro' as const, applied: true, plan, result: { created, updated, unchanged } }
}
