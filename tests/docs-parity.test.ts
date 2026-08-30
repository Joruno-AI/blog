import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  GET as getCourseRedirect,
  generateStaticParams as generateCourseStaticParams,
} from "../app/(site)/docs/course/[id]/route";
import type { DocsCatalog } from "@/lib/docs/catalog";
import {
  docsHeadingId,
  docsMarkdownUrls,
  docsReaderUrl,
  extractDocsHeadings,
  findDocsArticle,
  normalizeDocsMarkdown,
  searchDocsCatalog,
  shouldRetryDocsStatus,
} from "@/lib/parity/docs";

const catalog = JSON.parse(readFileSync("lib/parity/data/docs-catalog.json", "utf8")) as DocsCatalog;

test("preserves both Astro course sources and every indexed chapter", () => {
  assert.deepEqual(catalog.sources.map((source) => source.id), ["geektime", "nuggets"]);
  assert.deepEqual(catalog.stats, { categories: 8, courses: 349, articles: 13_034 });
  assert.equal(
    catalog.categories.flatMap((category) => category.courses).reduce((count, course) => count + course.articles.length, 0),
    catalog.stats.articles,
  );
});

test("matches the source reader URL and finds articles inside their source/course boundary", () => {
  const course = catalog.categories[0].courses[0];
  const article = course.articles[0];
  assert.equal(
    docsReaderUrl(article.path, course.sourceId, course.id),
    `/docs/read/?source=${encodeURIComponent(course.sourceId)}&path=${encodeURIComponent(article.path)}&course=${encodeURIComponent(course.id)}`,
  );
  assert.equal(findDocsArticle(catalog, article.path, course.sourceId, course.id)?.article.path, article.path);
  assert.equal(findDocsArticle(catalog, article.path, "missing", course.id), null);
  assert.equal(findDocsArticle(catalog, article.path, course.sourceId, "missing"), null);
});

test("reproduces the scored catalog search, locale ordering, and full-result count", () => {
  const results = searchDocsCatalog(catalog, " React ");
  assert.equal(results.length, 142);
  assert.equal(results[0].title, "React 进阶实践指南");
  assert.equal(results[0].kind, "课程");
  assert.match(results[0].href, /^\/docs\/read\/\?source=nuggets&path=/);
  assert.deepEqual(results.slice(0, 3).map((result) => result.score), [0, 0, 0]);
  assert.ok(results.every((result, index) => index === 0 || results[index - 1].score <= result.score));
});

