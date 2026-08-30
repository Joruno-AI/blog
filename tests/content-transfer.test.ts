import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { SQLiteSyncDialect } from 'drizzle-orm/sqlite-core'
import { eq } from 'drizzle-orm'
import { drizzle as drizzleProxy } from 'drizzle-orm/sqlite-proxy'
import { DatabaseSync, type SQLInputValue } from 'node:sqlite'
import { resources as resourcesTable } from '@/lib/db/schema'

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
import {
  GITHUB_FILES_PER_PAGE,
  discoverGitHubContent,
  githubAssetKey,
  readGitHubContentPage,
  writeContentBundleToGitHub,
} from '@/lib/content-transfer/github-service'
import {
  CONTENT_IMPORT_JOB_D1_ENVELOPE_QUERIES,
  CONTENT_IMPORT_MAX_R2_OPERATIONS_PER_ADVANCE,
  advanceContentImportJob,
  contentAddressedAssetKey,
  shouldFailContentImportJob,
  type ImportBucket,
  type ImportBucketMultipartUpload,
  type ImportBucketObject,
} from '@/lib/content-transfer/import-jobs'
import {
  IMPORT_DESCRIPTOR_FILES_PER_PAGE,
  IMPORT_MAX_DESCRIPTOR_PAGE_BYTES,
  IMPORT_MAX_SNAPSHOT_ITEMS,
  IMPORT_SNAPSHOT_ITEMS_PER_PAGE,
  decodeBase64Stream,
  decodeJsonStringStream,
  indexContentSnapshot,
  scanUploadedContentBundle,
  type PersistedImportFile,
  type SnapshotItemRange,
} from '@/lib/content-transfer/import-stream'
import {
  CONTENT_IMPORT_STATEMENTS_PER_PAGE,
  contentImportPageBounds,
  contentImportStatementCount,
} from '@/lib/content-transfer/import-service'
import {
  CONTENT_IMPORT_CUTOVER_STATEMENTS,
  CONTENT_IMPORT_MAX_D1_QUERIES_PER_ADVANCE,
  CONTENT_IMPORT_STAGE_MAX_BINDINGS_PER_STATEMENT,
  CONTENT_IMPORT_STAGE_RECORDS_PER_PAGE,
  buildContentImportStageStatements,
  buildContentImportCutoverStatements,
  contentImportStageRecordCount,
  contentImportStagePayloadBytes,
  type ImportStageRecord,
} from '@/lib/content-transfer/import-staging'
import {
  buildLegacyAstroImportStagePage,
  legacyContentEntry,
  legacyIdentityKey,
  legacyIdentityPaths,
  legacyImportFingerprint,
  legacyImportStateFingerprint,
  legacySourceFingerprint,
  legacyTaxonomyId,
  parseLegacyMusicCatalog,
  parseLegacyPhotos,
  parseLegacyProjects,
  parseLegacySkills,
  parseLegacyStreams,
  planLegacyAstroImport,
} from '@/lib/content-transfer/legacy-astro-import'

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
  assert.deepEqual(legacyContentEntry('src/content/changelog/3.0.0.md'), {
    filePath: 'src/content/changelog/3.0.0.md',
    type: 'document',
    slug: '300',
    path: '/changelog/300',
    article: false,
  })
  assert.equal(legacyContentEntry('src/content/home/index.md'), null)
})

test('recognizes the former dotted changelog path as the same import identity', () => {
  const entry = legacyContentEntry('src/content/changelog/3.0.0.md')
  assert.ok(entry)
  assert.deepEqual(legacyIdentityPaths(entry), ['/changelog/300', '/changelog/3.0.0'])

  const short = legacyContentEntry('src/content/shorts/ai/ui.md')
  assert.ok(short)
  assert.deepEqual(legacyIdentityPaths(short), ['/shorts/ai/ui'])
})

