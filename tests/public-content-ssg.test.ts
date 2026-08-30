import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  PublicArticleActionsHydrator,
  PublicArticleTocHydrator,
  PublicMarkdownHydrator,
  PublicResourceContentProvider,
} from "@/components/site/public-resource-content";

import publicContentPaths from "@/lib/parity/data/public-content-paths.json";
import { getBuildOnlyPublicContent } from "@/lib/parity/public-content-build";
import {
  canonicalChangelogSlug,
  PUBLIC_CONTENT_PATH_LOOKUP_SQL,
} from "@/lib/parity/public-content-access";
import {
  createPublicResourceRequester,
  isPublicResourceRevokedError,
} from "@/lib/parity/public-resource-client";
import {
  getPublicContentSnapshot,
  getSnapshotArticle,
  getSnapshotChangelog,
  getSnapshotShort,
} from "@/lib/parity/public-content-snapshot";
import { isPrebuiltPublicContentPath } from "@/lib/parity/public-content-paths";
import { ASTRO_PUBLIC_CONTENT_BASELINE_REVISION } from "@/lib/parity/public-content-snapshot-types";

const root = process.cwd();
const source = (file: string) => readFileSync(path.join(root, file), "utf8");

// JSX is preserved for Next.js and compiled with the classic runtime by tsx.
// Expose React so this test can exercise the actual no-JS server render.
Object.assign(globalThis, { React });

test("commits a complete body-free summary and keeps the full corpus build-only", () => {
  const summary = getPublicContentSnapshot();
  assert.deepEqual(summary.counts, {
    articles: summary.articles.length,
    changelog: summary.changelog.length,
    shorts: summary.shorts.length,
    projects: summary.projects.length,
    streams: summary.streams.length,
    photos: summary.photos.length,
  });
  assert.equal(summary.contentRevision, ASTRO_PUBLIC_CONTENT_BASELINE_REVISION);
  assert.deepEqual(summary.counts, {
    articles: 550,
    changelog: 15,
    shorts: 1,
    projects: 21,
    streams: 10,
    photos: 16,
  });
  assert.ok(summary.articles.every((article) => !Object.hasOwn(article, "content")));
  assert.ok([
    ...summary.changelog,
    ...summary.shorts,
    ...summary.projects,
    ...summary.streams,
    ...summary.photos,
  ].every((resource) => !Object.hasOwn(resource, "content")));

  const publicFallbackPath = path.join(root, "public/content/public-build-snapshot.json");
  assert.equal(existsSync(publicFallbackPath), false);

  const buildPath = path.join(root, "lib/parity/data/public-content-build.json");
  assert.match(source(".gitignore"), /^\/lib\/parity\/data\/public-content-build\.json$/m);
  const buildText = readFileSync(buildPath, "utf8");
  const buildSnapshot = JSON.parse(buildText) as {
    schemaVersion: number;
    contentRevision: string;
    resources: Array<{
      type: string;
      path: string;
      visibility: string;
      content: string;
      astroMarkdownTree: unknown[] | null;
    }>;
  };
  assert.equal(buildSnapshot.schemaVersion, 2);
  assert.equal(buildSnapshot.contentRevision, summary.contentRevision);
  assert.equal(
    buildSnapshot.resources.length,
    Object.values(summary.counts).reduce((total, count) => total + count, 0),
  );
  assert.ok(buildSnapshot.resources.every((resource) => resource.visibility === "public"));
  assert.ok(buildSnapshot.resources.every((resource) => (
    resource.type === "article"
      ? Array.isArray(resource.astroMarkdownTree)
      : resource.astroMarkdownTree === null
  )));
  const bodyBytes = buildSnapshot.resources.reduce(
    (total, resource) => total + Buffer.byteLength(resource.content),
    0,
  );
  assert.ok(bodyBytes > 0);
  assert.equal(bodyBytes, 4_542_662);
  assert.ok(statSync(buildPath).size > bodyBytes);

  const first = summary.articles[0];
  if (first) {
    const buildContent = getBuildOnlyPublicContent(first.path, first.revisionId);
    assert.equal(buildContent?.type, "article");
    assert.equal(buildContent?.content.length, first.contentLength);
    assert.equal(getBuildOnlyPublicContent(first.path, "stale-revision"), null);
  }
});

