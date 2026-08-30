import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import path from "node:path";
import test from "node:test";

import { drizzle } from "drizzle-orm/d1";

import * as schema from "@/lib/db/schema";
import {
  acknowledgePublicContentRebuildDeployment,
  createPublicContentRebuildOutboxStore,
  runPublicContentRebuildOutbox,
} from "@/modules/jobs/application/public-content-rebuild";

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
    const statement = this.owner.database.prepare(this.source);
    const results = statement.all(...this.parameters) as Record<string, unknown>[];
    return {
      success: true,
      results,
      meta: { changes: Number(this.owner.database.prepare("SELECT changes() AS value").get()?.value ?? 0) },
    } satisfies D1LikeResult;
  }

  async raw() {
    const statement = this.owner.database.prepare(this.source);
    statement.setReturnArrays(true);
    return statement.all(...this.parameters) as unknown as unknown[][];
  }

  async run() {
    const result = this.owner.database.prepare(this.source).run(...this.parameters);
    return {
      success: true,
      results: [],
      meta: { changes: Number(result.changes) },
    } satisfies D1LikeResult;
  }
}

class SQLiteD1Database {
  constructor(readonly database: DatabaseSync) {}

  prepare(source: string) {
    return new SQLiteD1Statement(this, source);
  }

  async batch(statements: SQLiteD1Statement[]) {
    this.database.exec("BEGIN IMMEDIATE");
    try {
      const results = [];
      for (const statement of statements) results.push(await statement.run());
      this.database.exec("COMMIT");
      return results;
    } catch (error) {
      if (this.database.isTransaction) this.database.exec("ROLLBACK");
      throw error;
    }
  }
}

const expectedTriggerNames = [
  "public_content_assets_delete",
  "public_content_assets_update",
  "public_content_categories_delete",
  "public_content_categories_insert",
  "public_content_categories_update",
  "public_content_rebuild_signal_insert",
  "public_content_resource_albums_delete",
  "public_content_resource_albums_insert",
  "public_content_resource_albums_update",
  "public_content_resources_delete",
  "public_content_resources_insert",
  "public_content_resources_update",
  "public_content_revisions_delete",
  "public_content_revisions_update",
  "public_content_tags_delete",
  "public_content_tags_insert",
  "public_content_tags_update",
  "public_content_tracks_delete",
  "public_content_tracks_insert",
  "public_content_tracks_update",
];

