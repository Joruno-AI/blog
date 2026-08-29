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

function entries(bundle: ContentBundle) {
  return bundle.files.flatMap((file) => {
    if (file.encoding === 'external') return []
    const entry = legacyContentEntry(file.path)
    return entry ? [{ entry, source: readEmbeddedFile(file) }] : []
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

  for (const { entry, source } of entries(bundle)) {
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