test("pre-generates every current detail route while retaining dynamic CMS fallback", () => {
  const summary = getPublicContentSnapshot();
  assert.equal(new Set(summary.articles.map((article) => article.path)).size, summary.articles.length);
  const firstArticle = summary.articles[0];
  if (firstArticle) assert.equal(getSnapshotArticle(firstArticle.path)?.id, firstArticle.id);
  for (const resource of summary.changelog) {
    assert.equal(getSnapshotChangelog(resource.publicPath)?.id, resource.id);
  }
  for (const resource of summary.shorts) {
    assert.equal(getSnapshotShort(resource.path)?.id, resource.id);
  }
  assert.equal(summary.contentRevision, ASTRO_PUBLIC_CONTENT_BASELINE_REVISION);
  assert.equal(getSnapshotChangelog("/changelog/300")?.slug, "300");
  assert.equal(getSnapshotShort("/shorts/using-ai-to-craft-high-quality-ui")?.type, "short");

  for (const [file, collection] of [
    ["app/(site)/blog/[...slug]/page.tsx", "articles"],
    ["app/(site)/changelog/[slug]/page.tsx", "changelog"],
    ["app/(site)/shorts/[...slug]/page.tsx", "shorts"],
  ] as const) {
    const page = source(file);
    assert.match(page, /export const dynamicParams = true/);
    assert.match(page, /export function generateStaticParams\(\)/);
    assert.match(page, new RegExp(`getPublicContentSnapshot\\(\\)\\.${collection}`));
    assert.doesNotMatch(page, /dynamic = "force-dynamic"/);
  }

  const blog = source("app/(site)/blog/[...slug]/page.tsx");
  assert.match(blog, /getSnapshotArticle/);
  assert.match(blog, /dynamicArticle/);
  assert.match(blog, /getPublicResource/);
  assert.match(blog, /getPublicPostSummaryBySlug/);
  assert.match(blog, /getBuildOnlyPublicContent/);
  assert.match(blog, /initialContent:\s*resource\.content/);
  assert.match(blog, /initialAstroMarkdownTree:\s*content\.astroMarkdownTree/);
  assert.match(blog, /<AstroMarkdownContent/);
  assert.doesNotMatch(blog, /getPublicPostBySlug|\bMarkdownContent\b/);
});