test('preserves an explicit false OG image flag for generic Astro documents', () => {
  const parsed = parseArticleMarkdown('src/content/changelog/3.0.0.md', [
    '---',
    'title: Release 3.0.0',
    'pubDate: 2026-08-28',
    'ogImage: false',
    '---',
    '',
    'Body',
  ].join('\n'))
  assert.equal(parsed.ogImage, null)
  assert.equal(parsed.ogImageDisabled, true)
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

test('parses legacy Astro streams with media flags and publication dates', () => {
  const [stream] = parseLegacyStreams(JSON.stringify([{
    id: 'Astro in 100 Seconds',
    pubDate: '2021-07-16',
    link: 'https://www.youtube.com/watch?v=example',
    video: true,
    platform: 'YouTube',
  }]))
  assert.equal(stream.id, 'Astro in 100 Seconds')
  assert.equal(stream.video, true)
  assert.equal(stream.radio, false)
  assert.equal(stream.platform, 'YouTube')
  assert.equal(stream.pubDate.toISOString(), '2021-07-16T00:00:00.000Z')
})

test('parses legacy Agent skills and preserves enrichment metadata', () => {
  const [skill] = parseLegacySkills(JSON.stringify([{
    id: 'anthropics/skills',
    name: 'skills',
    author: 'anthropics',
    desc: 'Public repository for Agent Skills',
    descZh: 'Anthropic 官方 Agent Skills 仓库',
    category: 'claude-skill',
    stars: 170866,
    installs: 2933880,
    qualityScore: 63,
    securityGrade: 'safe',
    platforms: ['python'],
    tags: ['agent', 'claude'],
    official: true,
    keywords: 'Claude Code 技能',
    pushedAt: '2026-08-21T17:10:55Z',
    createdAt: '2025-09-22T15:53:31Z',
    language: 'Python',
    starsDelta: 120,
  }]))
  assert.equal(skill.id, 'anthropics/skills')
  assert.equal(skill.official, true)
  assert.equal(skill.installs, 2933880)
  assert.deepEqual(skill.tags, ['agent', 'claude'])
  assert.equal(skill.pushedAt?.toISOString(), '2026-08-21T17:10:55.000Z')
  assert.deepEqual(parseLegacySkills(JSON.stringify([{ id: 'missing-fields' }])), [])
})

test('maps every production Astro music/photo/home/skill source with pinned counts and checksums', async (context) => {
  const revision = 'e734b674'
  const expected = new Map<string, string>([
    ['src/content/music/fallback-catalog.json', '28ea0ce6b84f20665c1a0b2ace3821a9fb2153a1bbcbca2f6e45fc8f880ee5a0'],
    ['src/content/music/data.json', 'c9b6b95defac926f2df482a90aeeba8aa5c18896b0762e1d0d7b38c4e4b5f884'],
    ['src/content/music/audio-quality.json', '1944bbd066d136bcd0e896554e865f6f5c2a8ec82ffb30178c1ce2358f79ef76'],
    ['src/content/music/lyric-alignment.json', 'ccb52d75029910b3ee843767f1935a18243f738b6cac0de48d54bf3f21f10104'],
    ['src/content/photos/data.json', 'bf434732d01aafed62371112f8378242b9a8d5f2067725e58df4ff8f8eaa59a3'],
    ['src/content/home/index.md', 'a8cae78eeaa127c26130c49f2c6dca01477b00037f3eb46d72b8545f25d21aa4'],
    ['src/content/skills/data.json', 'b7e032e305c64c5b629ff2f14901cd56e1c43d7a2be3de6b238ae0e02f162a4c'],
    ['src/content/skills/desc-zh.json', '8d6726f19dee0cacb54ef094b7187fc39b9ea5d2797ea0f313c133edd547dacb'],
    ['src/content/skills/meta.json', '9e0cb909dcd5d3452ce46c79877ea6dd4c7eccac87b82d0506aae1fe5a2d8e79'],
  ])
  let sources: Array<{ path: string; content: string }>
  try {
    sources = [...expected].map(([path]) => {
      const content = execFileSync('git', ['show', `${revision}:${path}`], { encoding: 'utf8', maxBuffer: 2_000_000 })
      return { path, content }
    })
  } catch {
    context.skip('production Astro source commit is unavailable in this checkout')
    return
  }
  for (const source of sources) {
    assert.equal(createHash('sha256').update(source.content).digest('hex'), expected.get(source.path))
  }

  const fallback = sources.find((file) => file.path.endsWith('fallback-catalog.json'))!.content
  const albums = parseLegacyMusicCatalog(fallback)
  assert.equal(albums.length, 55)
  assert.equal(albums.reduce((total, album) => total + album.songs.length, 0), 634)
  assert.equal(parseLegacyPhotos(sources.find((file) => file.path === 'src/content/photos/data.json')!.content).length, 31)
  assert.equal(parseLegacySkills(sources.find((file) => file.path === 'src/content/skills/data.json')!.content).length, 400)

  const productionBundle = {
    schemaVersion: CONTENT_BUNDLE_VERSION,
    generatedAt: '2026-08-30T00:00:00.000Z',
    source: { repository: 'Joruno-AI/blog', ref: 'main', commit: revision },
    files: sources.map((file) => ({
      path: file.path,
      kind: file.path.endsWith('.md') ? 'content' as const : 'data' as const,
      encoding: 'utf8' as const,
      mediaType: file.path.endsWith('.md') ? 'text/markdown' : 'application/json',
      content: file.content,
    })),
  }
  const { plan, baselines } = await planLegacyAstroImport(productionBundle, async () => new Map())
  assert.equal(plan.resources.total, 1_129)
  assert.equal(plan.revisions, 1_129)
  assert.equal(plan.assets, 31)
  assert.ok(new TextEncoder().encode(JSON.stringify(baselines)).byteLength < 500_000)

  const albumPage = await buildLegacyAstroImportStagePage(productionBundle, 'production-map', null, 0, baselines)
  assert.equal(albumPage.records.some((record) => record.entityType === 'album'), true)
  const trackPage = await buildLegacyAstroImportStagePage(productionBundle, 'production-map', null, 1, baselines)
  assert.equal(trackPage.records.some((record) => record.entityType === 'track'), true)
  assert.equal(trackPage.records.some((record) => record.entityType === 'relation'), true)

  // 55 albums + 634 tracks precede the lossless fallback-catalog archive.
  const fallbackArchive = await buildLegacyAstroImportStagePage(productionBundle, 'production-map', null, 689, baselines)
  const archivedRevision = fallbackArchive.records.find((record) => record.entityType === 'revision')
  assert.equal(archivedRevision?.contentText, fallback)
  assert.equal(archivedRevision?.payload.sourceHash, expected.get('src/content/music/fallback-catalog.json'))

  // The remaining cursors prove each specialized source reaches its concrete
  // model rather than merely contributing to a plan counter.
  const photoPage = await buildLegacyAstroImportStagePage(productionBundle, 'production-map', null, 693, baselines)
  assert.equal(photoPage.records.some((record) => record.entityType === 'asset'), true)
  const homePage = await buildLegacyAstroImportStagePage(productionBundle, 'production-map', null, 725, baselines)
  assert.equal(homePage.records.some((record) => record.entityType === 'document'), true)
  const skillPage = await buildLegacyAstroImportStagePage(productionBundle, 'production-map', null, 726, baselines)
  assert.equal(skillPage.records.some((record) => record.entityType === 'resource'
    && record.payload.type === 'tool'), true)
})

test('rejects an unmapped Astro content file instead of reporting a lossy success', async () => {
  await assert.rejects(planLegacyAstroImport({
    schemaVersion: CONTENT_BUNDLE_VERSION,
    generatedAt: '2026-08-30T00:00:00.000Z',
    source: { repository: 'owner/repository', ref: 'main', commit: 'commit' },
    files: [{
      path: 'src/content/new-feature/data.json', kind: 'data', encoding: 'utf8',
      mediaType: 'application/json', content: '{"must":"not disappear"}',
    }],
  }, async () => new Map()), /unsupported source files would be dropped/)
})

test('rewrites imported photo, album-cover, and track media to persisted R2 URLs', async () => {
  const external = (path: string, url: string) => ({
    path, kind: 'asset' as const, encoding: 'external' as const,
    mediaType: path.endsWith('.mp3') ? 'audio/mpeg' : 'image/webp',
    url, sourceKey: `imported-assets/sha/${path.replace(/^public\//, '')}`,
  })
  const bundle = {
    schemaVersion: CONTENT_BUNDLE_VERSION,
    generatedAt: '2026-08-30T00:00:00.000Z',
    source: { repository: 'owner/repository', ref: 'main', commit: 'commit' },
    files: [
      external('public/img/photos/one.webp', 'https://assets.example/photo.webp'),
      external('public/img/album.webp', 'https://assets.example/album.webp'),
      external('public/music/song.mp3', 'https://assets.example/song.mp3'),
      {
        path: 'src/content/photos/data.json', kind: 'data' as const, encoding: 'utf8' as const,
        mediaType: 'application/json', content: JSON.stringify([{ id: '/img/photos/one.webp', desc: 'One' }]),
      },
      {
        path: 'src/content/music/fallback-catalog.json', kind: 'data' as const, encoding: 'utf8' as const,
        mediaType: 'application/json', content: JSON.stringify([{
          id: 'album', name: 'Album', artist: 'Artist', cover: '/img/album.webp', songs: [{
            id: 'song', name: 'Song', duration: '3:00', url: '/music/song.mp3', hasLyrics: false,
          }],
        }]),
      },
    ],
  }
  const planned = await planLegacyAstroImport(bundle, async () => new Map())
  const photo = await buildLegacyAstroImportStagePage(bundle, 'media-job', null, 3, planned.baselines)
  const photoAsset = photo.records.find((record) => record.entityType === 'asset')
  assert.equal(photoAsset?.payload.url, 'https://assets.example/photo.webp')
  assert.equal(photo.result.assets, 1)

  const album = await buildLegacyAstroImportStagePage(bundle, 'media-job', null, 5, planned.baselines)
  const albumRevision = album.records.find((record) => record.entityType === 'revision')
  assert.equal((albumRevision?.payload.metadata as Record<string, unknown>).cover, 'https://assets.example/album.webp')

  const track = await buildLegacyAstroImportStagePage(bundle, 'media-job', null, 6, planned.baselines)
  const trackProjection = track.records.find((record) => record.entityType === 'track')
  assert.equal(trackProjection?.payload.externalUrl, 'https://assets.example/song.mp3')
})

test('discovers 400+ GitHub files once and fetches bounded persisted pages including media', async () => {
  const textEntries = Array.from({ length: 300 }, (_, index) => ({
    path: `src/content/blog/post-${String(index).padStart(3, '0')}.md`,
    type: 'blob',
    sha: `text-${index}`,
    size: 100,
  }))
  const mediaEntries = Array.from({ length: 120 }, (_, index) => ({
    path: index % 2 ? `public/music/song-${index}.mp3` : `public/img/photo-${index}.webp`,
    type: 'blob',
    sha: `asset-${index}`,
    size: Math.floor((133 * 1024 * 1024) / 120),
  }))
  const originalFetch = globalThis.fetch
  const requests: string[] = []
  const largeMediaBytes = 133 * 1024 * 1024
  globalThis.fetch = async (input) => {
    const url = String(input)
    requests.push(url)
    if (url.includes('/commits/')) {
      return Response.json({
        sha: '0123456789abcdef0123456789abcdef01234567',
        commit: { tree: { sha: 'tree-sha' } },
      })
    }
    if (url.includes('/git/trees/')) {
      return Response.json({ truncated: false, tree: [...textEntries, ...mediaEntries, { path: 'README.md', type: 'blob', sha: 'ignored', size: 10 }] })
    }
    if (url.endsWith('/asset-0')) {
      let remaining = largeMediaBytes
      return new Response(new ReadableStream<Uint8Array>({
        pull(controller) {
          if (remaining <= 0) return controller.close()
          const size = Math.min(1024 * 1024, remaining)
          controller.enqueue(new Uint8Array(size))
          remaining -= size
        },
      }))
    }
    return new Response(url.includes('text-') ? '---\ntitle: Imported\npubDate: 2026-08-30\n---\n\nBody' : new Uint8Array(1024))
  }
  try {
    const source = await discoverGitHubContent({
      repository: 'owner/repository',
      ref: 'main',
      token: 'TOKEN',
    })
    assert.equal(requests.length, 2)
    assert.equal(source.entries.length, 420)
    assert.equal(source.entries.filter((entry) => entry.kind === 'asset').reduce((sum, entry) => sum + entry.size, 0) > 132 * 1024 * 1024, true)

    let cursor = 0
    let pages = 0
    let persistedAssets = 0
    let maxMediaChunk = 0
    const collected: Array<{ path: string; encoding: string; sourceKey?: string }> = []
    while (cursor < source.entries.length) {
      const before = requests.length
      const page = await readGitHubContentPage({
        source,
        cursor,
        token: 'TOKEN',
        persistAssets: true,
        assetSink: {
          async reference(entry) {
            const key = githubAssetKey(entry.path)
            return { key, url: `https://assets.example/${key}` }
          },
          async write(entry, body) {
            const key = githubAssetKey(entry.path)
            let received = 0
            const reader = body.getReader()
            while (true) {
              const chunk = await reader.read()
              if (chunk.done) break
              maxMediaChunk = Math.max(maxMediaChunk, chunk.value.byteLength)
              received += chunk.value.byteLength
            }
            assert.equal(received, entry.sha === 'asset-0' ? largeMediaBytes : 1024)
            persistedAssets += 1
            return { key, url: `https://assets.example/${key}` }
          },
        },
      })
      assert.ok(requests.length - before <= GITHUB_FILES_PER_PAGE)
      collected.push(...page.files)
      cursor = page.cursor
      pages += 1
    }
    assert.equal(pages, Math.ceil(420 / GITHUB_FILES_PER_PAGE))
    assert.equal(collected.length, 420)
    assert.equal(collected.filter((file) => file.encoding === 'external').length, 120)
    assert.equal(persistedAssets, 120)
    assert.ok(maxMediaChunk <= 1024 * 1024)
    assert.equal(collected.find((file) => file.path.startsWith('public/music/'))?.sourceKey?.startsWith('music/'), true)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('keeps sensitive manifests in a private binding and exposes only content-addressed media keys', () => {
  const jobId = 'private-job-id-that-must-not-leak'
  const key = contentAddressedAssetKey({
    path: 'public/img/photo.webp',
    sha: '0123456789abcdef',
    size: 1024,
    kind: 'asset',
  })
  assert.equal(key, 'imported-assets/0123456789abcdef/img/photo.webp')
  assert.doesNotMatch(key, new RegExp(jobId))
  assert.doesNotMatch(key, /content-import-jobs|internal/)

  const jobs = readFileSync('lib/content-transfer/import-jobs.ts', 'utf8')
  const worker = readFileSync('custom-worker.ts', 'utf8')
  const wrangler = readFileSync('wrangler.toml', 'utf8')
  assert.match(jobs, /env\.CONTENT_IMPORT_BUCKET/)
  assert.match(jobs, /env\.R2_BUCKET/)
  assert.match(wrangler, /binding = "CONTENT_IMPORT_BUCKET"[\s\S]*bucket_name = "blog-cms-import-private"/)
  assert.doesNotMatch(worker, /CONTENT_IMPORT_BUCKET/)
  assert.match(worker, /serveLegacyStaticAsset\(request, env\.R2_BUCKET\)/)
})

test('fences same-second import workers and persists immutable bounded import segments', () => {
  const jobsSource = readFileSync('lib/content-transfer/import-jobs.ts', 'utf8')
  assert.match(jobsSource, /const leaseToken = crypto\.randomUUID\(\)/)
  assert.match(jobsSource, /eq\(platformJobs\.outputJson, job\.outputJson\)/)
  assert.ok((jobsSource.match(/eq\(platformJobs\.outputJson, claimedOutputJson\)/g) ?? []).length >= 2)
  assert.match(jobsSource, /onlyIf: \{ etagMatches: expectedEtag \}/)
  assert.match(jobsSource, /onlyIf: \{ etagDoesNotMatch: '\*' \}/)
  assert.match(jobsSource, /createMultipartUpload/)
  assert.match(jobsSource, /snapshot-index\/\$\{generation\}/)
  assert.doesNotMatch(jobsSource, /mergeBundleFiles|readBundle\(/)
  assert.match(jobsSource, /preserveCommit: true/)
  assert.equal(shouldFailContentImportJob('complete', new Error('D1 unavailable'), 5, 5), false)
  assert.equal(shouldFailContentImportJob('cleanup', new Error('R2 unavailable'), 50, 5), false)
  assert.equal(shouldFailContentImportJob(
    'commit', Object.assign(new Error('D1 outcome unknown'), { commitUncertain: true }), 50, 5,
  ), false)
  assert.equal(shouldFailContentImportJob('stage', Object.assign(new Error('invalid bundle'), { permanent: true }), 1, 5), true)
  assert.equal(shouldFailContentImportJob('stage', new Error('D1 unavailable'), 1, 5), false)
  assert.equal(shouldFailContentImportJob('stage', new Error('D1 unavailable'), 5, 5), true)
  const stagingSource = readFileSync('lib/content-transfer/import-staging.ts', 'utf8')
  assert.match(stagingSource, /if \(await findCommit\(\)\) return \{ committed: true/)
  assert.match(stagingSource, /ContentImportCommitUncertainError/)
  assert.match(stagingSource, /json_extract\(j\.output_json, '\$\.leaseToken'\)=\$\{leaseToken\}/)
})

type FixtureD1Result = {
  success: true
  results: Record<string, unknown>[]
  meta: { changes: number }
}

class CountingD1Statement {
  constructor(
    private readonly owner: CountingD1Database,
    readonly source: string,
    readonly parameters: SQLInputValue[] = [],
  ) {}

  bind(...parameters: SQLInputValue[]) {
    return new CountingD1Statement(this.owner, this.source, parameters)
  }

  async all() {
    this.owner.operations += 1
    if (this.owner.suppressRelease(this.source, this.parameters)) {
      return { success: true, results: [], meta: { changes: 0 } } satisfies FixtureD1Result
    }
    const results = this.owner.sqlite.prepare(this.source).all(...this.parameters) as Record<string, unknown>[]
    return { success: true, results, meta: { changes: 0 } } satisfies FixtureD1Result
  }

  async raw() {
    this.owner.operations += 1
    if (this.owner.suppressRelease(this.source, this.parameters)) return []
    const statement = this.owner.sqlite.prepare(this.source)
    statement.setReturnArrays(true)
    return statement.all(...this.parameters) as unknown as unknown[][]
  }

  async run() {
    this.owner.operations += 1
    if (this.owner.suppressRelease(this.source, this.parameters)) {
      return { success: true, results: [], meta: { changes: 0 } } satisfies FixtureD1Result
    }
    const result = this.owner.sqlite.prepare(this.source).run(...this.parameters)
    return {
      success: true,
      results: [],
      meta: { changes: Number(result.changes) },
    } satisfies FixtureD1Result
  }

  async first(column?: string) {
    const result = await this.all()
    const row = result.results[0] ?? null
    return column && row ? row[column] ?? null : row
  }
}

class CountingD1Database {
  operations = 0
  suppressNextRelease = false

  constructor(readonly sqlite: DatabaseSync) {}

  resetOperations() {
    this.operations = 0
  }

  suppressRelease(source: string, parameters: SQLInputValue[]) {
    if (!this.suppressNextRelease || !/^update\s+"?platform_jobs"?/i.test(source)) return false
    if (!['waiting', 'completed', 'failed'].includes(String(parameters[0]))) return false
    this.suppressNextRelease = false
    return true
  }

  prepare(source: string) {
    return new CountingD1Statement(this, source)
  }

  async batch(statements: CountingD1Statement[]) {
    const results: FixtureD1Result[] = []
    this.sqlite.exec('BEGIN IMMEDIATE')
    try {
      for (const statement of statements) results.push(await statement.run())
      this.sqlite.exec('COMMIT')
      return results
    } catch (error) {
      if (this.sqlite.isTransaction) this.sqlite.exec('ROLLBACK')
      throw error
    }
  }
}

function importAdvanceFixture() {
  const sqlite = new DatabaseSync(':memory:')
  sqlite.exec(`
    CREATE TABLE platform_jobs (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      resource_id TEXT,
      progress INTEGER NOT NULL DEFAULT 0,
      attempts INTEGER NOT NULL DEFAULT 0,
      max_attempts INTEGER NOT NULL DEFAULT 5,
      input_json TEXT NOT NULL DEFAULT '{}',
      output_json TEXT,
      error TEXT,
      started_at INTEGER,
      completed_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE content_import_staging (job_id TEXT NOT NULL);
    CREATE TABLE content_import_commits (job_id TEXT PRIMARY KEY)
  `)
  return { sqlite, d1: new CountingD1Database(sqlite) }
}

function insertImportAdvanceJob(input: {
  sqlite: DatabaseSync
  id: string
  ownerId: string
  packagePrefix: string
  jobInput: Record<string, unknown>
  jobOutput: Record<string, unknown>
}) {
  const now = Date.now()
  input.sqlite.prepare(`
    INSERT INTO platform_jobs
      (id, type, status, progress, attempts, max_attempts, input_json, output_json, created_at, updated_at)
    VALUES (?, 'content_import_v3', 'pending', 0, 0, 5, ?, ?, ?, ?)
  `).run(input.id, JSON.stringify({
    version: 3,
    ownerId: input.ownerId,
    dryRun: true,
    packagePrefix: input.packagePrefix,
    ...input.jobInput,
  }), JSON.stringify(input.jobOutput), now, now)
}

async function withImportCloudflareContext<T>(
  d1: CountingD1Database,
  bucket: CountingImportBucket,
  run: () => Promise<T>,
) {
  const contextKey = Symbol.for('__cloudflare-context__')
  const globalStore = globalThis as unknown as Record<symbol, unknown>
  const previous = globalStore[contextKey]
  globalStore[contextKey] = { env: { DB: d1, CONTENT_IMPORT_BUCKET: bucket, R2_BUCKET: bucket } }
  try {
    return await run()
  } finally {
    if (previous === undefined) delete globalStore[contextKey]
    else globalStore[contextKey] = previous
  }
}

class CountingImportBucket implements ImportBucket {
  private readonly objects = new Map<string, Uint8Array>()
  operations = 0
  maximumPutBytes = 0

  seed(key: string, value: string) {
    this.objects.set(key, new TextEncoder().encode(value))
  }

  resetOperations() {
    this.operations = 0
    this.maximumPutBytes = 0
  }

  peekText(key: string) {
    const value = this.objects.get(key)
    if (!value) throw new Error(`missing seeded object ${key}`)
    return new TextDecoder().decode(value)
  }

  keys(prefix = '') {
    return [...this.objects.keys()].filter((key) => key.startsWith(prefix)).sort()
  }

  private object(key: string): ImportBucketObject | null {
    const value = this.objects.get(key)
    if (!value) return null
    const etag = createHash('sha256').update(value).digest('hex')
    return {
      etag,
      size: value.byteLength,
      body: new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(value)
          controller.close()
        },
      }),
      async text() { return new TextDecoder().decode(value) },
    }
  }

  async head(key: string) {
    this.operations += 1
    return this.object(key)
  }

  async get(
    key: string,
    options?: { range?: { offset: number; length: number }; onlyIf?: { etagMatches?: string } },
  ) {
    this.operations += 1
    const object = this.object(key)
    if (!object || (options?.onlyIf?.etagMatches && object.etag !== options.onlyIf.etagMatches)) return null
    if (!options?.range) return object
    const value = this.objects.get(key)!
    const ranged = value.slice(options.range.offset, options.range.offset + options.range.length)
    return {
      ...object,
      body: new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(ranged)
          controller.close()
        },
      }),
      async text() { return new TextDecoder().decode(ranged) },
    }
  }

  async put(
    key: string,
    value: string | Uint8Array | ReadableStream<Uint8Array>,
    options?: { onlyIf?: { etagMatches?: string; etagDoesNotMatch?: string } },
  ) {
    this.operations += 1
    const existing = this.object(key)
    if (options?.onlyIf?.etagMatches && existing?.etag !== options.onlyIf.etagMatches) return null
    if (options?.onlyIf?.etagDoesNotMatch === '*' && existing) return null
    const bytes = typeof value === 'string'
      ? new TextEncoder().encode(value)
      : value instanceof Uint8Array
        ? value
        : new Uint8Array(await new Response(value).arrayBuffer())
    this.maximumPutBytes = Math.max(this.maximumPutBytes, bytes.byteLength)
    this.objects.set(key, bytes)
    return this.object(key)
  }

  async createMultipartUpload(key: string): Promise<ImportBucketMultipartUpload> {
    this.operations += 1
    const uploaded = new Map<number, Uint8Array>()
    return {
      uploadPart: async (partNumber, value) => {
        this.operations += 1
        uploaded.set(partNumber, value.slice())
        return { partNumber, etag: `part-${partNumber}` }
      },
      complete: async (parts) => {
        this.operations += 1
        const size = parts.reduce((total, part) => total + (uploaded.get(part.partNumber)?.byteLength ?? 0), 0)
        const value = new Uint8Array(size)
        let offset = 0
        for (const part of parts) {
          const bytes = uploaded.get(part.partNumber)
          if (!bytes) throw new Error(`missing multipart part ${part.partNumber}`)
          value.set(bytes, offset)
          offset += bytes.byteLength
        }
        this.maximumPutBytes = Math.max(this.maximumPutBytes, value.byteLength)
        this.objects.set(key, value)
        return this.object(key)!
      },
      abort: async () => {
        this.operations += 1
        uploaded.clear()
      },
    }
  }

  async delete(key: string | string[]) {
    this.operations += 1
    for (const item of Array.isArray(key) ? key : [key]) this.objects.delete(item)
  }

  async list(options?: { prefix?: string; cursor?: string; limit?: number }) {
    this.operations += 1
    const keys = this.keys(options?.prefix)
    const afterCursor = options?.cursor
      ? keys.findIndex((key) => key > options.cursor!)
      : 0
    const start = afterCursor < 0 ? keys.length : afterCursor
    const limit = options?.limit ?? 1_000
    const objects = keys.slice(start, start + limit).map((key) => ({ key }))
    const next = start + objects.length
    return {
      objects,
      truncated: next < keys.length,
      ...(next < keys.length && objects.length ? { cursor: objects.at(-1)!.key } : {}),
    }
  }
}

test('stream-scans a real-scale 29 MB upload with bounded heap and no whole-body API parse', async () => {
  const encoder = new TextEncoder()
  const payloadBytes = 29 * 1024 * 1024
  const prefix = encoder.encode('{"schemaVersion":"joruno-content/v1","generatedAt":"2026-08-30T00:00:00.000Z","source":{"repository":null,"ref":null,"commit":null},"files":[{"path":".joruno/content.json","kind":"data","encoding":"utf8","mediaType":"application/json","content":"{\\"resources\\":[],\\"categories\\":[],\\"tags\\":[],\\"assets\\":[],\\"articles\\":[],\\"documents\\":[],\\"albums\\":[],\\"tracks\\":[],\\"collections\\":[],\\"categoryLinks\\":[],\\"tagLinks\\":[],\\"assetLinks\\":[],\\"collectionItems\\":[],\\"relations\\":[],\\"routes\\":[],\\"redirects\\":[],\\"publicationEvents\\":[],\\"settings\\":[],\\"padding\\":\\"')
  const suffix = encoder.encode('\\"}","size":0}]}')
  const payload = new Uint8Array(64 * 1024).fill(0x61)
  const before = process.memoryUsage().heapUsed
  let peak = before
  let sent = 0
  let phase = 0
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      peak = Math.max(peak, process.memoryUsage().heapUsed)
      if (phase === 0) { controller.enqueue(prefix); phase = 1; return }
      if (sent < payloadBytes) {
        const length = Math.min(payload.byteLength, payloadBytes - sent)
        controller.enqueue(length === payload.byteLength ? payload : payload.slice(0, length))
        sent += length
        return
      }
      if (phase === 1) { controller.enqueue(suffix); phase = 2; return }
      controller.close()
    },
  })
  let descriptorPages = 0
  const scanned = await scanUploadedContentBundle(stream, async (_page, files) => {
    descriptorPages += 1
    assert.ok(files.length <= IMPORT_DESCRIPTOR_FILES_PER_PAGE)
  })
  peak = Math.max(peak, process.memoryUsage().heapUsed)
  assert.equal(scanned.fileCount, 1)
  assert.equal(descriptorPages, 1)
  assert.ok(scanned.snapshot?.contentRange)
  assert.ok(peak - before < 32 * 1024 * 1024, `stream scanner heap grew ${Math.round((peak - before) / 1024 / 1024)} MB`)

  const routeSource = readFileSync('app/api/content-transfer/import/route.ts', 'utf8')
  const settingsSource = readFileSync('app/(studio)/studio/settings/page.tsx', 'utf8')
  const jobsSource = readFileSync('lib/content-transfer/import-jobs.ts', 'utf8')
  assert.doesNotMatch(routeSource, /request\.json\(\)/)
  assert.match(routeSource, /body: request\.body/)
  assert.doesNotMatch(settingsSource, /JSON\.parse\(await file\.text\(\)\)/)
  assert.doesNotMatch(jobsSource, /mergeBundleFiles|await readBundle/)
  assert.match(jobsSource, /range: \{ offset: item\.offset, length: item\.length \}/)
  const maximumIndexR2Subrequests = 1 + Math.ceil(IMPORT_MAX_SNAPSHOT_ITEMS / IMPORT_SNAPSHOT_ITEMS_PER_PAGE)
  assert.equal(1 + Math.ceil(7_542 / IMPORT_SNAPSHOT_ITEMS_PER_PAGE), 31)
  assert.ok(maximumIndexR2Subrequests < 50)
})

