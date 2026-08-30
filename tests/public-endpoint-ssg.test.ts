import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import rssTemplateData from "@/lib/parity/data/rss-template.json";
import {
  buildSnapshotSearchIndexJson,
  buildSnapshotSitemapXml,
  PUBLIC_CONTENT_ENDPOINT_REVISION,
} from "@/lib/parity/public-content-endpoints";
import { getPublicContentSnapshot } from "@/lib/parity/public-content-snapshot";
import { ASTRO_PUBLIC_CONTENT_BASELINE_REVISION } from "@/lib/parity/public-content-snapshot-types";
import { renderRssTemplate, RSS_LAST_BUILD_DATE_TOKEN } from "@/lib/parity/rss-template";
import {
  dynamic as manifestDynamic,
  GET as getManifest,
} from "@/app/(site)/app.webmanifest/route";
import {
  dynamic as searchDynamic,
  GET as getSearchIndex,
} from "@/app/(site)/search-index.json/route";
import {
  dynamic as sitemapDynamic,
  GET as getSitemap,
} from "@/app/(site)/sitemap-0.xml/route";

const root = process.cwd();
const sha256 = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");

test("prebuilds manifest, sitemap and search without request-time D1", async () => {
  const snapshot = getPublicContentSnapshot();
  assert.equal(snapshot.contentRevision, ASTRO_PUBLIC_CONTENT_BASELINE_REVISION);
  assert.equal(manifestDynamic, "force-static");
  assert.equal(sitemapDynamic, "force-static");
  assert.equal(searchDynamic, "force-static");

  const manifest = getManifest();
  assert.equal(manifest.headers.get("content-type"), "application/manifest+json");
  assert.equal(
    sha256(await manifest.text()),
    "7b9e9c901e295935cfbf6be534698c304c398fb4999eb3762b89f983fc0f962f",
  );

  const sitemap = getSitemap();
  const sitemapXml = await sitemap.text();
  assert.equal(sitemap.headers.get("content-type"), "application/xml");
  assert.equal(sitemapXml, buildSnapshotSitemapXml());
  assert.ok((sitemapXml.match(/<url>/g) ?? []).length > 0);
  assert.equal((sitemapXml.match(/<url>/g) ?? []).length, 1_393);
  assert.equal(
    sha256(sitemapXml),
    "a2fd4967f32984d3b0928c81041bc5a3ccad178bf5b17874d1664543f4370a49",
  );

  const search = getSearchIndex();
  const searchJson = await search.text();
  assert.equal(search.headers.get("content-type"), "application/json");
  assert.equal(searchJson, buildSnapshotSearchIndexJson());
  assert.equal(
    (JSON.parse(searchJson) as unknown[]).length,
    snapshot.articles.length + snapshot.changelog.length,
  );
  assert.equal(
    sha256(searchJson),
    "a2aacd80834cf714388f89b1a55a60715b5176da96a29156e050bc870803d0cb",
  );

  for (const file of [
    "app/(site)/sitemap-0.xml/route.ts",
    "app/(site)/search-index.json/route.ts",
  ]) {
    const source = readFileSync(path.join(root, file), "utf8");
    assert.doesNotMatch(source, /force-dynamic|getPublished|getPublicResource|@\/lib\/db|env\.DB/);
  }
});

test("renders a current RSS build date from a summary-generated immutable template", () => {
  const snapshot = getPublicContentSnapshot();
  assert.equal(snapshot.contentRevision, ASTRO_PUBLIC_CONTENT_BASELINE_REVISION);
  assert.equal(rssTemplateData.contentRevision, PUBLIC_CONTENT_ENDPOINT_REVISION);
  assert.equal(
    rssTemplateData.template.match(new RegExp(RSS_LAST_BUILD_DATE_TOKEN, "g"))?.length,
    1,
  );
  const generatedAt = new Date("2026-08-28T16:41:52.000Z");
  const xml = renderRssTemplate(rssTemplateData.template, generatedAt);
  assert.match(xml, /<lastBuildDate>Fri, 28 Aug 2026 16:41:52 GMT<\/lastBuildDate>/);
  assert.equal((xml.match(/<item>/g) ?? []).length, snapshot.articles.length);
  assert.equal(
    sha256(xml),
    "73ac4b24c7c0f5f92a08dbe5cb6f78cc36e39c6186c50892350585fb023843dc",
  );
  assert.throws(
    () => renderRssTemplate("missing", generatedAt),
    /exactly one lastBuildDate token/,
  );
  assert.throws(
    () => renderRssTemplate(`${RSS_LAST_BUILD_DATE_TOKEN}${RSS_LAST_BUILD_DATE_TOKEN}`, generatedAt),
    /exactly one lastBuildDate token/,
  );
  assert.throws(
    () => renderRssTemplate(RSS_LAST_BUILD_DATE_TOKEN, new Date(Number.NaN)),
    /valid date/,
  );

  const route = readFileSync(path.join(root, "app/(site)/rss.xml/route.ts"), "utf8");
  assert.match(route, /renderRssTemplate/);
  assert.doesNotMatch(route, /getPublished|collectAllPages|env\.DB|public-content-summary/);
});

test("ships production music JSON byte-for-byte as a Worker static asset", () => {
  const assetPath = path.join(root, "public/music/data.json");
  const oldRoutePath = path.join(root, "app/(site)/music/data.json/route.ts");
  assert.equal(existsSync(oldRoutePath), false);
  const payload = readFileSync(assetPath);
  const catalog = JSON.parse(payload.toString()) as { albums?: Array<{ songs?: unknown[] }> };
  assert.ok(Array.isArray(catalog.albums));
  assert.ok(catalog.albums.every((album) => Array.isArray(album.songs)));
  assert.equal(getPublicContentSnapshot().contentRevision, ASTRO_PUBLIC_CONTENT_BASELINE_REVISION);
  assert.equal(payload.byteLength, 309_294);
  assert.equal(
    sha256(payload),
    "5a4dd47778d0075370068d561414e789905b10bf5b81d6f694c4fa07ae98f85d",
  );
});

test("endpoint projections never import the five-megabyte build-only body snapshot", () => {
  for (const file of [
    "lib/parity/public-content-endpoints.ts",
    "app/(site)/sitemap-0.xml/route.ts",
    "app/(site)/search-index.json/route.ts",
    "app/(site)/rss.xml/route.ts",
  ]) {
    assert.doesNotMatch(
      readFileSync(path.join(root, file), "utf8"),
      /public-(?:build-snapshot|content-build)\.json/,
    );
  }
});
