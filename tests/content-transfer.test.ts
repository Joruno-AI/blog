import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CONTENT_BUNDLE_VERSION,
  CONTENT_SNAPSHOT_PATH,
  contentBundleSchema,
  contentSnapshotSchema,
  normalizeBundlePath,
} from '@/lib/content-transfer/contract'
import {
  articleMarkdownPath,
  isArticleMarkdownPath,
  parseArticleMarkdown,
  serializeArticleMarkdown,
} from '@/lib/content-transfer/markdown'
import { legacyContentEntry, parseLegacyProjects } from '@/lib/content-transfer/legacy-astro-import'

test('round-trips Astro-compatible article frontmatter and Markdown', () => {
  const content = serializeArticleMarkdown({
    title: '标题: "带引号"',
    slug: 'article-1',
    subtitle: '副标题',
    content: '# 正文\n\n内容',
    excerpt: '摘要',
    ogImage: 'https://example.com/cover.png',
    draft: false,
    visibility: 'unlisted',
    toc: false,
    share: true,
    giscus: false,
    search: true,
    radio: true,
    video: false,
    platform: 'web',
    minutesRead: 3.5,
    pubDate: new Date('2026-08-28T08:00:00.000Z'),
    updatedAt: new Date('2026-08-29T08:00:00.000Z'),
    categoryName: '开发/Next.js',
    categoryPath: 'dev/nextjs',
    tagNames: ['Next.js', '迁移'],
  })
  const parsed = parseArticleMarkdown('src/content/blog/dev/nextjs/article-1.md', content)

  assert.equal(parsed.title, '标题: "带引号"')
  assert.equal(parsed.slug, 'article-1')
  assert.equal(parsed.visibility, 'unlisted')
  assert.equal(parsed.toc, false)
  assert.equal(parsed.giscus, false)
  assert.deepEqual(parsed.tagNames, ['Next.js', '迁移'])
  assert.equal(parsed.content, '# 正文\n\n内容')
})

test('creates stable nested Astro blog paths', () => {
  const path = articleMarkdownPath({ slug: 'bun', categoryPath: '包管理工具/runtime' })
  assert.equal(path, 'src/content/blog/包管理工具/runtime/bun.md')
  assert.equal(isArticleMarkdownPath(path), true)
})

test('rejects path traversal and duplicate bundle entries', () => {
  assert.throws(() => normalizeBundlePath('../secret.txt'))
  assert.throws(() => normalizeBundlePath('/absolute.txt'))
  assert.throws(() => contentBundleSchema.parse({
    schemaVersion: CONTENT_BUNDLE_VERSION,
    generatedAt: new Date().toISOString(),
    source: { repository: null, ref: null, commit: null },
    files: [
      { path: 'same.json', kind: 'data', encoding: 'utf8', mediaType: 'application/json', content: '{}' },
      { path: 'same.json', kind: 'data', encoding: 'utf8', mediaType: 'application/json', content: '{}' },
    ],
  }))
})

test('requires current and published revision pointers to exist in the snapshot', () => {
  const resource = {
    id: 'resource-1',
    type: 'article',
    title: 'Article',
    slug: 'article',
    path: '/blog/article',
    description: null,
    status: 'published',
    visibility: 'public',
    coverAssetId: null,
    currentRevisionId: 'revision-current',
    publishedRevisionId: 'revision-missing',
    publishedAt: '2026-08-29T00:00:00.000Z',
    scheduledAt: null,
    createdAt: '2026-08-29T00:00:00.000Z',
    updatedAt: '2026-08-29T00:00:00.000Z',
    revisions: [{
      id: 'revision-current',
      version: 1,
      title: 'Article',
      slug: 'article',
      path: '/blog/article',
      description: null,
      visibility: 'public',
      content: 'Body',
      contentFormat: 'markdown',
      metadata: {},
      sourceHash: null,
      changeSummary: null,
      createdAt: '2026-08-29T00:00:00.000Z',
    }],
  }
  const result = contentSnapshotSchema.safeParse({
    resources: [resource], categories: [], tags: [], assets: [], articles: [], documents: [],
    albums: [], tracks: [], collections: [], categoryLinks: [], tagLinks: [], assetLinks: [],
    collectionItems: [], relations: [], routes: [], redirects: [], publicationEvents: [], settings: [],
  })
  assert.equal(result.success, false)
})

test('uses a reserved manifest path that remains repository-relative', () => {
  assert.equal(normalizeBundlePath(CONTENT_SNAPSHOT_PATH), CONTENT_SNAPSHOT_PATH)
})

test('maps legacy Astro collections to their canonical Next resource routes', () => {
  assert.deepEqual(legacyContentEntry('src/content/shorts/ai/ui.md'), {
    filePath: 'src/content/shorts/ai/ui.md',
    type: 'short',
    slug: 'ai/ui',
    path: '/shorts/ai/ui',
    article: false,
  })
  assert.equal(legacyContentEntry('src/content/changelog/3.0.0.md')?.path, '/changelog/3.0.0')
  assert.equal(legacyContentEntry('src/content/home/index.md'), null)
})

test('parses valid legacy Astro project data without accepting incomplete rows', () => {
  assert.deepEqual(parseLegacyProjects(JSON.stringify([
    { id: 'TypeCN', link: 'https://example.com', desc: 'Typing practice', icon: 'i-ph-translate-duotone', category: 'SaaS' },
    { id: 'Missing link', desc: 'Ignored', category: 'SaaS' },
  ])), [{
    id: 'TypeCN',
    link: 'https://example.com',
    desc: 'Typing practice',
    icon: 'i-ph-translate-duotone',
    category: 'SaaS',
  }])
  assert.deepEqual(parseLegacyProjects('{broken'), [])
})
