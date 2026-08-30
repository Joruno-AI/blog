import assert from "node:assert/strict";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import test from "node:test";

import { drizzle } from "drizzle-orm/d1";

import * as schema from "@/lib/db/schema";
import { runScheduledPublications } from "@/modules/jobs/application/scheduled-publication";
import {
  archiveResources,
  insertRevisionAndSelectIt,
  publishCurrentRevision,
} from "@/modules/resources/infrastructure/resource-repository";

type D1LikeResult = {
  success: true;
  results: Record<string, unknown>[];
  meta: { changes: number };
};

class SQLiteD1Statement {
  constructor(
    private readonly owner: SQLiteD1Database,
    readonly source: string,
    readonly parameters: SQLInputValue[] = [],
  ) {}

  bind(...parameters: SQLInputValue[]) {
    return new SQLiteD1Statement(this.owner, this.source, parameters);
  }

  async all() {
    const results = this.owner.database
      .prepare(this.source)
      .all(...this.parameters) as Record<string, unknown>[];
    const afterAll = this.owner.afterAll;
    this.owner.afterAll = null;
    afterAll?.(this.source, results);
    return { success: true, results, meta: { changes: 0 } } satisfies D1LikeResult;
  }

  async raw() {
    const statement = this.owner.database.prepare(this.source);
    statement.setReturnArrays(true);
    const results = statement.all(...this.parameters) as unknown as unknown[][];
    const afterAll = this.owner.afterAll;
    this.owner.afterAll = null;
    afterAll?.(this.source, []);
    return results;
  }

  async run() {
    const result = this.owner.database
      .prepare(this.source)
      .run(...this.parameters);
    return {
      success: true,
      results: [],
      meta: { changes: Number(result.changes) },
    } satisfies D1LikeResult;
  }
}

class SQLiteD1Database {
  afterAll: ((source: string, rows: Record<string, unknown>[]) => void) | null = null;
  failStatementMatching: RegExp | null = null;
  throwAfterCommittedBatchMatching: RegExp | null = null;

  constructor(readonly database: DatabaseSync) {}

  prepare(source: string) {
    return new SQLiteD1Statement(this, source);
  }

  async batch(statements: SQLiteD1Statement[]) {
    for (const statement of statements) {
      assert.ok(
        statement.parameters.length <= 100,
        `D1 statement exceeded 100 bindings: ${statement.parameters.length}`,
      );
    }

    this.database.exec("BEGIN IMMEDIATE");
    try {
      const results: D1LikeResult[] = [];
      for (const statement of statements) {
        if (this.failStatementMatching?.test(statement.source)) {
          this.failStatementMatching = null;
          throw new Error("simulated FTS statement failure");
        }
        results.push(await statement.run());
      }
      this.database.exec("COMMIT");
      const uncertain = this.throwAfterCommittedBatchMatching;
      this.throwAfterCommittedBatchMatching = null;
      if (uncertain && statements.some((statement) => uncertain.test(statement.source))) {
        throw new Error("simulated committed FTS response failure");
      }
      return results;
    } catch (error) {
      if (this.database.isTransaction) this.database.exec("ROLLBACK");
      throw error;
    }
  }
}

const STARTED_AT = new Date("2026-08-30T10:00:00.000Z");
const DUE_AT_SECONDS = Math.floor(STARTED_AT.getTime() / 1_000) - 60;

function schedulerFixture() {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(`
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
      created_at INTEGER NOT NULL
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

    INSERT INTO resources (
      id, type, title, slug, path, description, status, visibility,
      current_revision_id, published_revision_id, published_at, scheduled_at,
      created_at, updated_at
    ) VALUES (
      'scheduled', 'document', 'Scheduled', 'scheduled', '/blog/scheduled',
      'description', 'scheduled', 'public', 'revision:1', NULL, NULL,
      ${DUE_AT_SECONDS}, 1, 1
    );
    INSERT INTO resource_revisions (
      id, resource_id, version, title, slug, path, description, visibility,
      content, content_format, metadata_json, created_at
    ) VALUES (
      'revision:1', 'scheduled', 1, 'Scheduled', 'scheduled',
      '/blog/scheduled', 'description', 'public', 'body', 'markdown',
      '{"categoryId":null,"tagIds":[],"toc":true,"share":true,"giscus":true,"search":true,"minutesRead":null}', 1
    );
    INSERT INTO resource_routes (path, resource_id, canonical, created_at)
    VALUES ('/blog/scheduled', 'scheduled', 1, 1);
  `);

  const d1 = new SQLiteD1Database(sqlite);
  const database = drizzle(d1 as never, { schema });
  const now = () => new Date(STARTED_AT);
  return { sqlite, d1, database, now };
}

