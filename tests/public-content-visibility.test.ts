import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import test from "node:test";

import { sql, type SQL } from "drizzle-orm";
import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core";

import {
  publicArticleSummarySelection,
  publishedArticleVisibilityCondition,
  type PublishedArticleVisibilityScope,
} from "@/lib/db/queries/posts";
import { resourceRevisions, resources } from "@/lib/db/schema";
import { parsePublicSearchCollection } from "@/modules/resources/application/queries";
import {
  buildPublishedResourceSearchQuery,
  dateFromD1UnixSeconds,
  publishedResourceSummarySelection,
  sanitizePublicSearchSummary,
} from "@/modules/resources/infrastructure/resource-repository";

const root = process.cwd();
const dialect = new SQLiteSyncDialect();

function compile(statement: SQL) {
  const query = dialect.sqlToQuery(statement);
  return {
    sql: query.sql,
    params: query.params as SQLInputValue[],
  };
}

function idsForArticleVisibility(scope: PublishedArticleVisibilityScope) {
  const database = new DatabaseSync(":memory:");
  database.exec(`
    CREATE TABLE resources (
      id TEXT PRIMARY KEY,
      visibility TEXT NOT NULL,
      published_revision_id TEXT
    );
    CREATE TABLE resource_revisions (
      id TEXT PRIMARY KEY,
      visibility TEXT NOT NULL
    );
  `);
  const insertResource = database.prepare(
    "INSERT INTO resources (id, visibility, published_revision_id) VALUES (?, ?, ?)"
  );
  const insertRevision = database.prepare(
    "INSERT INTO resource_revisions (id, visibility) VALUES (?, ?)"
  );
  for (const [id, resourceVisibility, revisionVisibility] of [
    ["public", "public", "public"],
    ["private", "private", "private"],
    ["unlisted", "unlisted", "unlisted"],
    ["stale-resource", "public", "private"],
    ["stale-revision", "private", "public"],
  ] as const) {
    const revisionId = `revision:${id}`;
    insertResource.run(id, resourceVisibility, revisionId);
    insertRevision.run(revisionId, revisionVisibility);
  }

  const statement = sql`
    SELECT ${resources.id} AS id
    FROM ${resources}
    JOIN ${resourceRevisions}
      ON ${resourceRevisions.id} = ${resources.publishedRevisionId}
    WHERE ${publishedArticleVisibilityCondition(scope)}
    ORDER BY ${resources.id}
  `;
  const query = compile(statement);
  return database.prepare(query.sql).all(...query.params).map((row) => row.id);
}

test("published article lists expose only public rows while direct links may opt into unlisted", () => {
  assert.deepEqual(idsForArticleVisibility("public"), ["public"]);
  assert.deepEqual(
    idsForArticleVisibility("public-or-unlisted"),
    ["public", "unlisted"]
  );
});

test("the unused legacy public media catalog cannot enumerate internal assets", () => {
  assert.equal(
    existsSync(path.join(root, "app/api/public/media/route.ts")),
    false
  );
});