test("server-renders initial Markdown and refreshes it without a bulk browser fallback", () => {
  const boundary = source("components/site/public-resource-content.tsx");
  const implementation = source("components/site/public-resource-content-impl.tsx");
  const requester = source("lib/parity/public-resource-client.ts");
  assert.doesNotMatch(boundary, /dynamic\(|ssr:\s*false|next\/dynamic/);
  assert.doesNotMatch(boundary, /public-build-snapshot\.json/);
  assert.match(requester, /\/api\/public\/resources\//);
  assert.match(requester, /cache:\s*"no-store"/);
  assert.match(requester, /baseRequest\.finally/);
  assert.doesNotMatch(implementation + requester, /PUBLIC_CONTENT_FALLBACK_URL|public-build-snapshot\.json/);
  assert.match(implementation, /MarkdownContent/);
  assert.match(implementation, /extractArticleHeadings/);
  assert.match(implementation, /resource\.revisionId === initialRevisionId/);
  assert.match(implementation, /isPublicResourceRevokedError/);

  const exactRuntime = source("components/site/astro-markdown-content.tsx");
  const exactCompiler = source("scripts/lib/astro-markdown-compiler.ts");
  assert.match(exactRuntime, /import "server-only"/);
  assert.match(exactRuntime, /toJsxRuntime/);
  assert.match(exactRuntime, /AstroMarkdownTree/);
  assert.doesNotMatch(
    exactRuntime,
    /from\s+["'](?:rehype-expressive-code|remark-parse|remark-rehype|unified|shiki)["']|createRenderer|pluginLineNumbers/i,
  );
  assert.match(exactCompiler, /rehypeExpressiveCode/);
  assert.match(exactCompiler, /compileAstroMarkdown/);
  assert.match(exactCompiler, /rehypeRememberRawHtml[\s\S]*rehypeRaw[\s\S]*rehypeRawArticleBoundary/);
  assert.doesNotMatch(exactRuntime, /dangerouslySetInnerHTML/);

  for (const file of [
    "app/(site)/blog/[...slug]/page.tsx",
    "app/(site)/changelog/[slug]/page.tsx",
    "app/(site)/shorts/[...slug]/page.tsx",
  ]) {
    const page = source(file);
    assert.match(page, /getBuildOnlyPublicContent/);
    assert.match(page, /initialContent/);
    assert.match(page, /initialRevisionId/);
  }

  const loader = source("lib/parity/public-content-build.ts");
  assert.match(loader, /schemaVersion !== 2/);
  assert.match(loader, /astroMarkdownTree/);
  assert.match(loader, /process\.getBuiltinModule/);
  assert.match(loader, /builtinModule<FileSystemModule>\("fs"\)/);
  assert.match(loader, /builtinModule<PathModule>\("path"\)/);
  assert.doesNotMatch(loader, /import .*node:fs|import .*public-content-build\.json/);
});

test("serializes each initial body through one shared SSR content provider", () => {
  const boundary = source("components/site/public-resource-content.tsx");
  const implementation = source("components/site/public-resource-content-impl.tsx");
  const blog = source("app/(site)/blog/[...slug]/page.tsx");
  const sharedPost = source("components/site/public-post-detail.tsx");
  const changelog = source("app/(site)/changelog/[slug]/page.tsx");
  const short = source("app/(site)/shorts/[...slug]/page.tsx");
  const count = (value: string, pattern: RegExp) => value.match(pattern)?.length ?? 0;

  assert.equal(count(blog, /<PublicResourceContentProvider\b/g), 1);
  assert.equal(count(sharedPost, /<PublicResourceContentProvider\b/g), 1);
  assert.equal(count(blog, /\binitialContent=\{/g), 1);
  assert.equal(count(sharedPost, /\binitialContent=\{/g), 1);
  assert.equal(count(changelog, /\binitialContent=\{/g), 1);
  assert.equal(count(short, /\binitialContent=\{/g), 1);
  // The small revision token is used once by the provider and once to decide
  // whether its precompiled child is still current; the large body stays one.
  assert.equal(count(blog, /\binitialRevisionId=\{/g), 2);
  assert.equal(count(sharedPost, /\binitialRevisionId=\{/g), 1);
  assert.equal(count(changelog, /\binitialRevisionId=\{/g), 1);
  assert.equal(count(short, /\binitialRevisionId=\{/g), 1);

  assert.match(implementation, /createContext<ContentState \| null>/);
  assert.equal(count(implementation, /const state = usePublicResource\(\{/g), 1);
  assert.equal(count(implementation, /const state = usePublicResourceContent\(\)/g), 3);
  assert.doesNotMatch(boundary + implementation, /next\/dynamic|\bdynamic\(|ssr:\s*false/);

  const content = "## SSR section\n\nThe initial body is present without JavaScript.\n\n用 AI 做 UI，本质是\"管理 AI 团队\"而非\"使用工具\"。";
  const html = renderToStaticMarkup(createElement(PublicResourceContentProvider, {
    resourcePath: "/blog/ssr-proof",
    expectedType: "article",
    initialContent: content,
    initialRevisionId: "revision:ssr-proof",
    children: createElement(React.Fragment, null,
      createElement(PublicArticleActionsHydrator, {
        title: "SSR proof",
        url: "https://wangshengliang.cn/blog/ssr-proof/",
      }),
      createElement(PublicMarkdownHydrator, { className: "ssr-proof" }),
      createElement(PublicArticleTocHydrator, { tocEnabled: true }),
    ),
  }));
  assert.match(html, /class="ssr-proof"/);
  assert.match(html, /<h2 id="ssr-section">SSR section/);
  assert.match(html, /The initial body is present without JavaScript\./);
  assert.match(html, /本质是”管理 AI 团队”而非”使用工具”/);
  assert.match(html, /data-post-actions="true"/);
  assert.match(html, /article-toc-desktop/);
});

test("client refresh deduplicates only in-flight work and retries after every settlement", async () => {
  let calls = 0;
  let releaseFirst!: () => void;
  const firstGate = new Promise<void>((resolve) => { releaseFirst = resolve; });
  const resource = {
    id: "article:one",
    type: "article",
    slug: "one",
    path: "/blog/one",
    revisionId: "revision:one",
    content: "# One",
  };
  const request = createPublicResourceRequester(async () => {
    calls += 1;
    if (calls === 1) await firstGate;
    return Response.json(resource);
  });

  const first = request("/blog/one");
  const second = request("/blog/one");
  const third = request("/blog/one");
  assert.equal(first, second);
  assert.equal(second, third);
  assert.equal(calls, 1);
  releaseFirst();
  await Promise.all([first, second, third]);

  await request("/blog/one");
  assert.equal(calls, 2, "a fulfilled request must not remain cached");

  let failureCalls = 0;
  const retry = createPublicResourceRequester(async () => {
    failureCalls += 1;
    return failureCalls === 1
      ? Response.json({ error: "gone" }, { status: 404 })
      : Response.json(resource);
  });
  await assert.rejects(retry("/blog/one"), isPublicResourceRevokedError);
  await retry("/blog/one");
  assert.equal(failureCalls, 2, "a rejected request must be retryable");
});

test("canonical changelog refresh accepts the authoritative dotted resource", async () => {
  const request = createPublicResourceRequester(async (input) => {
    assert.equal(String(input), "/api/public/resources/changelog/300");
    return Response.json({
      id: "changelog:300",
      type: "document",
      slug: "300",
      path: "/changelog/3.0.0",
      revisionId: "revision:300",
      content: "# 3.0.0",
    });
  });
  assert.equal((await request("/changelog/300")).revisionId, "revision:300");
});

test("keeps the legacy post shell, metadata, TOC and share contracts intact", () => {
  const previous = source("components/site/astro-post-detail.tsx");
  const prebuilt = source("components/site/public-post-detail.tsx");
  for (const contract of [
    "PageStructuredData",
    "post-reader-layout blog-parity-page astro-post-reader",
    "astro-post-column",
    "prose astro-post-header",
    "post-meta-wrapper",
    "slide-enter-content prose astro-post-body",
    "price-tag-3-line",
    "astro-post-share",
    "LegacyPageFooter",
  ]) {
    assert.ok(previous.includes(contract), `legacy component is missing ${contract}`);
    assert.ok(prebuilt.includes(contract), `snapshot component is missing ${contract}`);
  }
  assert.match(prebuilt, /PublicMarkdownHydrator/);
  assert.match(prebuilt, /PublicArticleTocHydrator/);
  assert.match(prebuilt, /Reading \$\{canonicalUrl\}\\n\\nI think/);
});

test("middleware treats generated paths as audit data and always checks D1", () => {
  assert.equal(new Set(publicContentPaths).size, publicContentPaths.length);
  const summary = getPublicContentSnapshot();
  assert.equal(
    publicContentPaths.length,
    summary.articles.length + summary.changelog.length + summary.shorts.length,
  );
  assert.equal(summary.contentRevision, ASTRO_PUBLIC_CONTENT_BASELINE_REVISION);
  assert.equal(publicContentPaths.length, 566);
  assert.ok(publicContentPaths.every((contentPath) => /^\/(?:blog|changelog|shorts)\//.test(contentPath)));
  assert.equal(isPrebuiltPublicContentPath("/changelog/300"), true);
  assert.equal(isPrebuiltPublicContentPath("/changelog/3.0.0"), false);
  assert.equal(isPrebuiltPublicContentPath("/blog/private-future-entry"), false);

  const middleware = source("middleware.ts");
  assert.doesNotMatch(middleware, /isPrebuiltPublicContentPath|prebuiltPublicPath/);
  assert.match(middleware, /reservedContentRoute \? null : await resolveContentPath\(pathname\)/);
  assert.match(middleware, /visibilityAllows\(contentPath\.visibility\)[\s\S]*visibilityAllows\(contentPath\.revisionVisibility\)/);
  assert.match(middleware, /isDottedChangelogPath[\s\S]*rewriteAsNotFound/);
  assert.doesNotMatch(middleware, /public-content-snapshot/);

  const pathModule = source("lib/parity/public-content-paths.ts");
  assert.match(pathModule, /public-content-paths\.json/);
  assert.doesNotMatch(pathModule, /public-content-summary/);
});

test("canonical changelog lookup works before and after route migration", () => {
  const database = new DatabaseSync(":memory:");
  database.exec(`
    CREATE TABLE redirects (from_path TEXT, to_path TEXT, status_code INTEGER);
    CREATE TABLE resource_routes (path TEXT, resource_id TEXT);
    CREATE TABLE resources (
      id TEXT PRIMARY KEY, type TEXT, slug TEXT, path TEXT, status TEXT,
      visibility TEXT, published_revision_id TEXT
    );
    CREATE TABLE resource_revisions (
      id TEXT PRIMARY KEY, slug TEXT, path TEXT, visibility TEXT
    );
    INSERT INTO resources VALUES (
      'changelog:100', 'document', '100', '/changelog/1.0.0', 'published',
      'public', 'revision:100'
    );
    INSERT INTO resource_revisions VALUES (
      'revision:100', '100', '/changelog/1.0.0', 'public'
    );
    INSERT INTO resource_routes VALUES ('/changelog/1.0.0', 'changelog:100');
  `);
  const lookup = database.prepare(PUBLIC_CONTENT_PATH_LOOKUP_SQL);
  const canonicalPath = "/changelog/100";
  const find = () => lookup.get(
    canonicalPath,
    canonicalPath,
    canonicalPath,
    canonicalChangelogSlug(canonicalPath),
  ) as { resourceId: string; visibility: string; revisionVisibility: string } | undefined;

  assert.deepEqual({ ...find() }, {
    kind: "resource",
    toPath: null,
    statusCode: null,
    resourceId: "changelog:100",
    visibility: "public",
    revisionVisibility: "public",
  });

  database.exec(`
    UPDATE resource_routes SET path = '/changelog/100';
    UPDATE resources SET path = '/changelog/100';
    UPDATE resource_revisions SET path = '/changelog/100';
  `);
  assert.equal(find()?.resourceId, "changelog:100");

  database.exec("UPDATE resource_revisions SET visibility = 'private'");
  assert.equal(find()?.revisionVisibility, "private");
  database.exec("UPDATE resources SET status = 'draft'");
  assert.equal(find(), undefined);
});

test("build snapshot regeneration is fenced, keyset-paged and supports local or remote D1", () => {
  const generator = source("scripts/generate-public-content-snapshot.ts");
  assert.match(generator, /remote \? "--remote" : "--local"/);
  assert.match(generator, /function keysetRows/);
  assert.match(generator, /r\.id > \$\{sqlText\(cursor\)\}/);
  assert.match(generator, /if \(batch\.length < page\) break/);
  assert.match(generator, /const fenceBefore = projectionFence\(\)/);
  assert.match(generator, /fenceAfter !== fenceBefore/);
  assert.match(generator, /publicMusicCatalogFromBuildRows/);
  assert.match(generator, /process\.argv\.includes\("--check"\)/);
  assert.match(generator, /ORDER BY r\.id/);
  assert.match(generator, /r\.published_at AS updatedAt/);
  assert.doesNotMatch(generator, /r\.updated_at AS updatedAt/);
  assert.doesNotMatch(generator, /rr\.created_at AS updatedAt/);
  assert.match(generator, /function projectionFence\(\)[\s\S]*contentProjectionSelect/);
  assert.match(generator, /JOIN resource_albums album_projection ON album_projection\.resource_id = album_resource\.id/);
  assert.doesNotMatch(generator, /FROM assets ORDER BY id|FROM resource_assets/);
  assert.match(generator, /lib\/parity\/data\/public-content-build\.json/);
  assert.doesNotMatch(generator, /public\/content\/public-build-snapshot\.json/);
  assert.doesNotMatch(generator, /Date\.now|new Date\(\)\.toISOString/);

  const photoEndpoint = path.join(root, "public/photos/photos.132f41f4.json");
  assert.equal(readFileSync(photoEndpoint).at(-1), "]".charCodeAt(0), "photo JSON has no trailing newline");
});
