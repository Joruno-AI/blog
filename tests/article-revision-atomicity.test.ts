import assert from "node:assert/strict";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import test from "node:test";

import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";

import { db as productionDatabase } from "@/lib/db";
import { publishedArticleProjection } from "@/lib/db/queries/posts";
import * as schema from "@/lib/db/schema";
import {
  articleProjectionGuard,
  articleProjectionMetadata,
  articleProjectionWriteStatements,
  articlePublishedPointerGuard,
  articleRevisionMetadataGuard,
  freezeLegacyPublishedArticleStatement,
  parseArticleMetadata,
  prepareArticlePublicationTransaction,
  readArticleProjection,
  type ArticleProjection,
} from "@/modules/articles/infrastructure/article-projection";
import {
  insertRevisionAndSelectIt,
  publishCurrentRevision,
  scheduleCurrentRevision,
  type ResourceLifecycleSnapshot,
} from "@/modules/resources/infrastructure/resource-repository";
import { runScheduledPublications } from "@/modules/jobs/application/scheduled-publication";

type D1LikeResult = {
  success: true;
  results: Record<string, unknown>[];
  meta: { changes: number };
};

class SQLiteD1Statement {
  constructor(
    private readonly database: DatabaseSync,
    readonly source: string,
    readonly parameters: SQLInputValue[] = [],
  ) {}

  bind(...parameters: SQLInputValue[]) {
    return new SQLiteD1Statement(this.database, this.source, parameters);
  }

  async all() {
    const results = this.database.prepare(this.source).all(...this.parameters);
    return { success: true, results, meta: { changes: 0 } } satisfies D1LikeResult;
  }

  async raw() {
    const statement = this.database.prepare(this.source);
    statement.setReturnArrays(true);
    return statement.all(...this.parameters) as unknown as unknown[][];
  }

  async run() {
    const result = this.database.prepare(this.source).run(...this.parameters);
    return {
      success: true,
      results: [],
      meta: { changes: Number(result.changes) },
    } satisfies D1LikeResult;
  }
}

class SQLiteD1Database {
  beforeBatch: (() => void) | null = null;

  constructor(readonly database: DatabaseSync) {}

  prepare(source: string) {
    return new SQLiteD1Statement(this.database, source);
  }