test("removes the first rendered H1 and the source comments appendix without touching later H1s", () => {
  const markdown = [
    "导语先于标题。",
    "",
    "```md",
    "# fenced title",
    "```",
    "",
    "# 首个正文标题",
    "正文",
    "# 后续正文标题",
    "## 子标题",
    "精选留言（12）",
    "不应进入阅读器",
  ].join("\n");
  const normalized = normalizeDocsMarkdown(markdown);
  assert.doesNotMatch(normalized, /^# 首个正文标题$/m);
  assert.match(normalized, /^# fenced title$/m);
  assert.match(normalized, /^# 后续正文标题$/m);
  assert.match(normalized, /^## 子标题$/m);
  assert.doesNotMatch(normalized, /不应进入阅读器/);
});

test("builds stable, unique H2-H4 anchors while ignoring fenced headings", () => {
  const markdown = [
    "## 重复 标题!",
    "### [重复 标题!](https://example.com)",
    "```md",
    "## 不应出现",
    "```",
    "#### `API` 与 **实现**",
  ].join("\n");
  assert.equal(docsHeadingId(" 重复 标题! "), "重复-标题");
  assert.deepEqual(extractDocsHeadings(markdown), [
    { depth: 2, id: "重复-标题", line: 1, text: "重复 标题!" },
    { depth: 3, id: "重复-标题-2", line: 2, text: "重复 标题!" },
    { depth: 4, id: "api-与-实现", line: 6, text: "API 与 实现" },
  ]);
});

test("keeps the three source snapshot fallbacks and retry status contract", () => {
  const source = catalog.sources[0];
  const path = catalog.categories[0].courses[0].articles[0].path;
  const urls = docsMarkdownUrls(source, path);
  assert.equal(urls.length, 3);
  assert.match(urls[0], /^https:\/\/cdn\.jsdelivr\.net\/gh\//);
  assert.match(urls[1], /^https:\/\/gcore\.jsdelivr\.net\/gh\//);
  assert.match(urls[2], /^https:\/\/raw\.githubusercontent\.com\//);
  assert.equal(shouldRetryDocsStatus(404), true);
  assert.equal(shouldRetryDocsStatus(429), true);
  assert.equal(shouldRetryDocsStatus(503), true);
  assert.equal(shouldRetryDocsStatus(400), false);
});

test("serves the same 200 meta-refresh document as deployed Astro course routes", async () => {
  const course = catalog.categories[0].courses[0];
  const response = await getCourseRedirect(
    new Request(`https://wangshengliang.cn/docs/course/${course.id}/`),
    { params: Promise.resolve({ id: course.id }) },
  );
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.match(html, /^<!doctype html><title>Redirecting to: /);
  assert.match(html, /http-equiv="refresh" content="2;url=\/docs\/read\//);
  assert.match(html, /<meta name="robots" content="noindex">/);
  assert.match(html, /<link rel="canonical" href="https:\/\/wangshengliang\.cn\/docs\/read\//);

  const missing = await getCourseRedirect(
    new Request("https://wangshengliang.cn/docs/course/ffffffffffff/"),
    { params: Promise.resolve({ id: "ffffffffffff" }) },
  );
  assert.equal(missing.status, 404);
});

test("pre-renders every course redirect and the query-driven reader shell", () => {
  assert.equal(generateCourseStaticParams().length, catalog.stats.courses);
  const courseRoute = readFileSync("app/(site)/docs/course/[id]/route.ts", "utf8");
  const readPage = readFileSync("app/(site)/docs/read/page.tsx", "utf8");
  const readerBoundary = readFileSync("components/site/docs-reader.tsx", "utf8");
  assert.match(courseRoute, /dynamic = "force-static"/);
  assert.match(courseRoute, /dynamicParams = false/);
  assert.doesNotMatch(readPage, /force-dynamic|searchParams:/);
  assert.match(readPage, /DocsReaderFromQuery/);
  assert.match(readerBoundary, /useSearchParams/);
});

test("replaces generic Docs placeholders with the Astro course library and reader", () => {
  const indexPage = readFileSync("app/(site)/docs/page.tsx", "utf8");
  const readPage = readFileSync("app/(site)/docs/read/page.tsx", "utf8");
  const coursePage = readFileSync("app/(site)/docs/course/[id]/route.ts", "utf8");
  const library = readFileSync("components/site/docs-library.tsx", "utf8");
  const readerBoundary = readFileSync("components/site/docs-reader.tsx", "utf8");
  const reader = readFileSync("components/site/docs-reader-impl.tsx", "utf8");
  const catalogRoute = readFileSync("app/(site)/docs/catalog.json/route.ts", "utf8");

  assert.doesNotMatch(indexPage, /SectionPage/);
  assert.doesNotMatch(readPage, /LegacyPage|ResourceDetailPage|redirect\(/);
  assert.match(coursePage, /docsReaderUrl/);
  assert.match(library, /\/docs\/catalog\.json\?v=3/);
  assert.match(library, /DISPLAY_LIMIT = 60/);
  assert.match(library, /setTimeout\(\(\) =>/);
  assert.match(reader, /fetchMarkdown|reader-course-panel|reader-mindmap-dialog/);
  assert.match(reader, /codeToHtml/);
  assert.match(reader, /rehypeSanitize, docsMarkdownSanitizeSchema/);
  assert.match(reader, /\[rehypeSanitize, docsMarkdownSanitizeSchema\][\s\S]*rehypeKatex/);
  assert.doesNotMatch(reader, /BLOCKED_RAW_TAGS|rehypeDocsSafety/);
  assert.match(reader, /IntersectionObserver/);
  assert.match(reader, /showModal\(\)/);
  assert.match(reader, /\{located \? \(\s*<DocsMindMap/);
  assert.match(reader, /sessionStorage/);
  assert.match(readerBoundary, /dynamic\(/);
  assert.match(readerBoundary, /ssr:\s*false/);
  assert.match(readerBoundary, /docs-reader-impl/);
  assert.doesNotMatch(readerBoundary, /shiki\/bundle\/full/);
  assert.match(catalogRoute, /internal\/docs\/catalog\.json/);
  assert.doesNotMatch(catalogRoute, /parity\/data\/docs-catalog\.json/);
  assert.match(catalogRoute, /max-age=60, stale-while-revalidate=300/);
  assert.match(catalogRoute, /if \(bucket\?\.get\)/);
  assert.doesNotMatch(catalogRoute, /if \(cloudflareRuntime\)/);
});