function lifecycle(sqlite: DatabaseSync) {
  return sqlite.prepare(`
    SELECT status, current_revision_id AS currentRevisionId,
           published_revision_id AS publishedRevisionId,
           scheduled_at AS scheduledAt
    FROM resources WHERE id = 'scheduled'
  `).get();
}

test("a due scan cannot publish or reset a resource archived before its lifecycle CAS", async () => {
  const { sqlite, d1, database, now } = schedulerFixture();
  d1.afterAll = () => {
    sqlite.prepare(`
      UPDATE resources
      SET status = 'archived', scheduled_at = NULL, updated_at = 2
      WHERE id = 'scheduled'
    `).run();
  };

  const result = await runScheduledPublications(25, { database, now });

  assert.deepEqual(result.published, []);
  assert.equal(result.skipped.length, 1);
  assert.deepEqual(result.failed, []);
  assert.deepEqual({ ...lifecycle(sqlite) }, {
    status: "archived",
    currentRevisionId: "revision:1",
    publishedRevisionId: null,
    scheduledAt: null,
  });
  assert.equal(sqlite.prepare("SELECT count(*) AS count FROM publication_events").get()?.count, 0);
});

test("a due scan preserves a user reschedule instead of publishing or applying retry state", async () => {
  const { sqlite, d1, database, now } = schedulerFixture();
  const rescheduledAt = Math.floor(STARTED_AT.getTime() / 1_000) + 3_600;
  d1.afterAll = () => {
    sqlite.prepare(`
      UPDATE resources SET scheduled_at = ?, updated_at = 2 WHERE id = 'scheduled'
    `).run(rescheduledAt);
  };

  const result = await runScheduledPublications(25, { database, now });

  assert.deepEqual(result.published, []);
  assert.equal(result.skipped.length, 1);
  assert.deepEqual(result.failed, []);
  assert.equal(lifecycle(sqlite)?.scheduledAt, rescheduledAt);
  assert.equal(lifecycle(sqlite)?.status, "scheduled");
  assert.equal(sqlite.prepare("SELECT count(*) AS count FROM publication_events").get()?.count, 0);
});

test("a revision saved after the due scan is never substituted for the frozen scheduled revision", async () => {
  const { sqlite, d1, database, now } = schedulerFixture();
  d1.afterAll = () => {
    sqlite.exec(`
      INSERT INTO resource_revisions (
        id, resource_id, version, title, slug, path, description, visibility,
        content, content_format, metadata_json, created_at
      ) VALUES (
        'revision:2', 'scheduled', 2, 'New draft', 'new-draft',
        '/blog/new-draft', NULL, 'public', 'new body', 'markdown', '{}', 2
      );
      UPDATE resources
      SET current_revision_id = 'revision:2', updated_at = 2
      WHERE id = 'scheduled';
    `);
  };

  const result = await runScheduledPublications(25, { database, now });

  assert.deepEqual(result.published, []);
  assert.equal(result.skipped.length, 1);
  assert.deepEqual(result.failed, []);
  assert.deepEqual({ ...lifecycle(sqlite) }, {
    status: "scheduled",
    currentRevisionId: "revision:2",
    publishedRevisionId: null,
    scheduledAt: DUE_AT_SECONDS,
  });
  assert.equal(sqlite.prepare("SELECT count(*) AS count FROM publication_events").get()?.count, 0);
});