test('decodes and indexes an escaped snapshot without retaining parent arrays', async () => {
  const now = '2026-08-30T00:00:00.000Z'
  const snapshot = JSON.stringify({
    resources: [{
      id: 'resource-1', type: 'document', title: '标题 🚀', slug: 'doc', path: '/docs/doc', description: null,
      status: 'published', visibility: 'public', coverAssetId: null, currentRevisionId: 'revision-1',
      publishedRevisionId: 'revision-1', publishedAt: now, scheduledAt: null, createdAt: now, updatedAt: now,
      revisions: [{
        id: 'revision-1', version: 1, title: '标题 🚀', slug: 'doc', path: '/docs/doc', description: null,
        visibility: 'public', content: 'line 1\n"quoted" 🚀', contentFormat: 'markdown', metadata: {},
        sourceHash: null, changeSummary: null, createdAt: now,
      }],
    }],
    categories: [], tags: [], assets: [], articles: [], documents: [], albums: [], tracks: [], collections: [],
    categoryLinks: [], tagLinks: [], assetLinks: [], collectionItems: [], relations: [], routes: [], redirects: [],
    publicationEvents: [], settings: [],
  })
  const escaped = JSON.stringify(snapshot).slice(1, -1)
  const raw = new TextEncoder().encode(escaped)
  const decoded = decodeJsonStringStream(new ReadableStream<Uint8Array>({
    start(controller) {
      for (let offset = 0; offset < raw.length; offset += 7) controller.enqueue(raw.slice(offset, offset + 7))
      controller.close()
    },
  }))
  const value = await new Response(decoded.stream).text()
  assert.equal(value, snapshot)
  const pages: SnapshotItemRange[][] = []
  const indexed = await indexContentSnapshot(new ReadableStream<Uint8Array>({
    start(controller) {
      const bytes = new TextEncoder().encode(value)
      for (let offset = 0; offset < bytes.length; offset += 11) controller.enqueue(bytes.slice(offset, offset + 11))
      controller.close()
    },
  }), async (_page, items) => { pages.push(items) })
  assert.equal(indexed.itemCount, 1)
  assert.equal(indexed.groupCounts.resources, 1)
  assert.equal(pages.length, 1)
  assert.equal(pages[0][0].group, 'resources')
})

test('indexes the 7,542-item production scale in 30 bounded R2 pages', async () => {
  const encoder = new TextEncoder()
  const itemCount = 7_542
  const emptyGroups = [
    'resources', 'categories', 'tags', 'assets', 'articles', 'documents', 'albums', 'tracks', 'collections',
    'categoryLinks', 'tagLinks', 'assetLinks', 'collectionItems', 'relations', 'routes', 'redirects',
    'publicationEvents',
  ]
  const prefix = encoder.encode(`{${emptyGroups.map((group) => `"${group}":[]`).join(',')},"settings":[`)
  const suffix = encoder.encode(']}')
  const padding = 'x'.repeat(3_900)
  const firstItem = encoder.encode(`{"id":"setting","padding":"${padding}"}`)
  const nextItem = encoder.encode(`,{"id":"setting","padding":"${padding}"}`)
  let cursor = -1
  const before = process.memoryUsage().heapUsed
  let peak = before
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      peak = Math.max(peak, process.memoryUsage().heapUsed)
      if (cursor === -1) {
        controller.enqueue(prefix)
        cursor = 0
      } else if (cursor < itemCount) {
        controller.enqueue(cursor ? nextItem : firstItem)
        cursor += 1
      } else if (cursor === itemCount) {
        controller.enqueue(suffix)
        cursor += 1
      } else {
        controller.close()
      }
    },
  })
  let pages = 0
  const indexed = await indexContentSnapshot(stream, async (page, items) => {
    assert.equal(page, pages)
    assert.ok(items.length <= IMPORT_SNAPSHOT_ITEMS_PER_PAGE)
    pages += 1
  })
  peak = Math.max(peak, process.memoryUsage().heapUsed)
  assert.equal(indexed.itemCount, itemCount)
  assert.equal(pages, 30)
  assert.ok(peak - before < 64 * 1024 * 1024, `snapshot index heap grew ${Math.round((peak - before) / 1024 / 1024)} MB`)
})

