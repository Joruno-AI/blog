import { z } from 'zod'

import { normalizeBundlePath } from './contract'

export interface ArticleTransferRecord {
  title: string
  slug: string
  subtitle: string | null
  content: string
  excerpt: string | null
  ogImage: string | null
  draft: boolean
  visibility: 'public' | 'unlisted' | 'private'
  toc: boolean
  share: boolean
  giscus: boolean
  search: boolean
  radio: boolean
  video: boolean
  platform: string | null
  minutesRead: number | null
  pubDate: Date | null
  updatedAt: Date | null
  categoryName: string | null
  categoryPath: string | null
  tagNames: string[]
}

const optionalFrontmatterDate = z.preprocess(
  (value) => value === '' || value === null ? undefined : value,
  z.coerce.date().optional(),
)

const articleFrontmatterSchema = z.object({
  title: z.string().trim().min(1),
  slug: z.string().trim().min(1).optional(),
  subtitle: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  pubDate: optionalFrontmatterDate,
  lastModDate: optionalFrontmatterDate,
  category: z.string().nullable().optional(),
  tags: z.union([z.array(z.string()), z.string()]).optional(),
  draft: z.boolean().default(false),
  visibility: z.enum(['public', 'unlisted', 'private']).default('public'),
  ogImage: z.union([z.string(), z.literal(false)]).nullable().optional(),
  toc: z.boolean().default(true),
  share: z.boolean().default(true),
  giscus: z.boolean().default(true),
  search: z.boolean().default(true),
  radio: z.boolean().default(false),
  video: z.boolean().default(false),
  platform: z.string().nullable().optional(),
  minutesRead: z.number().nonnegative().nullable().optional(),
})

function yamlValue(value: unknown): string {
  if (typeof value === 'string') return JSON.stringify(value)
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (value === null) return 'null'
  if (Array.isArray(value)) return `[${value.map(yamlValue).join(', ')}]`
  throw new Error(`Unsupported frontmatter value: ${typeof value}`)
}

function dateOnly(value: Date) {
  return value.toISOString().slice(0, 10)
}

function splitInlineList(value: string) {
  const items: string[] = []
  let quote = ''
  let current = ''
  for (const character of value) {
    if ((character === '"' || character === "'") && (!quote || quote === character)) {
      quote = quote ? '' : character
      current += character
    } else if (character === ',' && !quote) {
      items.push(current.trim())
      current = ''
    } else {
      current += character
    }
  }
  if (current.trim()) items.push(current.trim())
  return items
}

function yamlScalar(raw: string): unknown {
  const value = raw.trim()
  if (!value) return ''
  if (value === 'true') return true
  if (value === 'false') return false
  if (value === 'null' || value === '~') return null
  if (/^-?\d+(?:\.\d+)?$/.test(value)) return Number(value)
  if (value.startsWith('[') && value.endsWith(']')) {
    return splitInlineList(value.slice(1, -1)).map(yamlScalar)
  }
  if (value.startsWith('"') && value.endsWith('"')) {
    try { return JSON.parse(value) } catch { return value.slice(1, -1) }
  }
  if (value.startsWith("'") && value.endsWith("'")) return value.slice(1, -1).replaceAll("''", "'")
  return value
}

function parseFrontmatter(source: string) {
  const normalized = source.replace(/^\uFEFF/, '').replaceAll('\r\n', '\n')
  const match = normalized.match(/^---\n([\s\S]*?)\n---(?:\n|$)/)
  if (!match) throw new Error('Markdown file is missing YAML frontmatter.')
  const lines = match[1].split('\n')
  const data: Record<string, unknown> = {}
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    if (!line.trim() || line.trimStart().startsWith('#')) continue
    const field = line.match(/^([A-Za-z][\w-]*):(?:\s*(.*))?$/)
    if (!field) throw new Error(`Unsupported frontmatter line ${index + 1}: ${line}`)
    const [, key, raw = ''] = field
    if (raw === '|' || raw === '>') {
      const block: string[] = []
      while (lines[index + 1]?.match(/^\s+/)) block.push(lines[++index].replace(/^\s{2}/, ''))
      data[key] = raw === '>' ? block.join(' ') : block.join('\n')
      continue
    }
    if (!raw.trim()) {
      const items: unknown[] = []
      while (lines[index + 1]?.match(/^\s+-\s+/)) {
        items.push(yamlScalar(lines[++index].replace(/^\s+-\s+/, '')))
      }
      data[key] = items
      continue
    }
    data[key] = yamlScalar(raw)
  }
  return { data, content: normalized.slice(match[0].length) }
}