function createSearchFixture() {
  const database = new DatabaseSync(":memory:");
  database.exec(`
    CREATE VIRTUAL TABLE resource_search USING fts5(
      resource_id UNINDEXED,
      title,
      description,
      content,
      tokens
    );
    CREATE TABLE resources (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      slug TEXT NOT NULL,
      path TEXT NOT NULL,
      description TEXT,
      visibility TEXT NOT NULL,
      cover_asset_id TEXT,
      published_at INTEGER,
      published_revision_id TEXT,
      status TEXT NOT NULL
    );
    CREATE TABLE resource_revisions (
      id TEXT PRIMARY KEY,
      visibility TEXT NOT NULL,
      version INTEGER NOT NULL,
      content TEXT NOT NULL,
      content_format TEXT NOT NULL,
      metadata_json TEXT NOT NULL
    );
    CREATE INDEX resources_type_status_published_idx
      ON resources(type, status, published_at);
  `);
  const insertResource = database.prepare(`
    INSERT INTO resources (
      id, type, title, slug, path, description, visibility,
      cover_asset_id, published_at, published_revision_id, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, 'published')
  `);
  const insertRevision = database.prepare(`
    INSERT INTO resource_revisions (
      id, visibility, version, content, content_format, metadata_json
    ) VALUES (?, ?, 1, 'needle', 'markdown', '{}')
  `);
  const insertSearch = database.prepare(`
    INSERT INTO resource_search (resource_id, title, description, content, tokens)
    VALUES (?, ?, '', 'needle', 'needle')
  `);
  const add = (
    id: string,
    type: string,
    routePath: string,
    publishedAt: number,
    visibility: "public" | "unlisted" | "private" = "public",
    revisionVisibility = visibility
  ) => {
    const revisionId = `revision:${id}`;
    insertResource.run(
      id,
      type,
      `Needle ${id}`,
      id,
      routePath,
      `${id} excerpt`,
      visibility,
      publishedAt,
      revisionId
    );
    insertRevision.run(revisionId, revisionVisibility);
    insertSearch.run(id, `Needle ${id}`);
  };

  // These would consume an unscoped LIMIT 50 before either target row.
  for (let index = 0; index < 60; index += 1) {
    add(`tool-${index}`, "tool", `/agent/tool-${index}`, 10_000 + index);
  }
  add("blog-target", "article", "/blog/target", 2);
  add("changelog-target", "document", "/changelog/300", 1);
  add("private-blog", "article", "/blog/private", 30_000, "private");
  add("unlisted-blog", "article", "/blog/unlisted", 30_001, "unlisted");
  add("stale-blog", "article", "/blog/stale", 30_002, "public", "private");
  return database;
}