test('advances a 20,000-file upload with complete lease-envelope budgets below 50', async () => {
  const files = Array.from({ length: 20_000 }, (_, index) => ({
    path: `src/content/blog/post-${index}.md`,
    kind: 'content' as const,
    encoding: 'utf8' as const,
    mediaType: 'text/markdown',
    content: '',
  }))
  const bundle = JSON.stringify({
    schemaVersion: CONTENT_BUNDLE_VERSION,
    generatedAt: '2026-08-30T00:00:00.000Z',
    source: { repository: null, ref: null, commit: null },
    files,
  })
  const encoded = new TextEncoder().encode(bundle)
  const rawEtag = createHash('sha256').update(encoded).digest('hex')
  const bucket = new CountingImportBucket()
  const { sqlite, d1 } = importAdvanceFixture()
  const ownerId = 'upload-owner'

  const run = async (id: string, loseLease: boolean) => {
    const packagePrefix = `${id}/package`
    const rawBundleKey = `${packagePrefix}/uploaded-bundle.json`
    bucket.seed(rawBundleKey, bundle)
    insertImportAdvanceJob({
      sqlite,
      id,
      ownerId,
      packagePrefix,
      jobInput: { rawBundleKey, rawBundleEtag: rawEtag, rawBundleSize: encoded.byteLength },
      jobOutput: {
        phase: 'scan', cursor: 0, total: encoded.byteLength, plan: null,
        result: { created: 0, updated: 0, unchanged: 0, assets: 0 },
      },
    })
    d1.suppressNextRelease = loseLease
    d1.resetOperations()
    bucket.resetOperations()
    const advanced = await advanceContentImportJob(id, ownerId)
    return {
      advanced,
      d1Operations: d1.operations,
      r2Operations: bucket.operations,
      maximumPutBytes: bucket.maximumPutBytes,
      packagePrefix,
    }
  }

  await withImportCloudflareContext(d1, bucket, async () => {
    const normal = await run('upload-20k-normal', false)
    assert.equal(normal.advanced?.phase, 'legacy-plan')
    assert.equal(normal.d1Operations, CONTENT_IMPORT_JOB_D1_ENVELOPE_QUERIES)
    assert.equal(normal.r2Operations, 1 + Math.ceil(20_000 / IMPORT_DESCRIPTOR_FILES_PER_PAGE))
    assert.ok(normal.maximumPutBytes <= IMPORT_MAX_DESCRIPTOR_PAGE_BYTES)

    const leaseLost = await run('upload-20k-lease-lost', true)
    assert.equal(leaseLost.d1Operations, CONTENT_IMPORT_JOB_D1_ENVELOPE_QUERIES)
    assert.equal(leaseLost.r2Operations, 45)
    assert.ok(leaseLost.r2Operations <= CONTENT_IMPORT_MAX_R2_OPERATIONS_PER_ADVANCE)
    assert.equal(bucket.keys(`${leaseLost.packagePrefix}/descriptors/`).length, 0)
  })
})

test('bounds one 512-descriptor R2 object and its serialization memory peak', () => {
  // JSON may expand any UTF-16 code unit to a six-byte escape. The fixed-field
  // allowance covers property names, enum values, punctuation, index, and size.
  const maximumBoundedStringCodeUnits = 1_500 + 255 + 4_000 + 1_500 + 256
  const conservativePageBytes = 2 + IMPORT_DESCRIPTOR_FILES_PER_PAGE
    * (maximumBoundedStringCodeUnits * 6 + 512 + 1)
  assert.ok(conservativePageBytes <= IMPORT_MAX_DESCRIPTOR_PAGE_BYTES)

  const escaped = '\u0001'
  const descriptors: PersistedImportFile[] = Array.from(
    { length: IMPORT_DESCRIPTOR_FILES_PER_PAGE },
    (_, index) => {
      const suffix = `-${index}`
      return {
        index,
        path: `${escaped.repeat(1_500 - suffix.length)}${suffix}`,
        kind: 'asset',
        encoding: 'external',
        mediaType: escaped.repeat(255),
        url: `https://example.com/${'a'.repeat(4_000 - 'https://example.com/'.length)}`,
        sourceKey: escaped.repeat(1_500),
        checksum: escaped.repeat(256),
        size: Number.MAX_SAFE_INTEGER,
      }
    },
  )
  const memoryBefore = process.memoryUsage()
  const serialized = JSON.stringify(descriptors)
  const bytes = new TextEncoder().encode(serialized)
  const memoryAtPeak = process.memoryUsage()
  const measuredGrowth = (memoryAtPeak.heapUsed + memoryAtPeak.arrayBuffers)
    - (memoryBefore.heapUsed + memoryBefore.arrayBuffers)
  assert.ok(bytes.byteLength > 12 * 1024 * 1024)
  assert.ok(bytes.byteLength <= IMPORT_MAX_DESCRIPTOR_PAGE_BYTES)
  assert.ok(measuredGrowth < 64 * 1024 * 1024, `descriptor serialization grew ${Math.ceil(measuredGrowth / 1024 / 1024)} MiB`)
})

test('advances 421 GitHub text files end-to-end with cleanup and lease budgets below 50', async () => {
  const bucket = new CountingImportBucket()
  const { sqlite, d1 } = importAdvanceFixture()
  const id = 'github-421'
  const ownerId = 'github-owner'
  const packagePrefix = `${id}/package`
  const totalEntries = 421
  const contents = new Map<string, string>()
  const entries = []
  for (let index = 0; index < totalEntries; index += 1) {
    const content = `---\ntitle: Post ${index}\npubDate: 2026-08-30\n---\n\nBody ${index}`
    const sha = index.toString(16).padStart(40, '0')
    contents.set(sha, content)
    entries.push({
      path: `src/content/blog/post-${index}.md`,
      sha,
      size: new TextEncoder().encode(content).byteLength,
      kind: 'text' as const,
    })
  }
  insertImportAdvanceJob({
    sqlite,
    id,
    ownerId,
    packagePrefix,
    jobInput: {
      github: {
        repository: 'owner/repository',
        ref: 'main',
        commit: 'commit',
        entries,
      },
    },
    jobOutput: {
      phase: 'acquire', cursor: 0, total: totalEntries, plan: null,
      result: { created: 0, updated: 0, unchanged: 0, assets: 0 },
      repository: 'owner/repository',
      ref: 'main',
      header: {
        schemaVersion: CONTENT_BUNDLE_VERSION,
        generatedAt: '2026-08-30T00:00:00.000Z',
        source: { repository: 'owner/repository', ref: 'main', commit: 'commit' },
      },
    },
  })

  const originalFetch = globalThis.fetch
  let fetched = 0
  globalThis.fetch = async (request) => {
    const sha = String(request).split('/').at(-1)!
    const content = contents.get(sha)
    if (content === undefined) return new Response('missing', { status: 404 })
    fetched += 1
    return new Response(content, { status: 200 })
  }

  try {
    await withImportCloudflareContext(d1, bucket, async () => {
      let maximumD1 = 0
      let maximumR2 = 0
      let maximumAcquireR2 = 0
      let maximumMaterializeR2 = 0
      let advances = 0
      let lostMaterializationLease = false

      const persistedJob = () => {
        const row = sqlite.prepare('SELECT status, output_json FROM platform_jobs WHERE id=?').get(id) as {
          status: string
          output_json: string
        }
        return { status: row.status, phase: (JSON.parse(row.output_json) as { phase: string }).phase }
      }

      const advance = async () => {
        const phase = persistedJob().phase
        d1.resetOperations()
        bucket.resetOperations()
        const result = await advanceContentImportJob(id, ownerId)
        advances += 1
        maximumD1 = Math.max(maximumD1, d1.operations)
        maximumR2 = Math.max(maximumR2, bucket.operations)
        if (phase === 'acquire') maximumAcquireR2 = Math.max(maximumAcquireR2, bucket.operations)
        if (phase === 'legacy-materialize') maximumMaterializeR2 = Math.max(maximumMaterializeR2, bucket.operations)
        assert.ok(d1.operations < 50, `one ${phase} advance used ${d1.operations} D1 queries`)
        assert.ok(bucket.operations < 50, `one ${phase} advance used ${bucket.operations} R2 operations`)
        return result
      }

      // Force the first fenced release to lose its CAS. That invocation must
      // include cleanup in the measured budget, then an expired lease retries
      // from the durable cursor and completes the full 421-file import.
      d1.suppressNextRelease = true
      let result = await advance()
      assert.equal(result?.phase, 'acquire')
      sqlite.prepare('UPDATE platform_jobs SET updated_at=0 WHERE id=?').run(id)
      while (result?.phase !== 'legacy-plan') {
        const nextJob = persistedJob()
        const loseMaterializationLease = nextJob.phase === 'legacy-materialize' && !lostMaterializationLease
        if (loseMaterializationLease) {
          assert.equal(nextJob.status, 'waiting')
          d1.suppressNextRelease = true
        }
        result = await advance()
        if (loseMaterializationLease) {
          assert.equal(d1.suppressNextRelease, false)
          assert.equal(bucket.operations, 36)
          lostMaterializationLease = true
          sqlite.prepare('UPDATE platform_jobs SET updated_at=0 WHERE id=?').run(id)
        }
        assert.ok(advances < 100, 'GitHub acquisition/materialization did not converge')
      }

      const persisted = sqlite.prepare('SELECT input_json FROM platform_jobs WHERE id=?').get(id) as { input_json: string }
      const bundleKey = (JSON.parse(persisted.input_json) as { legacyBundleKey?: string }).legacyBundleKey
      assert.ok(bundleKey)
      const materialized = contentBundleSchema.parse(JSON.parse(bucket.peekText(bundleKey)))
      assert.equal(materialized.files.length, totalEntries)
      assert.equal(materialized.files[420].content?.endsWith('Body 420'), true)
      assert.equal(fetched, totalEntries)
      assert.equal(maximumD1, CONTENT_IMPORT_JOB_D1_ENVELOPE_QUERIES)
      assert.equal(maximumAcquireR2, 39)
      assert.equal(maximumMaterializeR2, 36)
      assert.equal(maximumR2, 39)
      assert.ok(maximumR2 <= CONTENT_IMPORT_MAX_R2_OPERATIONS_PER_ADVANCE)
      // Seven initial/post heads + multipart create/complete pairs, at most
      // fourteen 5 MiB parts under the 40 MiB aggregate, one descriptor PUT,
      // and three lease-loss cleanup operations.
      assert.ok(GITHUB_FILES_PER_PAGE * 4 + 14 + 1 + 3 <= CONTENT_IMPORT_MAX_R2_OPERATIONS_PER_ADVANCE)
      assert.ok(CONTENT_IMPORT_MAX_R2_OPERATIONS_PER_ADVANCE < 50)
    })
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('bounds terminal package cleanup to 40 R2 operations and resumes from durable deletes', async () => {
  const bucket = new CountingImportBucket()
  const { sqlite, d1 } = importAdvanceFixture()
  const id = 'terminal-cleanup-25k'
  const ownerId = 'terminal-owner'
  const packagePrefix = `${id}/package`
  insertImportAdvanceJob({
    sqlite,
    id,
    ownerId,
    packagePrefix,
    jobInput: {},
    jobOutput: {
      phase: 'cleanup', cursor: 0, total: 0, plan: null,
      result: { created: 0, updated: 0, unchanged: 0, assets: 0 },
    },
  })
  for (let index = 0; index < 25_000; index += 1) {
    bucket.seed(`${packagePrefix}/object-${String(index).padStart(5, '0')}`, '')
  }

  await withImportCloudflareContext(d1, bucket, async () => {
    d1.resetOperations()
    bucket.resetOperations()
    const first = await advanceContentImportJob(id, ownerId)
    assert.equal(first?.done, false)
    assert.equal(first?.phase, 'cleanup')
    assert.equal(d1.operations, 5)
    assert.ok(d1.operations <= CONTENT_IMPORT_MAX_D1_QUERIES_PER_ADVANCE)
    assert.equal(bucket.operations, 40)
    assert.ok(bucket.operations <= CONTENT_IMPORT_MAX_R2_OPERATIONS_PER_ADVANCE)
    assert.equal(bucket.keys(`${packagePrefix}/`).length, 5_000)

    d1.resetOperations()
    bucket.resetOperations()
    const second = await advanceContentImportJob(id, ownerId)
    assert.equal(second?.done, true)
    assert.equal(second?.phase, 'complete')
    assert.equal(d1.operations, 5)
    assert.ok(d1.operations <= CONTENT_IMPORT_MAX_D1_QUERIES_PER_ADVANCE)
    assert.equal(bucket.operations, 10)
    assert.equal(bucket.keys(`${packagePrefix}/`).length, 0)
  })
})

test('rejects base64 data after the first padded quartet across stream chunks', async () => {
  const bytes = ['YQ==', 'Yg=='].map((value) => new TextEncoder().encode(value))
  const decoded = decodeBase64Stream(new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of bytes) controller.enqueue(chunk)
      controller.close()
    },
  }))
  await assert.rejects(new Response(decoded).arrayBuffer(), /data follows base64 padding/)
})

