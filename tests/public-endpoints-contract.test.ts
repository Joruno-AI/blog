import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  absoluteAstroPageUrl,
  ASTRO_MANIFEST,
  ASTRO_ROBOTS_TXT,
  ASTRO_SITE,
  ASTRO_STATIC_PAGE_PATHS,
  buildAstroRssXml,
  buildAstroSearchIndex,
  buildAstroSitemap,
  buildAstroSitemapIndexXml,
  buildAstroSitemapXml,
  collectAllPages,
} from "@/lib/parity/public-endpoints";
import { GET as getGiscusTheme } from "@/app/(site)/giscus/[file]/route";
import { GET as getRobots } from "@/app/(site)/robots.txt/route";

test("restores every static and generated Astro sitemap page family", () => {
  const entries = buildAstroSitemap(
    [
      { path: "/blog/中文文章", type: "article" },
      { path: "/changelog/3.0.0", type: "document" },
      { path: "/streams/not-a-page", type: "document" },
      { path: "/shorts/design/note", type: "short" },
      { path: "/agent/acme/example", type: "tool" },
      { path: "/music/albums/example", type: "album" },
      { path: "/projects/example", type: "project" },
      { path: "/photos/example", type: "photo" },
    ],
    { sceneSlugs: ["code-review"], courseIds: ["course-1"] }
  );
  const urls = entries.map((entry) => entry.url);

  for (const route of ASTRO_STATIC_PAGE_PATHS) {
    assert.ok(urls.includes(absoluteAstroPageUrl(route)), route);
  }
  assert.ok(urls.includes(absoluteAstroPageUrl("/agent/scenes/code-review")));
  assert.ok(urls.includes(absoluteAstroPageUrl("/docs/course/course-1")));
  assert.ok(urls.includes(absoluteAstroPageUrl("/blog/中文文章")));
  assert.ok(urls.includes(absoluteAstroPageUrl("/changelog/300")));
  assert.ok(!urls.includes(absoluteAstroPageUrl("/changelog/3.0.0")));
  assert.ok(urls.includes(absoluteAstroPageUrl("/shorts/design/note")));
  assert.ok(urls.includes(absoluteAstroPageUrl("/agent/acme/example")));
  assert.ok(!urls.includes(absoluteAstroPageUrl("/404")));
  assert.ok(!urls.includes(absoluteAstroPageUrl("/streams/not-a-page")));
  assert.ok(!urls.includes(absoluteAstroPageUrl("/music/albums/example")));
  assert.ok(!urls.includes(absoluteAstroPageUrl("/projects/example")));
  assert.deepEqual(urls, [...urls].sort((a, b) => a.localeCompare(b, "en", { numeric: true })));
  assert.equal(new Set(urls).size, urls.length);
  assert.match(absoluteAstroPageUrl("/blog/中文文章"), /%E4%B8%AD%E6%96%87/);
});

test("serializes Astro's split sitemap endpoints exactly", () => {
  assert.equal(
    buildAstroSitemapIndexXml(),
    '<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><sitemap><loc>https://wangshengliang.cn/sitemap-0.xml</loc></sitemap></sitemapindex>'
  );
  assert.equal(
    buildAstroSitemapXml([{ url: "https://wangshengliang.cn/blog/a&b/" }]),
    '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1"><url><loc>https://wangshengliang.cn/blog/a&amp;b/</loc></url></urlset>'
  );
});

test("serializes the Astro robots application policy byte-for-byte", async () => {
  assert.equal(
    ASTRO_ROBOTS_TXT,
    "User-agent: *\nAllow: /\nSitemap: https://wangshengliang.cn/sitemap-index.xml\n",
  );
  const response = getRobots();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "text/plain; charset=utf-8");
  assert.equal(response.headers.get("cache-control"), "public, max-age=14400, must-revalidate");
  assert.equal(await response.text(), ASTRO_ROBOTS_TXT);
});

test("ships every generated docs course and agent scene route by default", () => {
  const urls = buildAstroSitemap([]).map((entry) => entry.url);
  assert.equal(urls.length, ASTRO_STATIC_PAGE_PATHS.length + 56 + 349);
  assert.ok(urls.includes(absoluteAstroPageUrl("/agent/scenes/rss-monitoring")));
  assert.ok(urls.some((url) => url.startsWith(`${ASTRO_SITE.origin}/docs/course/`)));
});

