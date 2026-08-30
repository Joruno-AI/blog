import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import test from "node:test";

import { sql, type SQL } from "drizzle-orm";
import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core";

import { publishedMusicVisibilityCondition } from "@/lib/db/queries/music-visibility";
import { resourceRevisions, resources } from "@/lib/db/schema";

const root = process.cwd();
const dialect = new SQLiteSyncDialect();

function compile(statement: SQL) {
  const query = dialect.sqlToQuery(statement);
  return { sql: query.sql, params: query.params as SQLInputValue[] };
}

test("anonymous music selects exclude private, unlisted and stale revision visibility", () => {
  const database = new DatabaseSync(":memory:");
  database.exec(`
    CREATE TABLE resources (
      id TEXT PRIMARY KEY,
      status TEXT NOT NULL,
      visibility TEXT NOT NULL,
      published_revision_id TEXT
    );
    CREATE TABLE resource_revisions (
      id TEXT PRIMARY KEY,
      visibility TEXT NOT NULL
    );
  `);
  const insertResource = database.prepare(
    "INSERT INTO resources (id, status, visibility, published_revision_id) VALUES (?, ?, ?, ?)",
  );
  const insertRevision = database.prepare(
    "INSERT INTO resource_revisions (id, visibility) VALUES (?, ?)",
  );
  for (const [id, status, resourceVisibility, revisionVisibility] of [
    ["public", "published", "public", "public"],
    ["draft", "draft", "public", "public"],
    ["private", "published", "private", "private"],
    ["unlisted", "published", "unlisted", "unlisted"],
    ["private-revision", "published", "public", "private"],
    ["private-resource", "published", "private", "public"],
  ] as const) {
    const revisionId = `revision:${id}`;
    insertResource.run(id, status, resourceVisibility, revisionId);
    insertRevision.run(revisionId, revisionVisibility);
  }

  const statement = sql`
    SELECT ${resources.id} AS id
    FROM ${resources}
    JOIN ${resourceRevisions}
      ON ${resourceRevisions.id} = ${resources.publishedRevisionId}
    WHERE ${publishedMusicVisibilityCondition()}
    ORDER BY ${resources.id}
  `;
  const query = compile(statement);
  const rows = database.prepare(query.sql).all(...query.params);
  assert.deepEqual(rows.map((row) => row.id), ["public"]);
});

test("every public music endpoint is pinned to the guarded published query", () => {
  const read = (file: string) => readFileSync(path.join(root, file), "utf8");
  const albums = read("lib/db/queries/albums.ts");
  const songs = read("lib/db/queries/songs.ts");
  const catalog = read("app/api/public/music/route.ts");
  const single = read("app/api/public/music/[albumId]/route.ts");

  assert.match(albums, /publishedMusicVisibilityCondition\(\)/);
  assert.match(songs, /publishedMusicVisibilityCondition\(\)/);
  assert.match(catalog, /getAlbumsWithSongs\(\{ published: true \}\)/);
  assert.doesNotMatch(catalog, /published=false|searchParams|get\("published"\)/);
  assert.match(single, /getAlbumBySlug\(albumId\)/);
});

test("album publication is one bounded atomic D1 batch, not a per-track loop", () => {
  const musicService = readFileSync(
    path.join(root, "modules/music/application/music-service.ts"),
    "utf8",
  );
  const repository = readFileSync(
    path.join(root, "modules/resources/infrastructure/resource-repository.ts"),
    "utf8",
  );
  const functionBody = musicService.slice(
    musicService.indexOf("export async function setAlbumPublished"),
    musicService.indexOf("export async function archiveAlbumResource"),
  );

  assert.match(functionBody, /setAlbumResourceGroupPublished\(/);
  assert.doesNotMatch(functionBody, /for\s*\([^)]*track|Promise\.all/);
  assert.match(musicService, /return setResourceGroupPublished\(/);
  assert.match(repository, /export async function setResourceGroupPublished/);
  assert.match(repository, /await db\.batch\(/);
  assert.match(repository, /json_each\(\$\{JSON\.stringify\(eventRows\)\}\)/);
  assert.match(repository, /D1 rolls back/);
});