test("search applies collection and visibility before LIMIT so other resource types cannot starve results", () => {
  const database = createSearchFixture();
  for (const [collection, expected] of [
    ["blog", "blog-target"],
    ["changelog", "changelog-target"],
  ] as const) {
    const statement = buildPublishedResourceSearchQuery("needle", collection, 50);
    assert.ok(statement);
    const query = compile(statement);
    assert.match(query.sql, /FROM resource_search\s+CROSS JOIN resources r/i);
    assert.ok(query.sql.indexOf("r.type") < query.sql.lastIndexOf("LIMIT"));
    const plan = database
      .prepare(`EXPLAIN QUERY PLAN ${query.sql}`)
      .all(...query.params)
      .map((row) => String(row.detail));
    const ftsStep = plan.findIndex((detail) => /SCAN resource_search VIRTUAL TABLE/i.test(detail));
    const resourceStep = plan.findIndex((detail) => /SEARCH r USING/i.test(detail));
    assert.ok(ftsStep >= 0, plan.join("\n"));
    assert.ok(resourceStep > ftsStep, plan.join("\n"));
    const rows = database.prepare(query.sql).all(...query.params);
    assert.deepEqual(rows.map((row) => row.id), [expected]);
    assert.equal(rows[0]?.summary, `${expected} excerpt`);
    assert.doesNotMatch(query.sql, /rr\.content(?:\s|,|$)/i);
    assert.doesNotMatch(query.sql, /metadata_json/i);
    assert.match(query.sql, /substr\(r\.description/i);
  }
});

test("catalog projections and public search responses never select article bodies", () => {
  assert.equal(Object.hasOwn(publicArticleSummarySelection, "content"), false);
  assert.equal(Object.hasOwn(publishedResourceSummarySelection, "content"), false);

  const api = readFileSync(path.join(root, "app/api/public/search/route.ts"), "utf8");
  const agentQueries = readFileSync(path.join(root, "lib/agent/queries.ts"), "utf8");
  const postQueries = readFileSync(path.join(root, "lib/db/queries/posts.ts"), "utf8");
  assert.doesNotMatch(api, /content:\s*result\.content/);
  assert.match(api, /description:\s*result\.description/);
  assert.match(agentQueries, /getPublishedResourceSummariesByPathPrefix/);
  assert.doesNotMatch(agentQueries, /getPublishedResourcesByPathPrefix/);
  assert.match(postQueries, /queryPublicArticleSummaries[\s\S]*select\(publicArticleSummarySelection\)/);
});

test("public search bounds plain-text summaries and converts raw D1 seconds", () => {
  const unsafe = '<img src=x onerror=pwn()> **Read [this](javascript:pwn())**\u0000 ' + "x".repeat(300);
  const summary = sanitizePublicSearchSummary(unsafe);
  assert.doesNotMatch(summary, /<img|onerror|javascript:|\u0000|\*\*/i);
  assert.ok(Array.from(summary).length <= 240);
  assert.match(summary, /…$/);
  assert.equal(
    dateFromD1UnixSeconds(1_700_000_000)?.toISOString(),
    "2023-11-14T22:13:20.000Z",
  );
});

test("public search accepts only the two Astro collections", () => {
  assert.equal(parsePublicSearchCollection("blog"), "blog");
  assert.equal(parsePublicSearchCollection("changelog"), "changelog");
  assert.equal(parsePublicSearchCollection("tool"), null);
  assert.equal(parsePublicSearchCollection(null), null);
});

test("every anonymous consumer uses the guarded public query surface", () => {
  const read = (file: string) => readFileSync(path.join(root, file), "utf8");
  const blogIndex = read("app/(site)/blog/page.tsx");
  const blogDetail = read("app/(site)/blog/[...slug]/page.tsx");
  const publicPosts = read("app/api/public/posts/route.ts");
  const publicPost = read("app/api/public/posts/[slug]/route.ts");
  const searchIndex = read("app/(site)/search-index.json/route.ts");
  const header = read("components/site/site-header.tsx");
  const resourceQueries = read("modules/resources/application/queries.ts");
  const resourceRepository = read(
    "modules/resources/infrastructure/resource-repository.ts"
  );

  assert.match(blogIndex, /getPublicContentSnapshot/);
  assert.match(blogIndex, /dynamic = "force-static"/);
  assert.doesNotMatch(blogIndex, /getPublicPostSummariesWithCategoryPath|getPublished|@\/lib\/db/);
  assert.match(blogDetail, /getPublicPostSummariesWithCategoryPath/);
  assert.match(blogDetail, /getPublicResource/);
  assert.match(blogDetail, /getPublicPostSummaryBySlug[\s\S]*allowUnlisted:/);
  assert.match(blogDetail, /generateStaticParams/);
  assert.match(blogDetail, /dynamicParams = true/);
  assert.match(blogDetail, /getSnapshotArticle/);
  const metadataBody = blogDetail.slice(
    blogDetail.indexOf("export async function generateMetadata"),
    blogDetail.indexOf("export default async function ArticlePage"),
  );
  assert.match(metadataBody, /articleForPath/);
  assert.doesNotMatch(metadataBody, /\bgetPublicPostBySlug\(/);
  assert.equal([...blogDetail.matchAll(/\bgetPublicPostBySlug\(/g)].length, 0);
  assert.match(blogDetail, /initialContent:\s*resource\.content/);
  assert.match(blogDetail, /getBuildOnlyPublicContent/);
  assert.doesNotMatch(blogIndex + blogDetail, /\bgetPostsWithCategoryPath\b/);
  assert.match(publicPosts, /getPublicPostsWithCategoryPath/);
  assert.match(publicPosts, /getPublicPostsCount/);
  assert.match(publicPost, /getPublicPostBySlug[\s\S]*allowUnlisted:\s*true/);
  assert.match(searchIndex, /buildSnapshotSearchIndexJson/);
  assert.match(searchIndex, /dynamic = "force-static"/);
  assert.doesNotMatch(searchIndex, /getPublicPost|getPublishedResource|@\/lib\/db|env\.DB/);
  assert.match(header, /collection:\s*selectedTab/);
  assert.match(header, /\[query, selectedTab\]/);
  assert.match(resourceQueries, /resourceAllowed[\s\S]*revisionAllowed/);
  assert.match(resourceRepository, /listPublicResourceRoutes[\s\S]*resourceRevisions\.visibility/);
  assert.match(resourceRepository, /countPublishedResources[\s\S]*resourceRevisions\.visibility/);
});

test("publishing a moved resource never overwrites another route owner", () => {
  const repository = readFileSync(
    path.join(root, "modules/resources/infrastructure/resource-repository.ts"),
    "utf8",
  );
  const publish = repository.slice(
    repository.indexOf("export async function publishCurrentRevision"),
    repository.indexOf("type ResourceGroupPublicationInput"),
  );
  const routeInsert = publish.slice(
    publish.indexOf(".insert(resourceRoutes)"),
    publish.indexOf(".insert(redirects)"),
  );
  assert.match(publish, /Never upsert ownership/);
  assert.match(publish, /(?:db|database)\s*\.insert\(resourceRoutes\)/);
  assert.doesNotMatch(routeInsert, /onConflictDoUpdate/);
});