test("restores the d1ec7b0 web manifest contract", () => {
  assert.deepEqual(ASTRO_MANIFEST, {
    id: "/",
    name: "Astro AntfuStyle Theme",
    short_name: "AntfuStyle",
    description: "A customizable, feature-rich Astro theme for blog and portfolio",
    icons: [
      { src: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { src: "/icon-512.png", type: "image/png", sizes: "512x512" },
      {
        src: "/icon-mask.png",
        type: "image/png",
        sizes: "512x512",
        purpose: "maskable",
      },
    ],
    scope: "/",
    start_url: "/",
    display: "standalone",
    theme_color: "#fff",
    background_color: "#fff",
  });
});

test("serves both complete Giscus themes with the Astro CORS contract", async () => {
  for (const file of ["dark.css", "light.css"]) {
    const response = await getGiscusTheme(new Request(`https://wangshengliang.cn/giscus/${file}`), {
      params: Promise.resolve({ file }),
    });
    const css = await response.text();
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "text/css; charset=utf-8");
    assert.equal(response.headers.get("access-control-allow-origin"), "https://giscus.app");
    assert.match(css, /^@font-face \{/);
    assert.match(css, /font-family: 'Inter'/);
    assert.ok(css.length > 6_000);
  }
  const missing = await getGiscusTheme(new Request("https://wangshengliang.cn/giscus/other.css"), {
    params: Promise.resolve({ file: "other.css" }),
  });
  assert.equal(missing.status, 404);
});

test("restores the Astro search-index shape and collection boundary", () => {
  const items = buildAstroSearchIndex(
    [
      {
        id: "article:one",
        type: "article",
        title: "Article",
        path: "/blog/article",
        description: "Article description",
        metadataJson: JSON.stringify({ tags: ["stale"], redirect: "" }),
      },
      {
        id: "document:one",
        type: "document",
        title: "Release",
        path: "/changelog/3.0.0",
        description: null,
        metadataJson: JSON.stringify({ tags: ["release"], redirect: "https://example.com/release" }),
      },
      {
        id: "short:one",
        type: "short",
        title: "Short",
        path: "/shorts/one",
        description: "Excluded",
        metadataJson: "{}",
      },
    ],
    new Map([["article:one", ["next", "astro"]]])
  );

  assert.deepEqual(items, [
    {
      title: "Article",
      description: "Article description",
      tags: ["next", "astro"],
      collection: "blog",
      url: "/blog/article/",
    },
    {
      title: "Release",
      description: "",
      tags: ["release"],
      collection: "changelog",
      url: "https://example.com/release",
    },
  ]);
  assert.deepEqual(Object.keys(items[0]), ["title", "description", "tags", "collection", "url"]);

  const [legacyChangelog] = buildAstroSearchIndex([{
    id: "document:three",
    type: "document",
    title: "3.0.0",
    path: "/changelog/3.0.0",
    description: "Release",
    metadataJson: JSON.stringify({ tags: ["release"] }),
  }]);
  assert.equal(legacyChangelog.url, "/changelog/300/");
});

test("restores a full Astro RSS channel with author, image, and XSL", () => {
  const older = new Date("2024-01-01T00:00:00.000Z");
  const newer = new Date("2025-01-01T00:00:00.000Z");
  const generatedAt = new Date("2026-08-29T00:00:00.000Z");
  const xml = buildAstroRssXml(
    [
      { title: "Older", path: "/blog/older", description: null, publishedAt: older },
      { title: "Newer & safer", path: "/blog/newer", description: "<summary>", publishedAt: newer },
    ],
    generatedAt
  );

  assert.match(xml, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
  assert.match(xml, /<\?xml-stylesheet href="\/rss-styles\.xsl" type="text\/xsl"\?>/);
  assert.match(xml, new RegExp(`<title>${ASTRO_SITE.title}</title>`));
  assert.match(xml, new RegExp(`<author>${ASTRO_SITE.author}</author>`));
  assert.match(xml, /<url>https:\/\/wangshengliang\.cn\/icon-512\.png<\/url>/);
  assert.match(xml, /<description>Newer &amp; safer<\/description>|<title>Newer &amp; safer<\/title>/);
  assert.match(xml, /<description>&lt;summary&gt;<\/description>/);
  assert.match(xml, /<link>https:\/\/wangshengliang\.cn\/blog\/newer\/<\/link>/);
  assert.match(xml, new RegExp(`<lastBuildDate>${generatedAt.toUTCString()}</lastBuildDate>`));
  assert.ok(xml.indexOf("Newer &amp; safer") < xml.indexOf("Older"));
  assert.equal(xml.match(/<item>/g)?.length, 2);
});

test("paginates until every published resource has been loaded", async () => {
  const source = Array.from({ length: 235 }, (_, index) => index);
  const offsets: number[] = [];
  const result = await collectAllPages(async (offset, limit) => {
    offsets.push(offset);
    return source.slice(offset, offset + limit);
  });

  assert.deepEqual(result, source);
  assert.deepEqual(offsets, [0, 100, 200]);
  await assert.rejects(() => collectAllPages(async () => [], 0), RangeError);
});

test("both explicit and fallback 404 pages preserve the Astro copy", () => {
  for (const file of ["app/(site)/404/page.tsx", "app/(site)/not-found.tsx"]) {
    const source = readFileSync(path.resolve(process.cwd(), file), "utf8");
    assert.match(source, /<h1>404<\/h1>/);
    assert.match(source, /Nice to meet you tho!/);
    assert.doesNotMatch(source, /这份内容还不在这里/);
  }
});