test('rejects stale stage writes with the durable lease token', () => {
  const sqlite = new DatabaseSync(':memory:')
  try {
    sqlite.exec(readFileSync('lib/db/d1/0000_initial.sql', 'utf8'))
    sqlite.exec(readFileSync('lib/db/d1/migrations/0001_platform_foundation.sql', 'utf8'))
    sqlite.exec(readFileSync('lib/db/d1/migrations/0009_content_import_staging.sql', 'utf8'))
    sqlite.exec(`
      INSERT INTO platform_jobs
        (id,type,status,progress,attempts,max_attempts,input_json,output_json,created_at,updated_at)
      VALUES
        ('lease-job','content_import_v2','running',0,0,5,'{}','{"leaseToken":"worker-b"}',1000,1000)
    `)
    const record = {
      entityType: 'revision' as const,
      entityKey: 'revision-1',
      contentText: 'body',
      payload: { id: 'revision-1', resourceId: 'resource-1' },
    }
    const dialect = new SQLiteSyncDialect()
    const run = (leaseToken: string) => {
      const statements = buildContentImportStageStatements('lease-job', 0, [record], leaseToken)
      assert.ok(Math.max(...statements.map((statement) => dialect.sqlToQuery(statement).params.length))
        <= CONTENT_IMPORT_STAGE_MAX_BINDINGS_PER_STATEMENT)
      for (const statement of statements) {
        const query = dialect.sqlToQuery(statement)
        sqlite.prepare(query.sql).run(...query.params as never[])
      }
    }

    run('worker-a')
    assert.equal(sqlite.prepare('SELECT count(*) AS total FROM content_import_staging').get()?.total, 0)
    run('worker-b')
    const staged = sqlite.prepare(`
      SELECT entity_key AS entityKey,content_text AS contentText FROM content_import_staging
    `).get()
    assert.equal(staged?.entityKey, 'revision-1')
    assert.equal(staged?.contentText, 'body')

    sqlite.exec(`DELETE FROM content_import_staging; UPDATE platform_jobs SET status='completed' WHERE id='lease-job'`)
    run('worker-b')
    assert.equal(sqlite.prepare('SELECT count(*) AS total FROM content_import_staging').get()?.total, 0)
  } finally {
    sqlite.close()
  }
})