test("saving a new draft atomically invalidates the old revision schedule before cron can scan it", async () => {
  const { sqlite, database, now } = schedulerFixture();

  await insertRevisionAndSelectIt({
    resourceId: "scheduled",
    expectedCurrentRevisionId: "revision:1",
    revision: {
      id: "revision:2",
      resourceId: "scheduled",
      version: 2,
      title: "Unscheduled draft",
      slug: "unscheduled-draft",
      path: "/blog/unscheduled-draft",
      description: null,
      visibility: "public",
      content: "new body",
      contentFormat: "markdown",
      metadataJson: "{}",
      createdAt: STARTED_AT,
    },
  }, database);

  assert.deepEqual({ ...lifecycle(sqlite) }, {
    status: "draft",
    currentRevisionId: "revision:2",
    publishedRevisionId: null,
    scheduledAt: null,
  });
  const result = await runScheduledPublications(25, { database, now });
  assert.equal(result.scanned, 0);
  assert.deepEqual(result.published, []);
});

test("saving over a published resource cancels its pending schedule without hiding the published snapshot", async () => {
  const { sqlite, database } = schedulerFixture();
  sqlite.prepare(`
    UPDATE resources
    SET status = 'published', published_revision_id = 'revision:1', published_at = 1
    WHERE id = 'scheduled'
  `).run();

  await insertRevisionAndSelectIt({
    resourceId: "scheduled",
    expectedCurrentRevisionId: "revision:1",
    revision: {
      id: "revision:2",
      resourceId: "scheduled",
      version: 2,
      title: "Private draft",
      slug: "private-draft",
      path: "/blog/private-draft",
      description: null,
      visibility: "public",
      content: "new body",
      contentFormat: "markdown",
      metadataJson: "{}",
      createdAt: STARTED_AT,
    },
  }, database);

  assert.deepEqual({ ...lifecycle(sqlite) }, {
    status: "published",
    currentRevisionId: "revision:2",
    publishedRevisionId: "revision:1",
    scheduledAt: null,
  });
});

test("an FTS write failure rolls publication back before a guarded retry is scheduled", async () => {
  const { sqlite, d1, database, now } = schedulerFixture();
  d1.failStatementMatching = /insert into ["`]resource_search["`]/i;

  const result = await runScheduledPublications(25, { database, now });

  assert.deepEqual(result.published, []);
  assert.equal(result.failed.length, 1);
  assert.match(result.failed[0]!.error, /FTS statement failure/);
  const resource = lifecycle(sqlite);
  assert.equal(resource?.status, "scheduled");
  assert.equal(resource?.publishedRevisionId, null);
  assert.ok(Number(resource?.scheduledAt) > Math.floor(STARTED_AT.getTime() / 1_000));
  assert.equal(sqlite.prepare("SELECT count(*) AS count FROM publication_events").get()?.count, 0);
  assert.equal(sqlite.prepare("SELECT count(*) AS count FROM resource_search").get()?.count, 0);
});

test("a post-commit publication error cannot restore the consumed schedule", async () => {
  const { sqlite, d1, database, now } = schedulerFixture();
  d1.throwAfterCommittedBatchMatching = /insert into ["`]resource_search["`]/i;

  const result = await runScheduledPublications(25, { database, now });

  assert.deepEqual(result.published, []);
  assert.equal(result.failed.length, 1);
  assert.match(result.failed[0]!.error, /committed FTS response failure/);
  assert.deepEqual({ ...lifecycle(sqlite) }, {
    status: "published",
    currentRevisionId: "revision:1",
    publishedRevisionId: "revision:1",
    scheduledAt: null,
  });
  assert.equal(sqlite.prepare("SELECT count(*) AS count FROM publication_events").get()?.count, 1);
  assert.equal(sqlite.prepare("SELECT count(*) AS count FROM resource_search").get()?.count, 1);
});

test("archiving clears a pending schedule in the same lifecycle transaction", async () => {
  const { sqlite, database } = schedulerFixture();

  await archiveResources(["scheduled"], null, {}, database);

  assert.equal(lifecycle(sqlite)?.status, "archived");
  assert.equal(lifecycle(sqlite)?.scheduledAt, null);
});

test("an archived resource cannot be revived by an ordinary publication command", async () => {
  const { sqlite, database } = schedulerFixture();
  await archiveResources(["scheduled"], null, {}, database);

  await assert.rejects(
    () => publishCurrentRevision({ resourceId: "scheduled" }, database),
    /is archived/,
  );

  assert.equal(lifecycle(sqlite)?.status, "archived");
  assert.equal(lifecycle(sqlite)?.publishedRevisionId, null);
  assert.equal(sqlite.prepare("SELECT count(*) AS count FROM resource_search").get()?.count, 0);
});