export function serializeArticleMarkdown(article: ArticleTransferRecord) {
  const entries: Array<[string, unknown]> = [
    ['title', article.title],
    ['pubDate', dateOnly(article.pubDate ?? new Date(0))],
  ]
  if (article.subtitle) entries.push(['subtitle', article.subtitle])
  if (article.excerpt) entries.push(['description', article.excerpt])
  if (article.updatedAt) entries.push(['lastModDate', dateOnly(article.updatedAt)])
  if (article.categoryName) entries.push(['category', article.categoryName])
  if (article.tagNames.length) entries.push(['tags', article.tagNames])
  if (article.draft) entries.push(['draft', true])
  if (article.visibility !== 'public') entries.push(['visibility', article.visibility])
  if (article.ogImage) entries.push(['ogImage', article.ogImage])
  if (!article.toc) entries.push(['toc', false])
  if (!article.share) entries.push(['share', false])
  if (!article.giscus) entries.push(['giscus', false])
  if (!article.search) entries.push(['search', false])
  if (article.radio) entries.push(['radio', true])
  if (article.video) entries.push(['video', true])
  if (article.platform) entries.push(['platform', article.platform])
  if (article.minutesRead !== null) entries.push(['minutesRead', article.minutesRead])
  const frontmatter = entries.map(([key, value]) => `${key}: ${yamlValue(value)}`).join('\n')
  return `---\n${frontmatter}\n---\n\n${article.content.replace(/^\n+/, '').replace(/\s+$/, '')}\n`
}

export function articleMarkdownPath(article: Pick<ArticleTransferRecord, 'slug' | 'categoryPath'>) {
  const folder = article.categoryPath?.replace(/^\/+|\/+$/g, '')
  return normalizeBundlePath(`src/content/blog/${folder ? `${folder}/` : ''}${article.slug}.md`)
}

function slugFromFilePath(path: string) {
  const normalized = normalizeBundlePath(path)
  const filename = normalized.split('/').at(-1) ?? ''
  return filename.replace(/\.(?:md|mdx)$/i, '')
}

export function parseArticleMarkdown(path: string, source: string) {
  const parsed = parseFrontmatter(source)
  const data = articleFrontmatterSchema.parse(parsed.data)
  return {
    title: data.title,
    slug: data.slug ?? slugFromFilePath(path),
    subtitle: data.subtitle ?? null,
    content: parsed.content.replace(/^\n+/, '').replace(/\s+$/, ''),
    excerpt: data.description ?? null,
    ogImage: typeof data.ogImage === 'string' ? data.ogImage : null,
    ogImageDisabled: data.ogImage === false,
    draft: data.draft,
    visibility: data.visibility,
    toc: data.toc,
    share: data.share,
    giscus: data.giscus,
    search: data.search,
    radio: data.radio,
    video: data.video,
    platform: data.platform ?? null,
    minutesRead: data.minutesRead ?? null,
    pubDate: data.pubDate ?? null,
    updatedAt: data.lastModDate ?? null,
    categoryName: data.category ?? null,
    tagNames: typeof data.tags === 'string' ? [data.tags] : data.tags ?? [],
  }
}

export function isArticleMarkdownPath(path: string) {
  const normalized = normalizeBundlePath(path)
  return normalized.startsWith('src/content/blog/') && /\.(?:md|mdx)$/i.test(normalized)
}