function fixture() {
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
    CREATE TABLE categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      description TEXT,
      parent_id TEXT,
      "order" INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE tags (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE articles (
      resource_id TEXT PRIMARY KEY,
      toc INTEGER NOT NULL DEFAULT 1,
      share INTEGER NOT NULL DEFAULT 1,
      giscus INTEGER NOT NULL DEFAULT 1,
      searchable INTEGER NOT NULL DEFAULT 1,
      reading_minutes REAL
    );
    CREATE TABLE resource_categories (resource_id TEXT, category_id TEXT);
    CREATE TABLE resource_tags (resource_id TEXT, tag_id TEXT);
    CREATE TABLE resource_albums (
      resource_id TEXT PRIMARY KEY,
      artist TEXT NOT NULL,
      color TEXT,
      release_date INTEGER,
      sort_order INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE tracks (
      resource_id TEXT PRIMARY KEY,
      album_resource_id TEXT NOT NULL,
      audio_asset_id TEXT,
      external_url TEXT,
      source_type TEXT NOT NULL,
      duration TEXT,
      duration_seconds INTEGER,
      track_number INTEGER NOT NULL,
      lyrics TEXT
    );
    CREATE TABLE resource_assets (
      resource_id TEXT NOT NULL,
      asset_id TEXT NOT NULL,
      role TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE assets (
      id TEXT PRIMARY KEY,
      key TEXT NOT NULL,
      url TEXT NOT NULL,
      name TEXT NOT NULL,
      media_type TEXT NOT NULL,
      mime_type TEXT,
      size INTEGER NOT NULL,
      width INTEGER,
      height INTEGER,
      duration_seconds INTEGER,
      checksum TEXT,
      metadata_json TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);
  sqlite.exec(readFileSync(
    path.join(process.cwd(), "lib/db/d1/migrations/0010_public_content_rebuild_outbox.sql"),
    "utf8",
  ));
  const d1 = new SQLiteD1Database(sqlite);
  const database = drizzle(d1 as never, { schema });
  return { sqlite, database };
}

function sqlText(value: string) {
  return `'${value.replaceAll("'", "''")}'`;
}

function insertRevision(sqlite: DatabaseSync, input: {
  resourceId: string;
  path: string;
  visibility?: "public" | "private";
  metadata?: Record<string, unknown>;
  content?: string;
}) {
  const revisionId = `revision:${input.resourceId}`;
  sqlite.exec(`
    INSERT INTO resource_revisions (
      id, resource_id, version, title, slug, path, visibility, content,
      content_format, metadata_json, created_at
    ) VALUES (
      ${sqlText(revisionId)}, ${sqlText(input.resourceId)}, 1,
      ${sqlText(input.resourceId)}, ${sqlText(input.resourceId)}, ${sqlText(input.path)},
      ${sqlText(input.visibility ?? "public")}, ${sqlText(input.content ?? "body")},
      'markdown', ${sqlText(JSON.stringify(input.metadata ?? {}))}, 1
    )
  `);
  return revisionId;
}

function insertResource(sqlite: DatabaseSync, input: {
  id: string;
  type: string;
  path: string;
  status?: string;
  visibility?: "public" | "private";
  revisionVisibility?: "public" | "private";
  metadata?: Record<string, unknown>;
  coverAssetId?: string | null;
}) {
  const revisionId = insertRevision(sqlite, {
    resourceId: input.id,
    path: input.path,
    visibility: input.revisionVisibility,
    metadata: input.metadata,
  });
  sqlite.exec(`
    INSERT INTO resources (
      id, type, title, slug, path, status, visibility, cover_asset_id,
      current_revision_id, published_revision_id, published_at, created_at, updated_at
    ) VALUES (
      ${sqlText(input.id)}, ${sqlText(input.type)}, ${sqlText(input.id)},
      ${sqlText(input.id)}, ${sqlText(input.path)}, ${sqlText(input.status ?? "published")},
      ${sqlText(input.visibility ?? "public")},
      ${input.coverAssetId ? sqlText(input.coverAssetId) : "NULL"},
      ${sqlText(revisionId)}, ${sqlText(revisionId)}, 1, 1, 1
    )
  `);
  return revisionId;
}

function signal(sqlite: DatabaseSync, reason = "test-change") {
  sqlite.prepare(`
    INSERT INTO public_content_rebuild_signal (reason, resource_id)
    VALUES (?, NULL)
  `).run(reason);
}

function outbox(sqlite: DatabaseSync) {
  return sqlite.prepare(`
    SELECT generation,
           submitted_generation AS submittedGeneration,
           deployed_generation AS deployedGeneration,
           status, attempts,
           last_reason AS lastReason,
           last_resource_id AS lastResourceId
    FROM public_content_rebuild_outbox
    WHERE id = 'public-content'
  `).get();
}

test("production workflow is pinned, main-only, and acknowledges an exact repository_dispatch generation", () => {
  const workflow = readFileSync(path.join(process.cwd(), ".github/workflows/deploy.yml"), "utf8");
  const smoke = readFileSync(path.join(process.cwd(), "scripts/smoke-runtime.mjs"), "utf8");
  const packageJson = JSON.parse(readFileSync(path.join(process.cwd(), "package.json"), "utf8"));
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /repository_dispatch:[\s\S]*?- content-published/);
  assert.match(workflow, /cancel-in-progress:\s*true/);
  assert.match(workflow, /if: github\.ref == 'refs\/heads\/main'/);
  assert.match(workflow, /environment:\s*production/);
  assert.match(workflow, /actions\/checkout@11d5960a326750d5838078e36cf38b85af677262/);
  assert.match(workflow, /persist-credentials:\s*false/);
  assert.match(workflow, /pnpm\/action-setup@f40ffcd9367d9f12939873eb1018b921a783ffaa/);
  assert.match(workflow, /actions\/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020/);
  assert.match(workflow, /pnpm heroui:install:ci/);
  assert.doesNotMatch(workflow, /pnpm exec hpsetup|hpsetup@latest/);
  assert.equal(packageJson.devDependencies.hpsetup, "4.7.1");

  const orderedSteps = [
    "Lint, typecheck and test",
    "Apply D1 migrations",
    "Verify migrated D1 data",
    "Generate public projection from remote D1",
    "Build Cloudflare Worker with OpenNext",
    "Deploy Cloudflare Worker",
    "Smoke test deployed Worker",
    "Acknowledge deployed public projection",
  ];
  let previous = -1;
  for (const step of orderedSteps) {
    const index = workflow.indexOf(`- name: ${step}`);
    assert.ok(index > previous, `${step} must follow the previous production step`);
    previous = index;
  }
  assert.match(workflow, /GITHUB_EVENT_PATH/);
  assert.match(workflow, /client_payload\.generation/);
  assert.match(workflow, /api\/jobs\/public-content-rebuild\/ack/);
  assert.match(workflow, /CRON_SECRET: \$\{\{ secrets\.CRON_SECRET \}\}/);
  assert.match(workflow, /REQUIRE_PUBLIC_REBUILD_OUTBOX:\s*"true"/);
  assert.ok(
    workflow.indexOf("- name: Validate repository dispatch") < workflow.indexOf("- name: Checkout"),
    "repository_dispatch payloads must be rejected before setup, migration or deployment",
  );
  assert.match(workflow, /Validate repository dispatch[\s\S]*?client_payload\.source/);
  assert.match(workflow, /Validate repository dispatch[\s\S]*?client_payload\.generation/);
  assert.match(smoke, /process\.env\.CRON_SECRET/);
  assert.match(smoke, /rebuildState\.status === "failed"/);
  assert.match(smoke, /rebuildState\.status === "disabled"/);
});

test("migration installs exactly the public projection triggers", () => {
  const { sqlite } = fixture();
  const names = sqlite.prepare(`
    SELECT name FROM sqlite_schema
    WHERE type = 'trigger' AND name LIKE 'public_content_%'
    ORDER BY name
  `).all().map((row) => String(row.name));
  assert.deepEqual(names, expectedTriggerNames);
  const columns = sqlite.prepare("PRAGMA table_info('public_content_rebuild_outbox')")
    .all().map((row) => String(row.name));
  assert.ok(columns.includes("submitted_generation"));
  assert.ok(columns.includes("deployed_generation"));
  assert.ok(!columns.includes("dispatched_generation"));
});

test("D1 triggers follow only the visible public projection and preserve removals", () => {
  const { sqlite } = fixture();
  sqlite.exec(`
    INSERT INTO categories (id, name, slug, parent_id, "order", created_at) VALUES
      ('parent', 'Parent', 'parent', NULL, 0, 1),
      ('child', 'Child', 'child', 'parent', 0, 1),
      ('unused-category', 'Unused', 'unused', NULL, 0, 1);
    INSERT INTO tags (id, name, slug, created_at) VALUES
      ('used-tag', 'Used', 'used', 1),
      ('unused-tag', 'Unused', 'unused', 1);
  `);
  assert.equal(outbox(sqlite), undefined, "unused/unreferenced taxonomy is not public output");

  insertResource(sqlite, {
    id: "article",
    type: "article",
    path: "/blog/article",
    metadata: { categoryId: "child", tagIds: ["used-tag"] },
  });
  assert.equal(outbox(sqlite)?.generation, 1);

  sqlite.exec(`
    INSERT INTO articles (resource_id) VALUES ('article');
    UPDATE articles SET share = 0 WHERE resource_id = 'article';
    INSERT INTO resource_categories VALUES ('article', 'child');
    INSERT INTO resource_tags VALUES ('article', 'used-tag');
    INSERT INTO resource_assets VALUES ('article', 'unused-asset', 'body', 0);
    UPDATE resources SET title = 'not selected', updated_at = 99 WHERE id = 'article';
  `);
  assert.equal(outbox(sqlite)?.generation, 1, "normalized/draft-only fields are not generator inputs");

  const draftRevision = insertRevision(sqlite, {
    resourceId: "article-draft",
    path: "/blog/article-draft",
    content: "draft",
  });
  sqlite.exec(`
    UPDATE resources SET current_revision_id = ${sqlText(draftRevision)}, updated_at = 100
    WHERE id = 'article';
    UPDATE resource_revisions SET content = 'changed draft' WHERE id = ${sqlText(draftRevision)};
  `);
  assert.equal(outbox(sqlite)?.generation, 1, "draft revisions cannot pollute the public projection");

  sqlite.exec("UPDATE resource_revisions SET content = 'published change' WHERE id = 'revision:article'");
  assert.equal(outbox(sqlite)?.generation, 2);
  sqlite.exec("UPDATE categories SET name = 'Used parent' WHERE id = 'parent'");
  assert.equal(outbox(sqlite)?.generation, 3, "referenced category ancestors affect public paths");
  sqlite.exec("UPDATE categories SET name = 'Still unused' WHERE id = 'unused-category'");
  assert.equal(outbox(sqlite)?.generation, 3);
  sqlite.exec("UPDATE tags SET name = 'Used tag renamed' WHERE id = 'used-tag'");
  assert.equal(outbox(sqlite)?.generation, 4);
  sqlite.exec("UPDATE tags SET name = 'Still unused tag' WHERE id = 'unused-tag'");
  assert.equal(outbox(sqlite)?.generation, 4);

  sqlite.exec("UPDATE resources SET visibility = 'private' WHERE id = 'article'");
  assert.equal(outbox(sqlite)?.generation, 5, "public to private must remove the generated route");
  sqlite.exec("UPDATE resources SET visibility = 'public' WHERE id = 'article'");
  assert.equal(outbox(sqlite)?.generation, 6);
  sqlite.exec("UPDATE resources SET status = 'draft' WHERE id = 'article'");
  assert.equal(outbox(sqlite)?.generation, 7, "unpublish must remove the generated route");
  sqlite.exec("UPDATE resources SET status = 'published' WHERE id = 'article'");
  assert.equal(outbox(sqlite)?.generation, 8);

  sqlite.exec("BEGIN");
  sqlite.exec("UPDATE resource_revisions SET title = 'Rolled back' WHERE id = 'revision:article'");
  assert.equal(outbox(sqlite)?.generation, 9);
  sqlite.exec("ROLLBACK");
  assert.equal(outbox(sqlite)?.generation, 8, "outbox changes roll back with CMS writes");

  insertResource(sqlite, {
    id: "private",
    type: "article",
    path: "/blog/private",
    visibility: "private",
  });
  insertResource(sqlite, {
    id: "revision-private",
    type: "article",
    path: "/blog/revision-private",
    revisionVisibility: "private",
  });
  insertResource(sqlite, {
    id: "docs",
    type: "document",
    path: "/docs/read",
  });
  assert.equal(outbox(sqlite)?.generation, 8);

  for (const [id, type, resourcePath] of [
    ["short", "short", "/shorts/short"],
    ["project", "project", "/projects/project"],
    ["photo", "photo", "/photos/photo"],
    ["changelog", "document", "/changelog/100"],
    ["stream", "document", "/streams/stream"],
  ] as const) {
    insertResource(sqlite, { id, type, path: resourcePath });
  }
  assert.equal(outbox(sqlite)?.generation, 13);
});

test("asset triggers include only selected public album covers and track audio", () => {
  const { sqlite } = fixture();
  sqlite.exec(`
    INSERT INTO assets (id, key, url, name, media_type, size, metadata_json, created_at, updated_at)
    VALUES
      ('cover', 'cover', 'https://asset.example/cover-a.jpg', 'cover', 'image', 1, '{}', 1, 1),
      ('audio', 'audio', 'https://asset.example/audio-a.mp3', 'audio', 'audio', 1, '{}', 1, 1),
      ('unused', 'unused', 'https://asset.example/unused-a.jpg', 'unused', 'image', 1, '{}', 1, 1);
    INSERT INTO resource_albums (resource_id, artist) VALUES ('album', 'Artist');
  `);
  insertResource(sqlite, {
    id: "album",
    type: "album",
    path: "/music/albums/album",
    coverAssetId: "cover",
  });
  const afterAlbum = Number(outbox(sqlite)?.generation);
  assert.ok(afterAlbum >= 1);

  insertResource(sqlite, {
    id: "track",
    type: "track",
    path: "/music/tracks/track",
  });
  assert.equal(
    outbox(sqlite)?.generation,
    afterAlbum,
    "a track resource is not projected until its normalized track row exists",
  );
  sqlite.exec(`
    INSERT INTO tracks (
      resource_id, album_resource_id, audio_asset_id, source_type, track_number
    ) VALUES ('track', 'album', 'audio', 'upload', 1)
  `);
  const afterTrack = Number(outbox(sqlite)?.generation);
  assert.ok(afterTrack > afterAlbum);

  sqlite.exec("UPDATE assets SET name = 'not selected', updated_at = 2 WHERE id = 'cover'");
  sqlite.exec("UPDATE assets SET url = 'https://asset.example/unused-b.jpg', updated_at = 2 WHERE id = 'unused'");
  sqlite.exec("INSERT INTO resource_assets VALUES ('album', 'unused', 'gallery', 0)");
  assert.equal(outbox(sqlite)?.generation, afterTrack);

  sqlite.exec("UPDATE assets SET url = 'https://asset.example/cover-b.jpg' WHERE id = 'cover'");
  assert.equal(outbox(sqlite)?.generation, afterTrack + 1);
  sqlite.exec("UPDATE assets SET url = 'https://asset.example/audio-b.mp3' WHERE id = 'audio'");
  assert.equal(outbox(sqlite)?.generation, afterTrack + 2);
});

test("music triggers require the generator joins and only selected revision fields", () => {
  const { sqlite } = fixture();
  sqlite.exec("INSERT INTO resource_albums (resource_id, artist) VALUES ('album', 'Artist')");
  insertResource(sqlite, {
    id: "album",
    type: "album",
    path: "/music/albums/album",
    visibility: "private",
  });
  insertResource(sqlite, {
    id: "track",
    type: "track",
    path: "/music/tracks/track",
  });
  sqlite.exec(`
    INSERT INTO tracks (resource_id, album_resource_id, source_type, track_number)
    VALUES ('track', 'album', 'external', 1)
  `);
  sqlite.exec("UPDATE resource_revisions SET title = 'Hidden track' WHERE id = 'revision:track'");
  assert.equal(outbox(sqlite), undefined, "tracks under a private owning album are not generated");

  sqlite.exec("UPDATE resources SET visibility = 'public' WHERE id = 'album'");
  assert.equal(outbox(sqlite)?.generation, 1, "publishing the owning album adds album and track output");
  sqlite.exec("UPDATE resource_revisions SET slug = 'not-read-for-track' WHERE id = 'revision:track'");
  assert.equal(outbox(sqlite)?.generation, 1);
  sqlite.exec("UPDATE resource_revisions SET title = 'Visible track' WHERE id = 'revision:track'");
  assert.equal(outbox(sqlite)?.generation, 2);
  sqlite.exec("UPDATE resource_revisions SET content = 'not-read-for-album' WHERE id = 'revision:album'");
  assert.equal(outbox(sqlite)?.generation, 2);
  sqlite.exec("UPDATE resource_revisions SET title = 'Visible album' WHERE id = 'revision:album'");
  assert.equal(outbox(sqlite)?.generation, 3);
  sqlite.exec("UPDATE resources SET visibility = 'private' WHERE id = 'album'");
  assert.equal(outbox(sqlite)?.generation, 4, "hiding the owning album removes its public tracks");
});

test("tracks stay outside the projection until their public album row exists", () => {
  const { sqlite } = fixture();
  insertResource(sqlite, {
    id: "album",
    type: "album",
    path: "/music/albums/album",
  });
  insertResource(sqlite, {
    id: "track",
    type: "track",
    path: "/music/tracks/track",
  });
  sqlite.exec(`
    INSERT INTO tracks (resource_id, album_resource_id, source_type, track_number)
    VALUES ('track', 'album', 'external', 1)
  `);
  assert.equal(outbox(sqlite), undefined);
  sqlite.exec("INSERT INTO resource_albums (resource_id, artist) VALUES ('album', 'Artist')");
  assert.equal(outbox(sqlite)?.generation, 1, "the album-side join makes album and track visible together");
});

test("HTTP 204 marks only submitted; concurrent changes stay pending until an exact CI acknowledgement", async () => {
  const { sqlite, database } = fixture();
  signal(sqlite, "first");
  const store = createPublicContentRebuildOutboxStore(database);
  const startedAt = new Date(Date.now() + 5_000);
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  const first = await runPublicContentRebuildOutbox({
    environment: {
      PUBLIC_REBUILD_GITHUB_REPOSITORY: "owner/repository",
      PUBLIC_REBUILD_GITHUB_TOKEN: "TOKEN",
    },
    store,
    fetchImpl: (async (input: RequestInfo | URL, init?: RequestInit) => {
      requests.push({ url: String(input), init });
      signal(sqlite, "concurrent");
      return new Response(null, { status: 204 });
    }) as typeof fetch,
    now: () => startedAt,
  });
  assert.deepEqual(first, {
    status: "submitted",
    generation: 1,
    pendingGeneration: 2,
  });
  assert.deepEqual({ ...outbox(sqlite) }, {
    generation: 2,
    submittedGeneration: 1,
    deployedGeneration: 0,
    status: "pending",
    attempts: 0,
    lastReason: "concurrent",
    lastResourceId: null,
  });
  assert.equal(requests[0]?.url, "https://api.github.com/repos/owner/repository/dispatches");
  assert.equal(new Headers(requests[0]?.init?.headers).get("authorization"), "Bearer TOKEN");
  const payload = JSON.parse(String(requests[0]?.init?.body));
  assert.equal(payload.event_type, "content-published");
  assert.equal(payload.client_payload.generation, 1);
  assert.equal(payload.client_payload.previous_submitted_generation, 0);
  assert.equal(payload.client_payload.previous_deployed_generation, 0);

  const second = await runPublicContentRebuildOutbox({
    environment: {
      PUBLIC_REBUILD_GITHUB_REPOSITORY: "owner/repository",
      PUBLIC_REBUILD_GITHUB_TOKEN: "TOKEN",
    },
    store,
    fetchImpl: (async () => new Response(null, { status: 204 })) as typeof fetch,
    now: () => new Date(startedAt.getTime() + 1_000),
  });
  assert.deepEqual(second, {
    status: "submitted",
    generation: 2,
    pendingGeneration: null,
  });
  assert.equal(outbox(sqlite)?.status, "submitted");
  assert.equal(outbox(sqlite)?.submittedGeneration, 2);
  assert.equal(outbox(sqlite)?.deployedGeneration, 0);

  const earlyCron = await runPublicContentRebuildOutbox({
    environment: {
      PUBLIC_REBUILD_GITHUB_REPOSITORY: "owner/repository",
      PUBLIC_REBUILD_GITHUB_TOKEN: "TOKEN",
    },
    store,
    fetchImpl: (async () => { throw new Error("must wait for CI acknowledgement"); }) as typeof fetch,
    now: () => new Date(startedAt.getTime() + 29 * 60_000),
  });
  assert.deepEqual(earlyCron, { status: "idle" });

  const olderAcknowledgement = await acknowledgePublicContentRebuildDeployment(1, {
    store,
    now: () => new Date(startedAt.getTime() + 29 * 60_000),
  });
  assert.equal(olderAcknowledgement?.status, "submitted");
  assert.equal(olderAcknowledgement?.deployedGeneration, 1);
  assert.equal(await acknowledgePublicContentRebuildDeployment(3, { store }), null);

  const acknowledgement = await acknowledgePublicContentRebuildDeployment(2, {
    store,
    now: () => new Date(startedAt.getTime() + 29 * 60_000),
  });
  assert.equal(acknowledgement?.status, "deployed");
  assert.equal(acknowledgement?.deployedGeneration, 2);
  assert.equal(outbox(sqlite)?.status, "deployed");

  sqlite.exec(`
    UPDATE public_content_rebuild_outbox
    SET available_at = 123, last_error = 'preserve replay diagnostics',
        last_deployed_at = 456, updated_at = 789
    WHERE id = 'public-content'
  `);
  const beforeReplay = sqlite.prepare(`
    SELECT available_at, last_error, last_deployed_at, updated_at
    FROM public_content_rebuild_outbox WHERE id = 'public-content'
  `).get();
  const replay = await acknowledgePublicContentRebuildDeployment(1, {
    store,
    now: () => new Date(startedAt.getTime() + 60 * 60_000),
  });
  assert.equal(replay?.deployedGeneration, 2);
  assert.deepEqual(
    { ...sqlite.prepare(`
      SELECT available_at, last_error, last_deployed_at, updated_at
      FROM public_content_rebuild_outbox WHERE id = 'public-content'
    `).get()! },
    { ...beforeReplay! },
    "a deployed generation replay must be a read-only acknowledgement",
  );
});

test("a submitted generation is re-dispatched when CI never acknowledges it", async () => {
  const { sqlite, database } = fixture();
  signal(sqlite);
  const store = createPublicContentRebuildOutboxStore(database);
  const startedAt = new Date(Date.now() + 5_000);
  let dispatches = 0;
  const run = (date: Date) => runPublicContentRebuildOutbox({
    environment: {
      PUBLIC_REBUILD_GITHUB_REPOSITORY: "owner/repository",
      PUBLIC_REBUILD_GITHUB_TOKEN: "TOKEN",
    },
    store,
    fetchImpl: (async () => {
      dispatches += 1;
      return new Response(null, { status: 204 });
    }) as typeof fetch,
    now: () => date,
  });

  assert.equal((await run(startedAt)).status, "submitted");
  assert.equal((await run(new Date(startedAt.getTime() + 29 * 60_000))).status, "idle");
  assert.equal((await run(new Date(startedAt.getTime() + 30 * 60_000 + 1))).status, "submitted");
  assert.equal(dispatches, 2);
  assert.equal(outbox(sqlite)?.submittedGeneration, 1);
  assert.equal(outbox(sqlite)?.deployedGeneration, 0);
});

test("configuration and transport failures stay observable while review remains disabled", async () => {
  const { sqlite, database } = fixture();
  signal(sqlite);
  const store = createPublicContentRebuildOutboxStore(database);
  const startedAt = new Date(Date.now() + 5_000);

  const review = await runPublicContentRebuildOutbox({
    environment: { REVIEW_READ_ONLY: "true" },
    store,
    now: () => startedAt,
  });
  assert.deepEqual(review, { status: "disabled", reason: "review" });

  const missing = await runPublicContentRebuildOutbox({
    environment: {},
    store,
    now: () => startedAt,
  });
  assert.equal(missing.status, "failed");
  if (missing.status === "failed") {
    assert.match(missing.error, /PUBLIC_REBUILD_GITHUB_REPOSITORY/);
    assert.match(missing.error, /PUBLIC_REBUILD_GITHUB_TOKEN/);
  }
  assert.equal(outbox(sqlite)?.status, "pending", "configuration failures do not lease the row");

  const failed = await runPublicContentRebuildOutbox({
    environment: {
      PUBLIC_REBUILD_GITHUB_REPOSITORY: "owner/repository",
      PUBLIC_REBUILD_GITHUB_TOKEN: "TOKEN",
    },
    store,
    fetchImpl: (async () => new Response(null, {
      status: 503,
      headers: { "x-github-request-id": "request-id" },
    })) as typeof fetch,
    now: () => startedAt,
  });
  assert.equal(failed.status, "failed");
  if (failed.status !== "failed") return;
  assert.equal(failed.generation, 1);
  assert.equal(failed.retryAt, new Date(startedAt.getTime() + 30_000).toISOString());
  assert.match(failed.error, /HTTP 503 \(request-id\)/);
  assert.equal(outbox(sqlite)?.attempts, 1);

  const beforeRetry = await runPublicContentRebuildOutbox({
    environment: {
      PUBLIC_REBUILD_GITHUB_REPOSITORY: "owner/repository",
      PUBLIC_REBUILD_GITHUB_TOKEN: "TOKEN",
    },
    store,
    fetchImpl: (async () => new Response(null, { status: 204 })) as typeof fetch,
    now: () => new Date(startedAt.getTime() + 29_000),
  });
  assert.deepEqual(beforeRetry, { status: "idle" });

  const retry = await runPublicContentRebuildOutbox({
    environment: {
      PUBLIC_REBUILD_GITHUB_REPOSITORY: "owner/repository",
      PUBLIC_REBUILD_GITHUB_TOKEN: "TOKEN",
    },
    store,
    fetchImpl: (async () => new Response(null, { status: 204 })) as typeof fetch,
    now: () => new Date(startedAt.getTime() + 31_000),
  });
  assert.equal(retry.status, "submitted");
  assert.equal(outbox(sqlite)?.status, "submitted");

  const jobsRoute = readFileSync(path.join(process.cwd(), "app/api/jobs/run/route.ts"), "utf8");
  assert.match(jobsRoute, /publicContentRebuild\.status === "failed"/);
  assert.match(jobsRoute, /status: partialFailure \? 207 : 200/);
  const customWorker = readFileSync(path.join(process.cwd(), "custom-worker.ts"), "utf8");
  assert.match(customWorker, /response\.status !== 200/);
  assert.match(customWorker, /response\.json\(\)/);
  assert.match(customWorker, /publicContentRebuild\?\.status === "failed"/);
  assert.match(customWorker, /Public content rebuild dispatch failed/);
  const ackRoute = readFileSync(
    path.join(process.cwd(), "app/api/jobs/public-content-rebuild/ack/route.ts"),
    "utf8",
  );
  assert.match(ackRoute, /matchesBearerSecret/);
  assert.match(ackRoute, /process\.env\.CRON_SECRET/);
});