test('tombstones removed managed paths on the next GitHub export', async () => {
  const originalFetch = globalThis.fetch
  let treeEntries: Array<{ path: string; mode: string; type: string; sha: string | null }> = []
  globalThis.fetch = async (request, init) => {
    const url = String(request)
    if (url.includes('/git/ref/heads/')) return Response.json({ object: { sha: 'head-sha' } })
    if (url.includes('/contents/.joruno/export-index.json')) {
      const content = Buffer.from(JSON.stringify({
        files: ['src/content/blog/keep.md', 'src/content/blog/deleted.md', 'README.md'],
      })).toString('base64')
      return Response.json({ encoding: 'base64', content })
    }
    if (url.endsWith('/git/commits/head-sha')) return Response.json({ tree: { sha: 'base-tree' } })
    if (url.endsWith('/git/blobs')) return Response.json({ sha: `blob-${Math.random()}` })
    if (url.endsWith('/git/trees')) {
      const body = JSON.parse(String(init?.body)) as { tree?: typeof treeEntries }
      treeEntries = body.tree ?? []
      return Response.json({ sha: 'next-tree' })
    }
    if (url.endsWith('/git/commits')) return Response.json({ sha: 'next-commit', html_url: 'https://github.example/commit' })
    if (url.includes('/git/refs/heads/')) return Response.json({})
    return new Response('not found', { status: 404 })
  }
  try {
    const result = await writeContentBundleToGitHub({
      bundle: contentBundleSchema.parse({
        schemaVersion: CONTENT_BUNDLE_VERSION,
        generatedAt: '2026-08-30T00:00:00.000Z',
        source: { repository: null, ref: null, commit: null },
        files: [{
          path: 'src/content/blog/keep.md', kind: 'content', encoding: 'utf8',
          mediaType: 'text/markdown', content: '# Keep',
        }],
      }),
      repository: 'owner/repository', branch: 'main', token: 'TOKEN',
    })
    assert.equal(result.deletedFiles, 1)
    assert.deepEqual(treeEntries.filter((entry) => entry.sha === null), [{
      path: 'src/content/blog/deleted.md', mode: '100644', type: 'blob', sha: null,
    }])
    assert.equal(treeEntries.some((entry) => entry.path === 'README.md'), false)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('plans 400+ legacy identities with one batched D1 lookup contract', async () => {
  const files = Array.from({ length: 447 }, (_, index) => ({
    path: `src/content/blog/post-${index}.md`,
    kind: 'content' as const,
    encoding: 'utf8' as const,
    mediaType: 'text/markdown',
    content: `---\ntitle: Post ${index}\npubDate: 2026-08-30\n---\n\nBody`,
  }))
  let lookupCalls = 0
  let requestedEntries = 0
  const { plan, baselines } = await planLegacyAstroImport({
    schemaVersion: CONTENT_BUNDLE_VERSION,
    generatedAt: '2026-08-30T00:00:00.000Z',
    source: { repository: 'owner/repository', ref: 'main', commit: 'commit' },
    files,
  }, async (entries) => {
    lookupCalls += 1
    requestedEntries = entries.length
    return new Map(entries.slice(0, 200).map((entry) => [legacyIdentityKey(entry), {
      id: `existing:${entry.path}`,
      // Regression: persisting raw identities made platform_jobs.input_json
      // roughly 9 MB for the production-sized import.
      content: 'x'.repeat(45_000),
    }]))
  })

  assert.equal(lookupCalls, 1)
  assert.equal(requestedEntries, 447)
  assert.deepEqual(plan.resources, { total: 447, create: 247, update: 200 })
  assert.ok(new TextEncoder().encode(JSON.stringify(baselines)).byteLength < 250_000)
  assert.equal(JSON.stringify(baselines).includes('x'.repeat(1_000)), false)
})

test('uses one JSON binding per staging page and stable taxonomy IDs across pages', () => {
  assert.equal(CONTENT_IMPORT_STAGE_MAX_BINDINGS_PER_STATEMENT, 6)
  assert.ok(CONTENT_IMPORT_STAGE_RECORDS_PER_PAGE > 14)
  assert.equal(
    legacyTaxonomyId('job-1', 'tag', 'Cloudflare'),
    legacyTaxonomyId('job-1', 'tag', 'Cloudflare'),
  )
  assert.notEqual(
    legacyTaxonomyId('job-1', 'tag', 'Cloudflare'),
    legacyTaxonomyId('job-1', 'category', 'Cloudflare'),
  )
  const stagingSource = readFileSync('lib/content-transfer/import-staging.ts', 'utf8')
  assert.match(stagingSource, /FROM json_each\(\$\{JSON\.stringify\(rows\)\}\)/)
  assert.doesNotMatch(stagingSource, /db\.insert\(contentImportStaging\)\.values\(records/)
})

test('stores a highly escaped 1.8 MB revision outside the JSON staging payload', () => {
  const contentText = '\\"'.repeat(900_000)
  const size = contentImportStagePayloadBytes({
    entityType: 'revision',
    entityKey: 'large-revision',
    contentText,
    payload: {
      id: 'large-revision', resourceId: 'resource', version: 1, title: 'Large',
      slug: 'large', path: '/large', description: null, visibility: 'public',
      contentFormat: 'markdown', metadata: {}, sourceHash: null, changeSummary: null,
      createdAt: '2026-08-30T00:00:00.000Z',
    },
  })
  assert.equal(size.contentBytes, 1_800_000)
  assert.ok(size.jsonBytes < 2_000)
  assert.ok(new TextEncoder().encode(JSON.stringify(contentText)).byteLength > 3_000_000)
})

test('rejects a legacy revision at 1,800,001 UTF-8 bytes before staging', async () => {
  const oversized = 'a'.repeat(1_800_001)
  await assert.rejects(planLegacyAstroImport({
    schemaVersion: CONTENT_BUNDLE_VERSION,
    generatedAt: '2026-08-30T00:00:00.000Z',
    source: { repository: 'owner/repository', ref: 'main', commit: 'commit' },
    files: [{
      path: 'src/content/blog/oversized.md', kind: 'content', encoding: 'utf8',
      mediaType: 'text/markdown', content: `---\ntitle: Oversized\n---\n\n${oversized}`,
    }],
  }, async () => new Map()), /below 1\.8 MB/)
})

test('fingerprints revision metadata so title and taxonomy-only Studio edits conflict', async () => {
  const original = {
    type: 'article', title: 'Original', slug: 'same', path: '/blog/same', description: null,
    visibility: 'public', content: 'unchanged body', contentFormat: 'markdown',
    metadata: { categoryId: 'category-a', tagIds: ['tag-a'], toc: true },
  }
  const sourceHash = await legacyImportFingerprint(original)
  assert.notEqual(await legacyImportFingerprint({ ...original, title: 'Edited in Studio' }), sourceHash)
  assert.notEqual(await legacyImportFingerprint({
    ...original,
    metadata: { ...original.metadata, categoryId: 'category-b' },
  }), sourceHash)
  assert.notEqual(await legacyImportFingerprint({
    ...original,
    metadata: { ...original.metadata, toc: false },
  }), sourceHash)
  assert.equal(
    await legacySourceFingerprint({ ...original, metadata: { ...original.metadata, commit: 'commit-a' } }),
    await legacySourceFingerprint({ ...original, metadata: { ...original.metadata, commit: 'commit-b' } }),
  )
})

test('normalizes publication fingerprints to D1 seconds and detects schedule/unpublish edits', async () => {
  const sourceFingerprint = 'source-fingerprint'
  const first = await legacyImportStateFingerprint({
    sourceFingerprint,
    status: 'published',
    publishedRevisionId: 'revision-1',
    publishedAt: '2026-08-30T00:00:00.987Z',
    scheduledAt: null,
  })
  const roundTripped = await legacyImportStateFingerprint({
    sourceFingerprint,
    status: 'published',
    publishedRevisionId: 'revision-1',
    publishedAt: Math.floor(new Date('2026-08-30T00:00:00.987Z').valueOf() / 1_000),
    scheduledAt: null,
  })
  assert.equal(first, roundTripped)
  assert.notEqual(first, await legacyImportStateFingerprint({
    sourceFingerprint,
    status: 'scheduled',
    publishedRevisionId: 'revision-1',
    publishedAt: '2026-08-30T00:00:00.000Z',
    scheduledAt: '2026-09-01T00:00:00.000Z',
  }))

  const current = {
    type: 'project', title: 'Project', slug: 'project', path: '/projects/project', description: 'Description',
    visibility: 'public', content: '', contentFormat: 'json', metadata: { externalUrl: 'https://example.com' },
  }
  const importSourceHash = await legacyImportFingerprint(current)
  const importStateHash = await legacyImportStateFingerprint({
    sourceFingerprint: importSourceHash,
    status: 'published',
    publishedRevisionId: 'revision-1',
    publishedAt: 1_788_048_000,
    scheduledAt: null,
  })
  const planned = await planLegacyAstroImport({
    schemaVersion: CONTENT_BUNDLE_VERSION,
    generatedAt: '2026-08-30T00:00:00.000Z',
    source: { repository: 'owner/repository', ref: 'main', commit: 'commit' },
    files: [{
      path: 'src/content/projects/data.json', kind: 'data', encoding: 'utf8', mediaType: 'application/json',
      content: JSON.stringify([{ id: 'project', link: 'https://example.com', desc: 'Description', icon: '', category: 'tools' }]),
    }],
  }, async (entries) => new Map([[legacyIdentityKey(entries[0]), {
    id: 'project-1', currentRevisionId: 'revision-1', publishedRevisionId: null,
    sourceHash: null, status: 'draft', publishedAt: null, scheduledAt: null, updatedAt: 1_788_048_000,
    title: current.title, slug: current.slug, path: current.path, description: current.description,
    visibility: current.visibility, content: current.content, contentFormat: current.contentFormat,
    metadataJson: JSON.stringify({
      ...current.metadata,
      importRevisionId: 'revision-1', importSourceHash, importStateHash,
    }),
  }]]))
  assert.ok(planned.plan.conflicts.some((message) => message.includes('changed in Studio')))
})

test('requires explicit adoption for an unmarked legacy resource instead of trusting body hash alone', async () => {
  const planned = await planLegacyAstroImport({
    schemaVersion: CONTENT_BUNDLE_VERSION,
    generatedAt: '2026-08-30T00:00:00.000Z',
    source: { repository: 'owner/repository', ref: 'main', commit: 'commit' },
    files: [{
      path: 'src/content/blog/post.md', kind: 'content', encoding: 'utf8', mediaType: 'text/markdown',
      content: '---\ntitle: Post\n---\n\nSame body',
    }],
  }, async (entries) => new Map([[legacyIdentityKey(entries[0]), {
    id: 'resource-1', currentRevisionId: 'revision-1', publishedRevisionId: 'revision-1',
    sourceHash: createHash('sha256').update('Same body').digest('hex'),
    metadataJson: JSON.stringify({ sourceType: 'git', repository: 'owner/repository', commit: 'commit' }),
    status: 'published', publishedAt: 1_788_048_000, scheduledAt: null, updatedAt: 1_788_048_000,
    title: 'Studio title', slug: 'post', path: '/blog/post', description: null,
    visibility: 'public', content: 'Same body', contentFormat: 'markdown',
  }]]))
  assert.equal(planned.plan.conflicts.length, 1)
})

test('imports the same legacy bundle twice without adding revisions, events, or assets', async () => {
  const sqlite = new DatabaseSync(':memory:')
  try {
    sqlite.exec(readFileSync('lib/db/d1/0000_initial.sql', 'utf8'))
    sqlite.exec(readFileSync('lib/db/d1/migrations/0001_platform_foundation.sql', 'utf8'))
    sqlite.exec(readFileSync('lib/db/d1/migrations/0009_content_import_staging.sql', 'utf8'))

    const bundle = {
      schemaVersion: CONTENT_BUNDLE_VERSION,
      generatedAt: '2026-08-30T00:00:00.000Z',
      source: { repository: 'owner/repository', ref: 'main', commit: 'commit-a' },
      files: [{
        path: 'public/img/post.webp', kind: 'asset' as const, encoding: 'external' as const,
        mediaType: 'image/webp', url: 'https://assets.example/imported/post.webp',
        sourceKey: 'imported-assets/source-sha/img/post.webp', checksum: 'source-sha', size: 123,
      }, {
        path: 'src/content/blog/post.md', kind: 'content' as const, encoding: 'utf8' as const,
        mediaType: 'text/markdown',
        content: '---\ntitle: Post\npubDate: 2026-08-29\n---\n\n![Cover](/img/post.webp)\n\nBody',
      }],
    }
    const first = await planLegacyAstroImport(bundle, async () => new Map())
    assert.deepEqual(first.plan.conflicts, [])

    const insertJob = sqlite.prepare(`
      INSERT INTO platform_jobs (id,type,status,progress,attempts,max_attempts,input_json,created_at,updated_at)
      VALUES (?,'content_import_v2','pending',0,0,5,'{}',1000,1000)
    `)
    const insertStage = sqlite.prepare(`
      INSERT INTO content_import_staging
        (job_id,entity_type,entity_key,ordinal,payload_json,content_text,baseline_revision_id,created_at)
      VALUES (?,?,?,?,?,?,?,1000)
      ON CONFLICT(job_id,entity_type,entity_key) DO UPDATE SET
        ordinal=excluded.ordinal,payload_json=excluded.payload_json,
        content_text=excluded.content_text,baseline_revision_id=excluded.baseline_revision_id
    `)
    const stageAll = async (
      jobId: string,
      input: typeof bundle,
      baselines: Record<string, string | null>,
    ) => {
      let cursor = 0
      let result = { created: 0, updated: 0, unchanged: 0, assets: 0 }
      while (true) {
        const page = await buildLegacyAstroImportStagePage(input, jobId, null, cursor, baselines)
        for (const [index, record] of page.records.entries()) {
          insertStage.run(
            jobId, record.entityType, record.entityKey, page.ordinal + index,
            JSON.stringify(record.payload), record.contentText ?? null,
            record.baselineRevisionId ?? null,
          )
        }
        result = {
          created: result.created + page.result.created,
          updated: result.updated + page.result.updated,
          unchanged: result.unchanged + page.result.unchanged,
          assets: result.assets + page.result.assets,
        }
        cursor = page.cursor
        if (page.done) return result
      }
    }
    const cutOver = (jobId: string) => {
      const dialect = new SQLiteSyncDialect()
      sqlite.exec('BEGIN;')
      for (const statement of buildContentImportCutoverStatements(jobId)) {
        const query = dialect.sqlToQuery(statement as never)
        sqlite.prepare(query.sql).run(...query.params as never[])
      }
      sqlite.exec('COMMIT;')
    }

    insertJob.run('legacy-first')
    assert.deepEqual(await stageAll('legacy-first', bundle, first.baselines), {
      created: 1, updated: 0, unchanged: 0, assets: 1,
    })
    cutOver('legacy-first')

    const identity = sqlite.prepare(`
      SELECT r.id, r.current_revision_id AS currentRevisionId,
        r.published_revision_id AS publishedRevisionId, revision.source_hash AS sourceHash,
        revision.metadata_json AS metadataJson, r.status, r.published_at AS publishedAt,
        r.scheduled_at AS scheduledAt, r.updated_at AS updatedAt,
        revision.title, revision.slug, revision.path, revision.description,
        revision.visibility, revision.content, revision.content_format AS contentFormat
      FROM resources r JOIN resource_revisions revision ON revision.id=r.current_revision_id
      WHERE r.path='/blog/post'
    `).get() as Record<string, unknown>
    const secondBundle = {
      ...bundle,
      generatedAt: '2026-08-30T00:05:00.000Z',
      source: { ...bundle.source, commit: 'commit-b' },
    }
    const second = await planLegacyAstroImport(secondBundle, async (requested) => new Map([[
      legacyIdentityKey(requested[0]), identity as never,
    ]]))
    assert.deepEqual(second.plan.conflicts, [])
    second.baselines['legacy-asset:asset:git:owner/repository:public/img/post.webp'] = JSON.stringify({
      key: 'imported-assets/source-sha/img/post.webp',
      url: 'https://assets.example/imported/post.webp',
      updatedAt: 1_788_048_000,
    })

    insertJob.run('legacy-second')
    assert.deepEqual(await stageAll('legacy-second', secondBundle, second.baselines), {
      created: 0, updated: 0, unchanged: 2, assets: 0,
    })
    cutOver('legacy-second')

    assert.equal(sqlite.prepare('SELECT count(*) AS total FROM resources').get()?.total, 1)
    assert.equal(sqlite.prepare('SELECT count(*) AS total FROM resource_revisions').get()?.total, 1)
    assert.equal(sqlite.prepare('SELECT count(*) AS total FROM publication_events').get()?.total, 1)
    assert.equal(sqlite.prepare('SELECT count(*) AS total FROM assets').get()?.total, 1)
    assert.equal(sqlite.prepare('SELECT count(*) AS total FROM content_import_commits').get()?.total, 2)
  } finally {
    sqlite.close()
  }
})

test('compiles the atomic D1 cut-over below statement and binding ceilings', () => {
  const dialect = new SQLiteSyncDialect()
  const queries = buildContentImportCutoverStatements('job-400-scale')
    .map((statement) => dialect.sqlToQuery(statement as never))
  assert.equal(queries.length, CONTENT_IMPORT_CUTOVER_STATEMENTS)
  assert.ok(queries.length < 50)
  assert.ok(Math.max(...queries.map((query) => query.params.length)) < 100)
  assert.match(queries[0].sql, /NOT EXISTS/)
  assert.match(queries[0].sql, /baseline_revision_id/)
  assert.match(queries[0].sql, /LEFT JOIN categories/)
  assert.match(queries[0].sql, /LEFT JOIN assets/)
  assert.match(queries[0].sql, /LEFT JOIN settings/)
  for (const query of queries.slice(1)) assert.match(query.sql, /content_import_commits/)
})

test('atomically cancels the whole cut-over when category, asset, or setting changes after staging', () => {
  const sqlite = new DatabaseSync(':memory:')
  try {
    sqlite.exec(readFileSync('lib/db/d1/0000_initial.sql', 'utf8'))
    sqlite.exec(readFileSync('lib/db/d1/migrations/0001_platform_foundation.sql', 'utf8'))
    sqlite.exec(readFileSync('lib/db/d1/migrations/0009_content_import_staging.sql', 'utf8'))
    sqlite.exec(`
      INSERT INTO platform_jobs (id,type,status,progress,attempts,max_attempts,input_json,created_at,updated_at)
      VALUES ('cas-job','content_import_v2','pending',0,0,5,'{}',1000,1000);
      INSERT INTO categories (id,name,slug,description,parent_id,"order",created_at)
      VALUES ('category-1','Before','before',NULL,NULL,0,1000);
      INSERT INTO assets (id,key,url,name,media_type,mime_type,size,metadata_json,created_at,updated_at)
      VALUES ('asset-1','asset-key','https://old.example/a','Asset','image','image/png',1,'{}',1000,1000);
      INSERT INTO settings (id,key,value,created_at,updated_at)
      VALUES ('setting-1','site.title','Before',1000,1000);
    `)
    const stage = sqlite.prepare(`
      INSERT INTO content_import_staging
        (job_id,entity_type,entity_key,ordinal,payload_json,content_text,baseline_revision_id,created_at)
      VALUES ('cas-job',?,?,?,?,NULL,?,1000)
    `)
    stage.run('category', 'category-1', 0, JSON.stringify({
      id: 'category-1', name: 'Imported', slug: 'imported', description: null,
      parentId: null, order: 0, createdAt: '2026-08-30T00:00:00.000Z',
    }), JSON.stringify({ name: 'Before', slug: 'before', description: null, parentId: null, order: 0 }))
    stage.run('asset', 'asset-1', 1, JSON.stringify({
      id: 'asset-1', key: 'asset-key', url: 'https://import.example/a', name: 'Asset', mediaType: 'image',
      mimeType: 'image/png', size: 1, width: null, height: null, durationSeconds: null, checksum: null,
      metadata: {}, createdAt: '2026-08-30T00:00:00.000Z', updatedAt: '2026-08-30T00:00:00.000Z',
    }), JSON.stringify({ key: 'asset-key', url: 'https://old.example/a', updatedAt: 1000 }))
    stage.run('setting', 'setting-1', 2, JSON.stringify({
      id: 'setting-1', key: 'site.title', value: 'Imported',
      createdAt: '2026-08-30T00:00:00.000Z', updatedAt: '2026-08-30T00:00:00.000Z',
    }), JSON.stringify({ key: 'site.title', value: 'Before', updatedAt: 1000 }))
    stage.run('resource', 'new-resource', 3, JSON.stringify({
      id: 'new-resource', type: 'document', title: 'Must not appear', slug: 'must-not-appear',
      path: '/docs/must-not-appear', description: null, status: 'draft', visibility: 'public',
      coverAssetId: null, currentRevisionId: 'new-revision', publishedRevisionId: null,
      publishedAt: null, scheduledAt: null, createdAt: '2026-08-30T00:00:00.000Z', updatedAt: '2026-08-30T00:00:00.000Z',
    }), null)

    // Simulate independent Studio writes after the job froze its baselines.
    sqlite.exec(`
      UPDATE categories SET name='Studio edit' WHERE id='category-1';
      UPDATE assets SET url='https://studio.example/a', updated_at=2000 WHERE id='asset-1';
      UPDATE settings SET value='Studio edit', updated_at=2000 WHERE id='setting-1';
      BEGIN;
    `)
    const dialect = new SQLiteSyncDialect()
    for (const statement of buildContentImportCutoverStatements('cas-job')) {
      const query = dialect.sqlToQuery(statement as never)
      sqlite.prepare(query.sql).run(...query.params as never[])
    }
    sqlite.exec('COMMIT;')

    assert.equal(sqlite.prepare(`SELECT count(*) AS total FROM content_import_commits WHERE job_id='cas-job'`).get()?.total, 0)
    assert.equal(sqlite.prepare(`SELECT count(*) AS total FROM resources WHERE id='new-resource'`).get()?.total, 0)
    assert.equal(sqlite.prepare(`SELECT name FROM categories WHERE id='category-1'`).get()?.name, 'Studio edit')
    assert.equal(sqlite.prepare(`SELECT url FROM assets WHERE id='asset-1'`).get()?.url, 'https://studio.example/a')
    assert.equal(sqlite.prepare(`SELECT value FROM settings WHERE id='setting-1'`).get()?.value, 'Studio edit')
  } finally {
    sqlite.close()
  }
})

test('atomically rejects an imported revision id owned by another resource', () => {
  const sqlite = new DatabaseSync(':memory:')
  try {
    sqlite.exec(readFileSync('lib/db/d1/0000_initial.sql', 'utf8'))
    sqlite.exec(readFileSync('lib/db/d1/migrations/0001_platform_foundation.sql', 'utf8'))
    sqlite.exec(readFileSync('lib/db/d1/migrations/0009_content_import_staging.sql', 'utf8'))
    sqlite.exec(`
      INSERT INTO platform_jobs (id,type,status,progress,attempts,max_attempts,input_json,created_at,updated_at)
      VALUES ('revision-owner-job','content_import_v3','pending',0,0,5,'{}',1000,1000);
      INSERT INTO resources
        (id,type,title,slug,path,status,visibility,current_revision_id,published_revision_id,created_at,updated_at)
      VALUES ('resource-b','document','B','b','/docs/b','published','public',NULL,NULL,1000,1000);
      INSERT INTO resource_revisions
        (id,resource_id,version,title,slug,path,visibility,content,content_format,metadata_json,created_at)
      VALUES ('shared-revision','resource-b',1,'Shared','shared','/docs/shared','public','Original','markdown','{}',1000);
      UPDATE resources SET current_revision_id='shared-revision',published_revision_id='shared-revision'
      WHERE id='resource-b';
    `)
    const stage = sqlite.prepare(`
      INSERT INTO content_import_staging
        (job_id,entity_type,entity_key,ordinal,payload_json,content_text,baseline_revision_id,created_at)
      VALUES ('revision-owner-job',?,?,?,?,?,?,1000)
    `)
    stage.run('resource', 'resource-a', 0, JSON.stringify({
      id: 'resource-a', type: 'document', title: 'A', slug: 'a', path: '/docs/a', description: null,
      status: 'draft', visibility: 'public', coverAssetId: null, currentRevisionId: 'shared-revision',
      publishedRevisionId: null, publishedAt: null, scheduledAt: null,
      createdAt: '1970-01-01T00:16:40.000Z', updatedAt: '1970-01-01T00:16:40.000Z',
    }), null, null)
    stage.run('revision', 'shared-revision', 1, JSON.stringify({
      id: 'shared-revision', resourceId: 'resource-a', version: 1, title: 'Shared', slug: 'shared',
      path: '/docs/shared', description: null, visibility: 'public', contentFormat: 'markdown',
      metadata: {}, sourceHash: null, changeSummary: null, createdAt: '1970-01-01T00:16:40.000Z',
    }), 'Original', JSON.stringify({ resourceId: 'resource-b' }))

    sqlite.exec('BEGIN;')
    const dialect = new SQLiteSyncDialect()
    for (const statement of buildContentImportCutoverStatements('revision-owner-job')) {
      const query = dialect.sqlToQuery(statement as never)
      sqlite.prepare(query.sql).run(...query.params as never[])
    }
    sqlite.exec('COMMIT;')

    assert.equal(sqlite.prepare(`SELECT count(*) AS total FROM content_import_commits WHERE job_id='revision-owner-job'`).get()?.total, 0)
    assert.equal(sqlite.prepare(`SELECT count(*) AS total FROM resources WHERE id='resource-a'`).get()?.total, 0)
    const revision = sqlite.prepare(`SELECT resource_id AS resourceId,content FROM resource_revisions WHERE id='shared-revision'`).get()
    assert.equal(revision?.resourceId, 'resource-b')
    assert.equal(revision?.content, 'Original')
  } finally {
    sqlite.close()
  }
})

test('atomically rejects a publication-event id with a different payload', () => {
  const sqlite = new DatabaseSync(':memory:')
  try {
    sqlite.exec(readFileSync('lib/db/d1/0000_initial.sql', 'utf8'))
    sqlite.exec(readFileSync('lib/db/d1/migrations/0001_platform_foundation.sql', 'utf8'))
    sqlite.exec(readFileSync('lib/db/d1/migrations/0009_content_import_staging.sql', 'utf8'))
    sqlite.exec(`
      INSERT INTO platform_jobs (id,type,status,progress,attempts,max_attempts,input_json,created_at,updated_at)
      VALUES ('event-owner-job','content_import_v3','pending',0,0,5,'{}',1000,1000);
      INSERT INTO resources (id,type,title,slug,path,status,visibility,created_at,updated_at)
      VALUES ('resource-b','document','B','b','/docs/b','published','public',1000,1000);
      INSERT INTO publication_events (id,resource_id,revision_id,event_type,data_json,created_at)
      VALUES ('shared-event','resource-b',NULL,'created','{}',1000);
    `)
    const stage = sqlite.prepare(`
      INSERT INTO content_import_staging
        (job_id,entity_type,entity_key,ordinal,payload_json,content_text,baseline_revision_id,created_at)
      VALUES ('event-owner-job',?,?,?,?,NULL,?,1000)
    `)
    stage.run('resource', 'resource-a', 0, JSON.stringify({
      id: 'resource-a', type: 'document', title: 'A', slug: 'a', path: '/docs/a', description: null,
      status: 'draft', visibility: 'public', coverAssetId: null, currentRevisionId: null,
      publishedRevisionId: null, publishedAt: null, scheduledAt: null,
      createdAt: '1970-01-01T00:16:40.000Z', updatedAt: '1970-01-01T00:16:40.000Z',
    }), null)
    stage.run('publication-event', 'shared-event', 1, JSON.stringify({
      id: 'shared-event', resourceId: 'resource-a', revisionId: null,
      eventType: 'created', data: {}, createdAt: '1970-01-01T00:16:40.000Z',
    }), JSON.stringify({
      resourceId: 'resource-b', revisionId: null, eventType: 'created', dataJson: '{}', createdAt: 1000,
    }))

    sqlite.exec('BEGIN;')
    const dialect = new SQLiteSyncDialect()
    for (const statement of buildContentImportCutoverStatements('event-owner-job')) {
      const query = dialect.sqlToQuery(statement as never)
      sqlite.prepare(query.sql).run(...query.params as never[])
    }
    sqlite.exec('COMMIT;')

    assert.equal(sqlite.prepare(`SELECT count(*) AS total FROM content_import_commits WHERE job_id='event-owner-job'`).get()?.total, 0)
    assert.equal(sqlite.prepare(`SELECT count(*) AS total FROM resources WHERE id='resource-a'`).get()?.total, 0)
    const event = sqlite.prepare(`SELECT resource_id AS resourceId,data_json AS dataJson FROM publication_events WHERE id='shared-event'`).get()
    assert.equal(event?.resourceId, 'resource-b')
    assert.equal(event?.dataJson, '{}')
  } finally {
    sqlite.close()
  }
})

test('cut-over preserves snapshot authors, creators, actors, and redirect timestamps exactly', () => {
  const sqlite = new DatabaseSync(':memory:')
  try {
    sqlite.exec(readFileSync('lib/db/d1/0000_initial.sql', 'utf8'))
    sqlite.exec(readFileSync('lib/db/d1/migrations/0001_platform_foundation.sql', 'utf8'))
    sqlite.exec(readFileSync('lib/db/d1/migrations/0009_content_import_staging.sql', 'utf8'))
    sqlite.exec(`
      INSERT INTO user (id,email,name,role,created_at,updated_at)
      VALUES ('user-1','owner@example.test','Owner','admin',1000,1000);
      INSERT INTO platform_jobs (id,type,status,progress,attempts,max_attempts,input_json,created_at,updated_at)
      VALUES ('ownership-job','content_import_v3','pending',0,0,5,'{}',1000,1000);
    `)
    const importedAt = '2026-08-30T00:00:00.000Z'
    const redirectCreatedAt = '2024-02-03T04:05:06.000Z'
    const records = [{
      entityType: 'resource' as const,
      entityKey: 'resource-1',
      payload: {
        id: 'resource-1', type: 'document', title: 'Owned', slug: 'owned', path: '/docs/owned',
        description: null, status: 'draft', visibility: 'public', coverAssetId: null,
        currentRevisionId: 'revision-1', publishedRevisionId: null, publishedAt: null, scheduledAt: null,
        authorId: 'user-1', createdAt: importedAt, updatedAt: importedAt,
      },
      baselineRevisionId: null,
    }, {
      entityType: 'revision' as const,
      entityKey: 'revision-1',
      payload: {
        id: 'revision-1', resourceId: 'resource-1', version: 1, title: 'Owned', slug: 'owned',
        path: '/docs/owned', description: null, visibility: 'public', contentFormat: 'markdown',
        metadata: {}, sourceHash: null, changeSummary: null, createdBy: 'user-1', createdAt: importedAt,
      },
      contentText: 'Owned content',
      baselineRevisionId: null,
    }, {
      entityType: 'redirect' as const,
      entityKey: '/old-owned',
      payload: { fromPath: '/old-owned', toPath: '/docs/owned', statusCode: 308, createdAt: redirectCreatedAt },
      baselineRevisionId: null,
    }, {
      entityType: 'publication-event' as const,
      entityKey: 'event-1',
      payload: {
        id: 'event-1', resourceId: 'resource-1', revisionId: 'revision-1', eventType: 'created',
        actorId: 'user-1', data: { source: 'snapshot' }, createdAt: importedAt,
      },
      baselineRevisionId: null,
    }]
    const dialect = new SQLiteSyncDialect()
    for (const statement of buildContentImportStageStatements('ownership-job', 0, records)) {
      const query = dialect.sqlToQuery(statement as never)
      sqlite.prepare(query.sql).run(...query.params as never[])
    }
    sqlite.exec('BEGIN;')
    for (const statement of buildContentImportCutoverStatements('ownership-job')) {
      const query = dialect.sqlToQuery(statement as never)
      sqlite.prepare(query.sql).run(...query.params as never[])
    }
    sqlite.exec('COMMIT;')

    assert.equal(sqlite.prepare(`SELECT author_id AS authorId FROM resources WHERE id='resource-1'`).get()?.authorId, 'user-1')
    assert.equal(sqlite.prepare(`SELECT created_by AS createdBy FROM resource_revisions WHERE id='revision-1'`).get()?.createdBy, 'user-1')
    assert.equal(sqlite.prepare(`SELECT actor_id AS actorId FROM publication_events WHERE id='event-1'`).get()?.actorId, 'user-1')
    assert.equal(
      sqlite.prepare(`SELECT created_at AS createdAt FROM redirects WHERE from_path='/old-owned'`).get()?.createdAt,
      Math.floor(new Date(redirectCreatedAt).valueOf() / 1_000),
    )
  } finally {
    sqlite.close()
  }
})

test('snapshot cut-over rejects every existing-row createdAt mismatch instead of silently retaining it', () => {
  const sqlite = new DatabaseSync(':memory:')
  try {
    sqlite.exec(readFileSync('lib/db/d1/0000_initial.sql', 'utf8'))
    sqlite.exec(readFileSync('lib/db/d1/migrations/0001_platform_foundation.sql', 'utf8'))
    sqlite.exec(readFileSync('lib/db/d1/migrations/0009_content_import_staging.sql', 'utf8'))
    sqlite.exec(`
      INSERT INTO resources
        (id,type,title,slug,path,description,status,visibility,current_revision_id,published_revision_id,
         published_at,scheduled_at,created_at,updated_at)
      VALUES ('resource-1','document','Same','same','/docs/same',NULL,'published','public',NULL,NULL,
              NULL,NULL,1000,1000);
      INSERT INTO resource_revisions
        (id,resource_id,version,title,slug,path,description,visibility,content,content_format,
         metadata_json,source_hash,change_summary,created_by,created_at)
      VALUES ('revision-1','resource-1',1,'Same','same','/docs/same',NULL,'public','Same','markdown',
              '{}',NULL,NULL,NULL,1000);
      UPDATE resources SET current_revision_id='revision-1',published_revision_id='revision-1'
      WHERE id='resource-1';
      INSERT INTO categories (id,name,slug,description,parent_id,"order",created_at)
      VALUES ('category-1','Same','same',NULL,NULL,0,1000);
      INSERT INTO tags (id,name,slug,created_at) VALUES ('tag-1','Same','same',1000);
      INSERT INTO assets
        (id,key,url,name,media_type,mime_type,size,width,height,duration_seconds,checksum,metadata_json,created_at,updated_at)
      VALUES ('asset-1','same','https://example.test/same','Same','image','image/png',1,NULL,NULL,NULL,NULL,'{}',1000,1000);
      INSERT INTO resource_routes (path,resource_id,canonical,created_at)
      VALUES ('/docs/same','resource-1',1,1000);
      INSERT INTO settings (id,key,value,created_at,updated_at)
      VALUES ('setting-1','same','same',1000,1000);
    `)
    const liveAt = new Date(1_000 * 1_000).toISOString()
    const incomingAt = new Date(2_000 * 1_000).toISOString()
    const cases: Array<{ name: string; record: ImportStageRecord }> = [{
      name: 'resource',
      record: {
        entityType: 'resource', entityKey: 'resource-1', baselineRevisionId: JSON.stringify({
          type: 'document', title: 'Same', slug: 'same', path: '/docs/same', description: null,
          status: 'published', visibility: 'public', coverAssetId: null, currentRevisionId: 'revision-1',
          publishedRevisionId: 'revision-1', publishedAt: null, scheduledAt: null,
          authorId: null, createdAt: 1000, updatedAt: 1000,
        }),
        payload: {
          id: 'resource-1', type: 'document', title: 'Same', slug: 'same', path: '/docs/same', description: null,
          status: 'published', visibility: 'public', coverAssetId: null, currentRevisionId: 'revision-1',
          publishedRevisionId: 'revision-1', publishedAt: null, scheduledAt: null,
          authorId: null, createdAt: incomingAt, updatedAt: liveAt,
        },
      },
    }, {
      name: 'revision',
      record: {
        entityType: 'revision', entityKey: 'revision-1', contentText: 'Same',
        baselineRevisionId: JSON.stringify({ resourceId: 'resource-1', createdBy: null }),
        payload: {
          id: 'revision-1', resourceId: 'resource-1', version: 1, title: 'Same', slug: 'same',
          path: '/docs/same', description: null, visibility: 'public', contentFormat: 'markdown',
          metadata: {}, sourceHash: null, changeSummary: null, createdBy: null, createdAt: incomingAt,
        },
      },
    }, {
      name: 'category',
      record: {
        entityType: 'category', entityKey: 'category-1',
        baselineRevisionId: JSON.stringify({
          name: 'Same', slug: 'same', description: null, parentId: null, order: 0, createdAt: 1000,
        }),
        payload: {
          id: 'category-1', name: 'Same', slug: 'same', description: null,
          parentId: null, order: 0, createdAt: incomingAt,
        },
      },
    }, {
      name: 'tag',
      record: {
        entityType: 'tag', entityKey: 'tag-1',
        baselineRevisionId: JSON.stringify({ name: 'Same', slug: 'same', createdAt: 1000 }),
        payload: { id: 'tag-1', name: 'Same', slug: 'same', createdAt: incomingAt },
      },
    }, {
      name: 'asset',
      record: {
        entityType: 'asset', entityKey: 'asset-1', baselineRevisionId: JSON.stringify({
          key: 'same', url: 'https://example.test/same', name: 'Same', mediaType: 'image',
          mimeType: 'image/png', size: 1, width: null, height: null, durationSeconds: null,
          checksum: null, metadataJson: '{}', createdAt: 1000, updatedAt: 1000,
        }),
        payload: {
          id: 'asset-1', key: 'same', url: 'https://example.test/same', name: 'Same', mediaType: 'image',
          mimeType: 'image/png', size: 1, width: null, height: null, durationSeconds: null,
          checksum: null, metadata: {}, createdAt: incomingAt, updatedAt: liveAt,
        },
      },
    }, {
      name: 'route',
      record: {
        entityType: 'route', entityKey: '/docs/same',
        baselineRevisionId: JSON.stringify({ resourceId: 'resource-1', canonical: 1, createdAt: 1000 }),
        payload: { path: '/docs/same', resourceId: 'resource-1', canonical: true, createdAt: incomingAt },
      },
    }, {
      name: 'setting',
      record: {
        entityType: 'setting', entityKey: 'setting-1',
        baselineRevisionId: JSON.stringify({ key: 'same', value: 'same', createdAt: 1000, updatedAt: 1000 }),
        payload: { id: 'setting-1', key: 'same', value: 'same', createdAt: incomingAt, updatedAt: liveAt },
      },
    }]
    const dialect = new SQLiteSyncDialect()
    for (const [index, entry] of cases.entries()) {
      const jobId = `timestamp-job-${index}`
      sqlite.prepare(`
        INSERT INTO platform_jobs (id,type,status,progress,attempts,max_attempts,input_json,created_at,updated_at)
        VALUES (?,'content_import_v3','pending',0,0,5,'{}',1000,1000)
      `).run(jobId)
      for (const statement of buildContentImportStageStatements(jobId, 0, [entry.record])) {
        const query = dialect.sqlToQuery(statement as never)
        sqlite.prepare(query.sql).run(...query.params as never[])
      }
      sqlite.exec('BEGIN;')
      for (const statement of buildContentImportCutoverStatements(jobId)) {
        const query = dialect.sqlToQuery(statement as never)
        sqlite.prepare(query.sql).run(...query.params as never[])
      }
      sqlite.exec('COMMIT;')
      assert.equal(
        sqlite.prepare('SELECT count(*) AS total FROM content_import_commits WHERE job_id=?').get(jobId)?.total,
        0,
        `${entry.name} createdAt mismatch must cancel cut-over`,
      )
    }
  } finally {
    sqlite.close()
  }
})

test('legacy cut-over preserves Studio-owned links/cover/routes and stores Drizzle timestamps as seconds', async () => {
  const sqlite = new DatabaseSync(':memory:')
  try {
    sqlite.exec(readFileSync('lib/db/d1/0000_initial.sql', 'utf8'))
    sqlite.exec(readFileSync('lib/db/d1/migrations/0001_platform_foundation.sql', 'utf8'))
    sqlite.exec(readFileSync('lib/db/d1/migrations/0009_content_import_staging.sql', 'utf8'))
    sqlite.exec(`
      INSERT INTO platform_jobs (id,type,status,progress,attempts,max_attempts,input_json,created_at,updated_at)
      VALUES ('legacy-job','content_import_v2','pending',0,0,5,'{}',1000,1000);
      INSERT INTO assets (id,key,url,name,media_type,mime_type,size,metadata_json,created_at,updated_at)
      VALUES ('cover-1','cover','https://example.test/cover.jpg','Cover','image','image/jpeg',1,'{}',1000,1000);
      INSERT INTO resources (id,type,title,slug,path,status,visibility,cover_asset_id,current_revision_id,published_revision_id,published_at,created_at,updated_at)
      VALUES
        ('resource-1','document','Before','one','/docs/one','published','public','cover-1','revision-old','revision-old',1000,1000,1000),
        ('resource-2','document','Related','related','/docs/related','published','public',NULL,'revision-related','revision-related',1000,1000,1000);
      INSERT INTO resource_revisions (id,resource_id,version,title,slug,path,visibility,content,content_format,metadata_json,created_at)
      VALUES
        ('revision-old','resource-1',1,'Before','one','/docs/one','public','Before','markdown','{}',1000),
        ('revision-related','resource-2',1,'Related','related','/docs/related','public','Related','markdown','{}',1000);
      INSERT INTO resource_routes (path,resource_id,canonical,created_at)
      VALUES ('/docs/one','resource-1',1,1000),('/docs/alias','resource-1',0,1000);
      INSERT INTO categories (id,name,slug,description,parent_id,"order",created_at)
      VALUES ('category-1','Studio category','studio-category','Keep me',NULL,7,1000);
      INSERT INTO tags (id,name,slug,created_at) VALUES ('tag-1','Studio tag','studio-tag',1000);
      INSERT INTO resource_categories (resource_id,category_id) VALUES ('resource-1','category-1');
      INSERT INTO resource_tags (resource_id,tag_id) VALUES ('resource-1','tag-1');
      INSERT INTO resource_assets (resource_id,asset_id,role,sort_order) VALUES ('resource-1','cover-1','attachment',0);
      INSERT INTO collection_items (collection_resource_id,resource_id,section,note,sort_order)
      VALUES ('resource-1','resource-2','Studio','Keep me',0);
      INSERT INTO resource_relations (source_resource_id,target_resource_id,relation_type,sort_order,metadata_json)
      VALUES ('resource-1','resource-2','related_to',0,'{"owner":"studio"}');
    `)
    const stage = sqlite.prepare(`
      INSERT INTO content_import_staging
        (job_id,entity_type,entity_key,ordinal,payload_json,content_text,baseline_revision_id,created_at)
      VALUES ('legacy-job',?,?,?,?,?,?,1000)
    `)
    const importedAt = '2026-08-30T00:00:00.987Z'
    stage.run('resource', 'resource-1', 0, JSON.stringify({
      id: 'resource-1', type: 'document', title: 'Imported', slug: 'one', path: '/docs/one',
      description: null, status: 'published', visibility: 'public', coverAssetId: null,
      currentRevisionId: 'revision-new', publishedRevisionId: 'revision-new', publishedAt: importedAt,
      scheduledAt: null, createdAt: importedAt, updatedAt: importedAt,
      importMode: 'legacy', managedTaxonomy: false, managedCover: false,
    }), null, JSON.stringify({ currentRevisionId: 'revision-old', updatedAt: 1000 }))
    stage.run('revision', 'revision-new', 1, JSON.stringify({
      id: 'revision-new', resourceId: 'resource-1', version: 0, title: 'Imported', slug: 'one',
      path: '/docs/one', description: null, visibility: 'public', contentFormat: 'markdown',
      metadata: {}, sourceHash: null, changeSummary: 'Import', createdAt: importedAt,
    }), 'Imported body', null)
    stage.run('route', '/docs/one', 2, JSON.stringify({
      path: '/docs/one', resourceId: 'resource-1', canonical: true, createdAt: importedAt, importMode: 'legacy',
    }), null, JSON.stringify({ resourceId: 'resource-1', canonical: 1 }))

    sqlite.exec('BEGIN;')
    const dialect = new SQLiteSyncDialect()
    for (const statement of buildContentImportCutoverStatements('legacy-job')) {
      const query = dialect.sqlToQuery(statement as never)
      sqlite.prepare(query.sql).run(...query.params as never[])
    }
    sqlite.exec('COMMIT;')

    const resource = sqlite.prepare(`SELECT cover_asset_id AS coverAssetId, updated_at AS updatedAt FROM resources WHERE id='resource-1'`).get()
    assert.equal(resource?.coverAssetId, 'cover-1')
    assert.equal(resource?.updatedAt, 1_788_048_000)
    assert.equal(new Date(Number(resource?.updatedAt) * 1_000).toISOString(), '2026-08-30T00:00:00.000Z')
    const proxy = drizzleProxy(async (statementSql, params, method) => {
      const statement = sqlite.prepare(statementSql)
      if (method === 'run') {
        statement.run(...params as never[])
        return { rows: [] }
      }
      const rows = method === 'get'
        ? [statement.get(...params as never[])].filter(Boolean)
        : statement.all(...params as never[])
      return { rows: rows.map((row) => Object.values(row as Record<string, unknown>)) }
    })
    const [hydrated] = await proxy.select({ updatedAt: resourcesTable.updatedAt })
      .from(resourcesTable)
      .where(eq(resourcesTable.id, 'resource-1'))
    assert.equal(hydrated.updatedAt.toISOString(), '2026-08-30T00:00:00.000Z')
    assert.equal(sqlite.prepare(`SELECT count(*) AS total FROM resource_routes WHERE resource_id='resource-1'`).get()?.total, 2)
    assert.equal(sqlite.prepare(`SELECT count(*) AS total FROM resource_categories WHERE resource_id='resource-1'`).get()?.total, 1)
    assert.equal(sqlite.prepare(`SELECT count(*) AS total FROM resource_tags WHERE resource_id='resource-1'`).get()?.total, 1)
    assert.equal(sqlite.prepare(`SELECT count(*) AS total FROM resource_assets WHERE resource_id='resource-1'`).get()?.total, 1)
    assert.equal(sqlite.prepare(`SELECT count(*) AS total FROM collection_items WHERE collection_resource_id='resource-1'`).get()?.total, 1)
    assert.equal(sqlite.prepare(`SELECT count(*) AS total FROM resource_relations WHERE source_resource_id='resource-1'`).get()?.total, 1)
  } finally {
    sqlite.close()
  }
})

test('pages a 400+ resource snapshot below the per-request D1 query budget', () => {
  const now = '2026-08-30T00:00:00.000Z'
  const resources = Array.from({ length: 420 }, (_, index) => ({
    id: `resource-${index}`,
    type: 'document' as const,
    title: `Document ${index}`,
    slug: `document-${index}`,
    path: `/docs/document-${index}`,
    description: null,
    status: 'published' as const,
    visibility: 'public' as const,
    coverAssetId: null,
    currentRevisionId: `revision-${index}`,
    publishedRevisionId: `revision-${index}`,
    publishedAt: now,
    scheduledAt: null,
    createdAt: now,
    updatedAt: now,
    revisions: [{
      id: `revision-${index}`,
      version: 1,
      title: `Document ${index}`,
      slug: `document-${index}`,
      path: `/docs/document-${index}`,
      description: null,
      visibility: 'public' as const,
      content: `Body ${index}`,
      contentFormat: 'markdown' as const,
      metadata: {},
      sourceHash: null,
      changeSummary: null,
      createdAt: now,
    }],
  }))
  const snapshot = {
    resources,
    categories: [], tags: [], assets: [], articles: [], documents: [], albums: [], tracks: [], collections: [],
    categoryLinks: [], tagLinks: [], assetLinks: [], collectionItems: [], relations: [], redirects: [],
    publicationEvents: [], settings: [],
    routes: resources.map((resource) => ({
      path: resource.path,
      resourceId: resource.id,
      canonical: true,
      createdAt: now,
    })),
  }
  const bundle = {
    schemaVersion: CONTENT_BUNDLE_VERSION,
    generatedAt: now,
    source: { repository: null, ref: null, commit: null },
    files: [{
      path: CONTENT_SNAPSHOT_PATH,
      kind: 'data' as const,
      encoding: 'utf8' as const,
      mediaType: 'application/json',
      content: JSON.stringify(snapshot),
    }],
  }
  const total = contentImportStatementCount(bundle)
  assert.ok(total > 1_700)

  let cursor = 0
  let pages = 0
  while (cursor < total) {
    const page = contentImportPageBounds(total, cursor)
    assert.ok(page.statementCount > 0)
    assert.ok(page.statementCount <= CONTENT_IMPORT_STATEMENTS_PER_PAGE)
    cursor = page.end
    pages += 1
  }
  assert.equal(cursor, total)
  assert.ok(pages > 80)
  assert.ok(contentImportStageRecordCount(bundle) > 1_200)
  assert.equal(CONTENT_IMPORT_STAGE_RECORDS_PER_PAGE, 20)
  assert.equal(CONTENT_IMPORT_CUTOVER_STATEMENTS, 29)
  assert.ok(CONTENT_IMPORT_MAX_D1_QUERIES_PER_ADVANCE < 50)
})