  async batch(statements: SQLiteD1Statement[]) {
    for (const statement of statements) {
      assert.ok(
        statement.parameters.length <= 100,
        `D1 statement exceeded 100 bindings: ${statement.parameters.length}`,
      );
    }
    const beforeBatch = this.beforeBatch;
    this.beforeBatch = null;
    beforeBatch?.();
    this.database.exec("BEGIN IMMEDIATE");
    try {
      const results: D1LikeResult[] = [];
      for (const statement of statements) results.push(await statement.run());
      this.database.exec("COMMIT");
      return results;
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }
}

const OLD_PROJECTION: ArticleProjection = {
  categoryId: "category:old",
  tagIds: ["tag:old"],
  toc: true,
  share: true,
  giscus: true,
  search: true,
  minutesRead: 3,
};

const NEW_PROJECTION: ArticleProjection = {
  categoryId: "category:new",
  tagIds: ["tag:new"],
  toc: false,
  share: false,
  giscus: false,
  search: false,
  minutesRead: 9,
};

function articleFixture(options: { legacyPublishedMetadata?: boolean } = {}) {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE resources (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      slug TEXT NOT NULL,
      path TEXT NOT NULL UNIQUE,
      description TEXT,
      status TEXT NOT NULL,
      visibility TEXT NOT NULL,
      cover_asset_id TEXT,
      current_revision_id TEXT,
      published_revision_id TEXT,
      author_id TEXT,
      published_at INTEGER,
      scheduled_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE resource_revisions (
      id TEXT PRIMARY KEY,
      resource_id TEXT NOT NULL,
      version INTEGER NOT NULL,
      title TEXT NOT NULL,
      slug TEXT NOT NULL,
      path TEXT NOT NULL,
      description TEXT,
      visibility TEXT NOT NULL,
      content TEXT NOT NULL,
      content_format TEXT NOT NULL,
      metadata_json TEXT NOT NULL,
      source_hash TEXT,
      change_summary TEXT,
      created_by TEXT,
      created_at INTEGER NOT NULL,
      UNIQUE(resource_id, version),
      FOREIGN KEY(resource_id) REFERENCES resources(id) ON DELETE CASCADE
    );
    CREATE TABLE articles (
      resource_id TEXT PRIMARY KEY,
      toc INTEGER NOT NULL DEFAULT 1,
      share INTEGER NOT NULL DEFAULT 1,
      giscus INTEGER NOT NULL DEFAULT 1,
      searchable INTEGER NOT NULL DEFAULT 1,
      reading_minutes REAL,
      FOREIGN KEY(resource_id) REFERENCES resources(id) ON DELETE CASCADE
    );
    CREATE TABLE categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      description TEXT,
      parent_id TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE tags (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      description TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE resource_categories (
      resource_id TEXT NOT NULL,
      category_id TEXT NOT NULL,
      PRIMARY KEY(resource_id, category_id),
      FOREIGN KEY(resource_id) REFERENCES resources(id) ON DELETE CASCADE,
      FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE CASCADE
    );
    CREATE TABLE resource_tags (
      resource_id TEXT NOT NULL,
      tag_id TEXT NOT NULL,
      PRIMARY KEY(resource_id, tag_id),
      FOREIGN KEY(resource_id) REFERENCES resources(id) ON DELETE CASCADE,
      FOREIGN KEY(tag_id) REFERENCES tags(id) ON DELETE CASCADE
    );
    CREATE TABLE resource_routes (
      path TEXT PRIMARY KEY,
      resource_id TEXT NOT NULL,
      canonical INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE redirects (
      from_path TEXT PRIMARY KEY,
      to_path TEXT NOT NULL,
      status_code INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE publication_events (
      id TEXT PRIMARY KEY,
      resource_id TEXT NOT NULL,
      revision_id TEXT,
      event_type TEXT NOT NULL,
      actor_id TEXT,
      data_json TEXT NOT NULL DEFAULT '{}',
      created_at INTEGER NOT NULL
    );
    CREATE TABLE platform_jobs (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      status TEXT NOT NULL,
      resource_id TEXT,
      progress INTEGER NOT NULL,
      attempts INTEGER NOT NULL,
      max_attempts INTEGER NOT NULL,
      input_json TEXT NOT NULL,
      output_json TEXT,
      error TEXT,
      started_at INTEGER,
      completed_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE VIRTUAL TABLE resource_search USING fts5(
      resource_id UNINDEXED,
      title,
      description,
      content,
      tokens
    );
  `);

  for (const id of ["category:old", "category:new"]) {
    sqlite.prepare(`
      INSERT INTO categories (id, name, slug, created_at, updated_at)
      VALUES (?, ?, ?, 1, 1)
    `).run(id, id, id);
  }
  for (const id of ["tag:old", "tag:new"]) {
    sqlite.prepare(`
      INSERT INTO tags (id, name, slug, created_at, updated_at)
      VALUES (?, ?, ?, 1, 1)
    `).run(id, id, id);
  }
  sqlite.exec(`
    INSERT INTO resources (
      id, type, title, slug, path, status, visibility,
      current_revision_id, published_revision_id, published_at, created_at, updated_at
    ) VALUES (
      'article:1', 'article', 'Old title', 'old', '/blog/old', 'published', 'public',
      'revision:old', 'revision:old', 1, 1, 1
    );
    INSERT INTO resource_routes (path, resource_id, canonical, created_at)
    VALUES ('/blog/old', 'article:1', 1, 1);
    INSERT INTO articles (resource_id, toc, share, giscus, searchable, reading_minutes)
    VALUES ('article:1', 1, 1, 1, 1, 3);
    INSERT INTO resource_categories (resource_id, category_id)
    VALUES ('article:1', 'category:old');
    INSERT INTO resource_tags (resource_id, tag_id)
    VALUES ('article:1', 'tag:old');
  `);
  const oldMetadata = options.legacyPublishedMetadata
    ? JSON.stringify({ subtitle: "legacy" })
    : JSON.stringify(articleProjectionMetadata({ subtitle: "old" }, OLD_PROJECTION));
  sqlite.prepare(`
    INSERT INTO resource_revisions (
      id, resource_id, version, title, slug, path, description, visibility,
      content, content_format, metadata_json, source_hash, created_at
    ) VALUES (
      'revision:old', 'article:1', 1, 'Old title', 'old', '/blog/old',
      'Old excerpt', 'public', 'old body', 'markdown', ?, 'old-hash', 1
    )
  `).run(oldMetadata);
  sqlite.prepare(`
    INSERT INTO resource_search (resource_id, title, description, content, tokens)
    VALUES ('article:1', 'Old title', 'Old excerpt', 'old body', 'old title')
  `).run();

  const d1 = new SQLiteD1Database(sqlite);
  const database = drizzle(d1 as never, { schema }) as typeof productionDatabase;
  return { sqlite, d1, database };
}

async function saveNewDraft(
  fixture: ReturnType<typeof articleFixture>,
  beforeBatch?: () => void,
) {
  const { database, d1 } = fixture;
  const oldProjection = await readArticleProjection("article:1", database);
  const [published] = await database
    .select({ metadataJson: schema.resourceRevisions.metadataJson })
    .from(schema.resourceRevisions)
    .where(eq(schema.resourceRevisions.id, "revision:old"))
    .limit(1);
  assert.ok(published);
  const freeze = freezeLegacyPublishedArticleStatement({
    revisionId: "revision:old",
    metadataJson: published.metadataJson,
    projection: oldProjection,
  }, database);
  if (beforeBatch) d1.beforeBatch = beforeBatch;

  await insertRevisionAndSelectIt({
    resourceId: "article:1",
    expectedCurrentRevisionId: "revision:old",
    revision: {
      id: "revision:new",
      resourceId: "article:1",
      version: 2,
      title: "New title",
      slug: "new",
      path: "/blog/new",
      description: "New excerpt",
      visibility: "public",
      content: "new body",
      contentFormat: "markdown",
      metadataJson: JSON.stringify(
        articleProjectionMetadata({ subtitle: "new" }, NEW_PROJECTION),
      ),
      sourceHash: "new-hash",
      changeSummary: "test",
      createdAt: new Date(2_000),
    },
    guardStatements: [
      articlePublishedPointerGuard("article:1", "revision:old", database),
      articleRevisionMetadataGuard("revision:old", published.metadataJson, database),
      articleProjectionGuard("article:1", oldProjection, database),
    ],
    additionalStatements: [
      ...(freeze ? [freeze] : []),
      ...articleProjectionWriteStatements("article:1", NEW_PROJECTION, database),
    ],
  }, database);
}

test("saving a new draft freezes a legacy published projection and cannot leak draft side fields", async () => {
  const fixture = articleFixture({ legacyPublishedMetadata: true });
  await saveNewDraft(fixture);

  const resource = fixture.sqlite.prepare(`
    SELECT status, current_revision_id AS currentRevisionId,
      published_revision_id AS publishedRevisionId
    FROM resources WHERE id = 'article:1'
  `).get();
  assert.deepEqual({ ...resource }, {
    status: "published",
    currentRevisionId: "revision:new",
    publishedRevisionId: "revision:old",
  });
  assert.deepEqual(
    await readArticleProjection("article:1", fixture.database),
    NEW_PROJECTION,
  );

  const publishedMetadataJson = fixture.sqlite.prepare(`
    SELECT rr.metadata_json AS metadataJson
    FROM resources r
    JOIN resource_revisions rr ON rr.id = r.published_revision_id
    WHERE r.id = 'article:1'
  `).get()?.metadataJson;
  assert.equal(typeof publishedMetadataJson, "string");
  const publicProjection = publishedArticleProjection(
    parseArticleMetadata(String(publishedMetadataJson)),
  );
  assert.deepEqual(publicProjection, OLD_PROJECTION);
  assert.notDeepEqual(publicProjection, NEW_PROJECTION);
});

test("a concurrent side-projection mutation aborts the revision CAS batch", async () => {
  const fixture = articleFixture();
  await assert.rejects(
    () => saveNewDraft(fixture, () => {
      fixture.sqlite.prepare(`
        UPDATE articles SET toc = 0 WHERE resource_id = 'article:1'
      `).run();
    }),
    /changed while its revision was being saved/i,
  );
  assert.equal(
    fixture.sqlite.prepare(`
      SELECT current_revision_id AS revisionId FROM resources WHERE id = 'article:1'
    `).get()?.revisionId,
    "revision:old",
  );
  assert.equal(
    fixture.sqlite.prepare(`
      SELECT count(*) AS total FROM resource_revisions WHERE id = 'revision:new'
    `).get()?.total,
    0,
  );
});

test("publication atomically switches to the saved revision and its immutable projection", async () => {
  const fixture = articleFixture();
  await saveNewDraft(fixture);
  const prepared = await prepareArticlePublicationTransaction(
    "article:1",
    "revision:new",
    fixture.database,
  );
  assert.ok(prepared);
  await publishCurrentRevision({
    resourceId: "article:1",
    expectedCurrentRevisionId: prepared.expectedCurrentRevisionId,
    guardStatements: prepared.guardStatements,
    additionalStatements: prepared.additionalStatements,
    publishedAt: new Date(3_000),
  }, fixture.database);

  const resource = fixture.sqlite.prepare(`
    SELECT status, published_revision_id AS publishedRevisionId,
      scheduled_at AS scheduledAt
    FROM resources WHERE id = 'article:1'
  `).get();
  assert.deepEqual({ ...resource }, {
    status: "published",
    publishedRevisionId: "revision:new",
    scheduledAt: null,
  });
  const metadataJson = fixture.sqlite.prepare(`
    SELECT metadata_json AS metadataJson
    FROM resource_revisions WHERE id = 'revision:new'
  `).get()?.metadataJson;
  assert.deepEqual(
    publishedArticleProjection(parseArticleMetadata(String(metadataJson))),
    NEW_PROJECTION,
  );
  assert.equal(
    fixture.sqlite.prepare(`
      SELECT count(*) AS total FROM resource_search WHERE resource_id = 'article:1'
    `).get()?.total,
    0,
    "search=false must switch the FTS projection in the same transaction",
  );
});

test("scheduled publication retains the frozen article revision and projection", async () => {
  const fixture = articleFixture();
  await saveNewDraft(fixture);
  const scheduledAt = new Date(Math.ceil((Date.now() + 60_000) / 1_000) * 1_000);
  const scheduled = await scheduleCurrentRevision({
    resourceId: "article:1",
    scheduledAt,
    expectedCurrentRevisionId: "revision:new",
  }, fixture.database);
  assert.ok(scheduled);

  const prepared = await prepareArticlePublicationTransaction(
    "article:1",
    "revision:new",
    fixture.database,
  );
  assert.ok(prepared);
  await publishCurrentRevision({
    resourceId: "article:1",
    expectedLifecycle: scheduled as ResourceLifecycleSnapshot,
    expectedCurrentRevisionId: prepared.expectedCurrentRevisionId,
    guardStatements: prepared.guardStatements,
    additionalStatements: prepared.additionalStatements,
    publishedAt: new Date(),
  }, fixture.database);

  const resource = fixture.sqlite.prepare(`
    SELECT published_revision_id AS publishedRevisionId, scheduled_at AS scheduledAt
    FROM resources WHERE id = 'article:1'
  `).get();
  assert.deepEqual({ ...resource }, {
    publishedRevisionId: "revision:new",
    scheduledAt: null,
  });
});

test("the real scheduler freezes a legacy article projection before publication", async () => {
  const fixture = articleFixture({ legacyPublishedMetadata: true });
  const now = new Date("2026-08-30T10:00:00.000Z");
  const dueAt = Math.floor(now.getTime() / 1_000) - 60;
  fixture.sqlite.prepare(`
    UPDATE resources
    SET status = 'scheduled', published_revision_id = NULL,
        published_at = NULL, scheduled_at = ?
    WHERE id = 'article:1'
  `).run(dueAt);
  fixture.sqlite.prepare(`
    UPDATE articles SET searchable = 0 WHERE resource_id = 'article:1'
  `).run();
  fixture.sqlite.prepare(`
    DELETE FROM resource_search WHERE resource_id = 'article:1'
  `).run();

  const result = await runScheduledPublications(25, {
    database: fixture.database,
    now: () => new Date(now),
  });

  assert.deepEqual(result.published, ["article:1"]);
  assert.deepEqual(result.skipped, []);
  assert.deepEqual(result.failed, []);
  const resource = fixture.sqlite.prepare(`
    SELECT status, published_revision_id AS publishedRevisionId,
      scheduled_at AS scheduledAt
    FROM resources WHERE id = 'article:1'
  `).get();
  assert.deepEqual({ ...resource }, {
    status: "published",
    publishedRevisionId: "revision:old",
    scheduledAt: null,
  });
  const metadataJson = fixture.sqlite.prepare(`
    SELECT metadata_json AS metadataJson
    FROM resource_revisions WHERE id = 'revision:old'
  `).get()?.metadataJson;
  assert.deepEqual(
    publishedArticleProjection(parseArticleMetadata(String(metadataJson))),
    { ...OLD_PROJECTION, search: false },
  );
  assert.equal(
    fixture.sqlite.prepare(`
      SELECT count(*) AS total FROM resource_search WHERE resource_id = 'article:1'
    `).get()?.total,
    0,
  );
});
