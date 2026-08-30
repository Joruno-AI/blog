import assert from "node:assert/strict";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import test from "node:test";

import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";

import { db as productionDatabase } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import {
  archiveAlbumResourceGroup,
  setAlbumResourceGroupPublished,
} from "@/modules/music/application/music-service";
import {
  archiveResources,
  insertRevisionAndSelectIt,
  publishCurrentRevision,
  scheduleCurrentRevision,
  setResourceGroupPublished,
  unpublishResourceRecord,
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

function publicationFixture(options: { collidingAlbumRoute?: boolean } = {}) {
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
      data_json TEXT NOT NULL,
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
      source_type TEXT NOT NULL DEFAULT 'external',
      duration TEXT,
      duration_seconds INTEGER,
      track_number INTEGER NOT NULL,
      lyrics TEXT
    );
    CREATE VIRTUAL TABLE resource_search USING fts5(
      resource_id UNINDEXED,
      title,
      description,
      content,
      tokens
    );
  `);

  const resourceIds = ["album", ...Array.from({ length: 18 }, (_, index) => `track:${index + 1}`)];
  const insertResource = sqlite.prepare(`
    INSERT INTO resources (
      id, type, title, slug, path, description, status, visibility,
      current_revision_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, NULL, 'draft', 'public', ?, 1, 1)
  `);
  const insertRevision = sqlite.prepare(`
    INSERT INTO resource_revisions (
      id, resource_id, version, title, slug, path, description, visibility,
      content, content_format, metadata_json, created_at
    ) VALUES (?, ?, 1, ?, ?, ?, NULL, 'public', '', 'text', '{}', 1)
  `);
  const insertRoute = sqlite.prepare(
    "INSERT INTO resource_routes (path, resource_id, canonical, created_at) VALUES (?, ?, 1, 1)",
  );
  const insertSearch = sqlite.prepare(`
    INSERT INTO resource_search (resource_id, title, description, content, tokens)
    VALUES (?, ?, '', '', ?)
  `);
  const insertTrack = sqlite.prepare(`
    INSERT INTO tracks (resource_id, album_resource_id, track_number)
    VALUES (?, 'album', ?)
  `);

  for (const [index, id] of resourceIds.entries()) {
    const isAlbum = index === 0;
    const oldPath = isAlbum ? "/music/albums/old" : `/music/tracks/${index}`;
    const revisionPath = isAlbum
      ? options.collidingAlbumRoute ? "/occupied" : "/music/albums/new"
      : oldPath;
    const revisionId = `revision:${id}`;
    insertResource.run(
      id,
      isAlbum ? "album" : "track",
      `Old ${id}`,
      `old-${index}`,
      oldPath,
      revisionId,
    );
    insertRevision.run(
      revisionId,
      id,
      `New ${id}`,
      `new-${index}`,
      revisionPath,
    );
    insertRoute.run(oldPath, id);
    insertSearch.run(id, id, id);
    if (!isAlbum) insertTrack.run(id, index);
  }
  sqlite.prepare(`
    INSERT INTO resource_albums (resource_id, artist, color, release_date, sort_order)
    VALUES ('album', 'Old Artist', '#111111', 1, 1)
  `).run();

  if (options.collidingAlbumRoute) {
    sqlite.prepare(`
      INSERT INTO resources (
        id, type, title, slug, path, status, visibility, created_at, updated_at
      ) VALUES ('foreign', 'album', 'Foreign', 'foreign', '/occupied', 'published', 'public', 1, 1)
    `).run();
    insertRoute.run("/occupied", "foreign");
  }

  const d1 = new SQLiteD1Database(sqlite);
  const database = drizzle(d1 as never, { schema }) as typeof productionDatabase;
  return { sqlite, d1, database, resourceIds };
}

test("publishes and unpublishes an 18-track album as one complete group", async () => {
  const { sqlite, database, resourceIds } = publicationFixture();
  const published = await setResourceGroupPublished(
    {
      resourceIds,
      published: true,
      additionalStatements: [database
        .update(schema.resourceAlbums)
        .set({ artist: "Published Artist", sortOrder: 2 })
        .where(sql`${schema.resourceAlbums.resourceId} = ${"album"}`)],
    },
    database,
  );
  assert.deepEqual(published, { published: true, count: 19 });
  assert.equal(
    sqlite.prepare("SELECT count(*) AS count FROM resources WHERE status = 'published'").get()?.count,
    19,
  );
  assert.equal(
    sqlite.prepare("SELECT count(*) AS count FROM resources WHERE published_revision_id = current_revision_id").get()?.count,
    19,
  );
  assert.equal(
    sqlite.prepare("SELECT count(*) AS count FROM publication_events WHERE event_type = 'published'").get()?.count,
    19,
  );
  assert.equal(
    sqlite.prepare(`
      SELECT count(*) AS count
      FROM publication_events e
      JOIN resources r ON r.id = e.resource_id
      WHERE e.created_at = r.updated_at
    `).get()?.count,
    19,
  );
  assert.equal(sqlite.prepare("SELECT count(*) AS count FROM resource_search").get()?.count, 0);
  assert.equal(
    sqlite.prepare("SELECT artist FROM resource_albums WHERE resource_id = 'album'").get()?.artist,
    "Published Artist",
  );
  assert.equal(
    sqlite.prepare("SELECT resource_id AS id FROM resource_routes WHERE path = '/music/albums/new'").get()?.id,
    "album",
  );
  assert.equal(
    sqlite.prepare("SELECT to_path AS path FROM redirects WHERE from_path = '/music/albums/old'").get()?.path,
    "/music/albums/new",
  );

  const unpublished = await setResourceGroupPublished(
    { resourceIds, published: false },
    database,
  );
  assert.deepEqual(unpublished, { published: false, count: 19 });
  assert.equal(
    sqlite.prepare("SELECT count(*) AS count FROM resources WHERE status = 'draft' AND published_revision_id IS NULL").get()?.count,
    19,
  );
  assert.equal(
    sqlite.prepare("SELECT count(*) AS count FROM publication_events WHERE event_type = 'unpublished'").get()?.count,
    19,
  );
});

test("a route collision rolls the entire album publication batch back", async () => {
  const { sqlite, database, resourceIds } = publicationFixture({ collidingAlbumRoute: true });
  await assert.rejects(
    () => setResourceGroupPublished({ resourceIds, published: true }, database),
    /UNIQUE constraint failed: resource_routes\.path/,
  );
  assert.equal(
    sqlite.prepare("SELECT count(*) AS count FROM resources WHERE id <> 'foreign' AND status = 'draft'").get()?.count,
    19,
  );
  assert.equal(sqlite.prepare("SELECT count(*) AS count FROM publication_events").get()?.count, 0);
  assert.equal(sqlite.prepare("SELECT count(*) AS count FROM redirects").get()?.count, 0);
  assert.equal(
    sqlite.prepare("SELECT resource_id AS id FROM resource_routes WHERE path = '/music/albums/old'").get()?.id,
    "album",
  );
  assert.equal(sqlite.prepare("SELECT count(*) AS count FROM resource_search").get()?.count, 19);
});

test("group publication never deletes an old route owned by another resource", async () => {
  const { sqlite, database, resourceIds } = publicationFixture();
  sqlite.prepare("DELETE FROM resource_routes WHERE path = '/music/albums/old'").run();
  sqlite.prepare(`
    INSERT INTO resources (
      id, type, title, slug, path, status, visibility, created_at, updated_at
    ) VALUES ('foreign', 'article', 'Foreign', 'foreign', '/foreign', 'published', 'public', 1, 1)
  `).run();
  sqlite.prepare(`
    INSERT INTO resource_routes (path, resource_id, canonical, created_at)
    VALUES ('/music/albums/old', 'foreign', 1, 2)
  `).run();

  await setResourceGroupPublished({ resourceIds, published: true }, database);

  assert.equal(
    sqlite.prepare("SELECT resource_id AS id FROM resource_routes WHERE path = '/music/albums/old'").get()?.id,
    "foreign",
  );
  assert.equal(
    sqlite.prepare("SELECT resource_id AS id FROM resource_routes WHERE path = '/music/albums/new'").get()?.id,
    "album",
  );
});

test("a failing side-table projection rolls back side fields and publication together", async () => {
  const { sqlite, database, resourceIds } = publicationFixture();
  const updateArtist = database
    .update(schema.resourceAlbums)
    .set({ artist: "New Artist", sortOrder: 9 })
    .where(sql`${schema.resourceAlbums.resourceId} = ${"album"}`);
  const duplicateAlbum = database.insert(schema.resourceAlbums).values({
    resourceId: "album",
    artist: "Duplicate",
    color: null,
    releaseDate: null,
    sortOrder: 10,
  });

  await assert.rejects(
    () => setResourceGroupPublished({
      resourceIds,
      published: true,
      additionalStatements: [updateArtist, duplicateAlbum],
    }, database),
    /UNIQUE constraint failed: resource_albums\.resource_id/,
  );

  const persistedAlbum = sqlite.prepare(`
      SELECT artist, sort_order AS sortOrder
      FROM resource_albums
      WHERE resource_id = 'album'
    `).get();
  assert.equal(persistedAlbum?.artist, "Old Artist");
  assert.equal(persistedAlbum?.sortOrder, 1);
  assert.equal(
    sqlite.prepare("SELECT count(*) AS count FROM resources WHERE status = 'draft' AND published_revision_id IS NULL").get()?.count,
    19,
  );
  assert.equal(sqlite.prepare("SELECT count(*) AS count FROM publication_events").get()?.count, 0);
  assert.equal(sqlite.prepare("SELECT count(*) AS count FROM redirects").get()?.count, 0);
  assert.equal(
    sqlite.prepare("SELECT resource_id AS id FROM resource_routes WHERE path = '/music/albums/old'").get()?.id,
    "album",
  );
});

test("a stale side projection cannot publish a newer current revision", async () => {
  const { sqlite, database } = publicationFixture();
  sqlite.prepare(`
    INSERT INTO resource_revisions (
      id, resource_id, version, title, slug, path, description, visibility,
      content, content_format, metadata_json, created_at
    ) VALUES (
      'revision:album:newer', 'album', 2, 'Newer Album', 'newer',
      '/music/albums/newer', NULL, 'public', '', 'text', '{}', 2
    )
  `).run();
  sqlite.prepare(`
    UPDATE resources
    SET current_revision_id = 'revision:album:newer', updated_at = 2
    WHERE id = 'album'
  `).run();

  await assert.rejects(
    () => setResourceGroupPublished({
      resourceIds: ["album"],
      published: true,
      expectedCurrentRevisionIds: { album: "revision:album" },
      additionalStatements: [database
        .update(schema.resourceAlbums)
        .set({ artist: "Stale Artist" })
        .where(eq(schema.resourceAlbums.resourceId, "album"))],
    }, database),
    /changed while publication was being prepared/,
  );

  assert.equal(
    sqlite.prepare("SELECT artist FROM resource_albums WHERE resource_id = 'album'").get()?.artist,
    "Old Artist",
  );
  assert.equal(
    sqlite.prepare("SELECT status FROM resources WHERE id = 'album'").get()?.status,
    "draft",
  );
  assert.equal(sqlite.prepare("SELECT count(*) AS count FROM publication_events").get()?.count, 0);
});

test("a concurrent current-revision change cancels the frozen publication snapshot", async () => {
  const { sqlite, d1, database, resourceIds } = publicationFixture();
  d1.beforeBatch = () => {
    sqlite.prepare(`
      INSERT INTO resource_revisions (
        id, resource_id, version, title, slug, path, description, visibility,
        content, content_format, metadata_json, created_at
      ) VALUES (
        'revision:album:raced', 'album', 2, 'Raced Album', 'raced',
        '/music/albums/raced', NULL, 'public', '', 'text', '{}', 2
      )
    `).run();
    sqlite.prepare(`
      UPDATE resources
      SET current_revision_id = 'revision:album:raced', updated_at = 2
      WHERE id = 'album'
    `).run();
  };

  await assert.rejects(
    () => setResourceGroupPublished({
      resourceIds,
      published: true,
      additionalStatements: [database
        .update(schema.resourceAlbums)
        .set({ artist: "Raced Artist", sortOrder: 8 })
        .where(sql`${schema.resourceAlbums.resourceId} = ${"album"}`)],
    }, database),
    /changed while publication was being prepared/,
  );

  const album = sqlite.prepare(`
    SELECT title, path, status, current_revision_id AS currentRevisionId,
           published_revision_id AS publishedRevisionId
    FROM resources WHERE id = 'album'
  `).get();
  assert.equal(album?.currentRevisionId, "revision:album:raced");
  assert.equal(album?.publishedRevisionId, null);
  assert.equal(album?.title, "Old album");
  assert.equal(album?.path, "/music/albums/old");
  assert.equal(album?.status, "draft");
  assert.equal(
    sqlite.prepare("SELECT artist FROM resource_albums WHERE resource_id = 'album'").get()?.artist,
    "Old Artist",
  );
  assert.equal(sqlite.prepare("SELECT count(*) AS count FROM publication_events").get()?.count, 0);
  assert.equal(sqlite.prepare("SELECT count(*) AS count FROM redirects").get()?.count, 0);
  assert.equal(
    sqlite.prepare("SELECT resource_id AS id FROM resource_routes WHERE path = '/music/albums/old'").get()?.id,
    "album",
  );
  assert.equal(
    sqlite.prepare("SELECT count(*) AS count FROM resource_routes WHERE path IN ('/music/albums/new', '/music/albums/raced')").get()?.count,
    0,
  );
});

test("group publication cannot revive a concurrently archived member", async () => {
  const { sqlite, d1, database, resourceIds } = publicationFixture();
  d1.beforeBatch = () => {
    sqlite.prepare(`
      UPDATE resources SET status = 'archived', updated_at = 2 WHERE id = 'album'
    `).run();
  };

  await assert.rejects(
    () => setResourceGroupPublished({ resourceIds, published: true }, database),
    /changed while publication was being prepared/,
  );

  assert.equal(
    sqlite.prepare("SELECT status FROM resources WHERE id = 'album'").get()?.status,
    "archived",
  );
  assert.equal(
    sqlite.prepare("SELECT count(*) AS count FROM resources WHERE id <> 'album' AND status = 'published'").get()?.count,
    0,
  );
  assert.equal(sqlite.prepare("SELECT count(*) AS count FROM publication_events").get()?.count, 0);
});

test("album publication never revives a previously archived track", async () => {
  const { sqlite, database, resourceIds } = publicationFixture();
  await setResourceGroupPublished({ resourceIds, published: true }, database);
  await archiveResources(["track:1"], null, {}, database);

  await setAlbumResourceGroupPublished({
    resourceId: "album",
    published: true,
  }, database);

  assert.equal(
    sqlite.prepare("SELECT status FROM resources WHERE id = 'track:1'").get()?.status,
    "archived",
  );
  assert.equal(
    sqlite.prepare("SELECT count(*) AS count FROM resources WHERE status = 'published'").get()?.count,
    18,
  );
});

test("an archived album group cannot be republished", async () => {
  const { sqlite, database } = publicationFixture();
  await archiveAlbumResourceGroup("album", database);

  await assert.rejects(
    () => setAlbumResourceGroupPublished({
      resourceId: "album",
      published: true,
    }, database),
    /archived/i,
  );
  assert.equal(
    sqlite.prepare("SELECT count(*) AS count FROM resources WHERE status = 'archived'").get()?.count,
    19,
  );
});

test("the real scheduler publishes an album and its active tracks atomically", async () => {
  const { sqlite, database } = publicationFixture();
  const now = new Date("2026-08-30T10:00:00.000Z");
  const dueAt = Math.floor(now.getTime() / 1_000) - 60;
  sqlite.prepare(`
    UPDATE resources
    SET status = 'scheduled', scheduled_at = ?
    WHERE id = 'album'
  `).run(dueAt);

  const result = await runScheduledPublications(25, {
    database,
    now: () => new Date(now),
  });

  assert.deepEqual(result.published, ["album"]);
  assert.deepEqual(result.skipped, []);
  assert.deepEqual(result.failed, []);
  assert.equal(
    sqlite.prepare("SELECT count(*) AS count FROM resources WHERE status = 'published'").get()?.count,
    19,
  );
  assert.equal(
    sqlite.prepare("SELECT count(*) AS count FROM resources WHERE published_revision_id = current_revision_id").get()?.count,
    19,
  );
});

test("the album scheduler preserves an archive that wins after the due scan", async () => {
  const { sqlite, d1, database } = publicationFixture();
  const now = new Date("2026-08-30T10:00:00.000Z");
  const dueAt = Math.floor(now.getTime() / 1_000) - 60;
  sqlite.prepare(`
    UPDATE resources
    SET status = 'scheduled', scheduled_at = ?
    WHERE id = 'album'
  `).run(dueAt);
  d1.beforeBatch = () => {
    sqlite.prepare(`
      UPDATE resources
      SET status = 'archived', scheduled_at = NULL, updated_at = 2
      WHERE id = 'album'
    `).run();
  };

  const result = await runScheduledPublications(25, {
    database,
    now: () => new Date(now),
  });

  assert.deepEqual(result.published, []);
  assert.equal(result.skipped.length, 1);
  assert.deepEqual(result.failed, []);
  assert.equal(
    sqlite.prepare("SELECT status FROM resources WHERE id = 'album'").get()?.status,
    "archived",
  );
  assert.equal(
    sqlite.prepare("SELECT count(*) AS count FROM resources WHERE id <> 'album' AND status = 'published'").get()?.count,
    0,
  );
});

test("album publication rejects a concurrent track-membership change", async () => {
  const { sqlite, d1, database } = publicationFixture();
  d1.beforeBatch = () => {
    sqlite.prepare(`
      INSERT INTO resources (
        id, type, title, slug, path, description, status, visibility,
        current_revision_id, created_at, updated_at
      ) VALUES (
        'track:raced', 'track', 'Raced Track', 'raced', '/music/tracks/raced',
        NULL, 'draft', 'public', 'revision:track:raced', 2, 2
      )
    `).run();
    sqlite.prepare(`
      INSERT INTO resource_revisions (
        id, resource_id, version, title, slug, path, description, visibility,
        content, content_format, metadata_json, created_at
      ) VALUES (
        'revision:track:raced', 'track:raced', 1, 'Raced Track', 'raced',
        '/music/tracks/raced', NULL, 'public', '', 'text', '{}', 2
      )
    `).run();
    sqlite.prepare(`
      INSERT INTO tracks (resource_id, album_resource_id, track_number)
      VALUES ('track:raced', 'album', 19)
    `).run();
  };

  await assert.rejects(
    () => setAlbumResourceGroupPublished({
      resourceId: "album",
      published: true,
    }, database),
    /changed while publication was being prepared/,
  );

  assert.equal(
    sqlite.prepare("SELECT count(*) AS count FROM resources WHERE status = 'published'").get()?.count,
    0,
  );
  assert.equal(
    sqlite.prepare("SELECT count(*) AS count FROM resources WHERE status = 'draft'").get()?.count,
    20,
  );
  assert.equal(sqlite.prepare("SELECT count(*) AS count FROM publication_events").get()?.count, 0);
});

test("album archive rejects a concurrent track-membership change", async () => {
  const { sqlite, d1, database } = publicationFixture();
  d1.beforeBatch = () => {
    sqlite.prepare(`
      INSERT INTO resources (
        id, type, title, slug, path, description, status, visibility,
        current_revision_id, created_at, updated_at
      ) VALUES (
        'track:archive-raced', 'track', 'Archive Raced Track', 'archive-raced',
        '/music/tracks/archive-raced', NULL, 'draft', 'public',
        'revision:track:archive-raced', 2, 2
      )
    `).run();
    sqlite.prepare(`
      INSERT INTO resource_revisions (
        id, resource_id, version, title, slug, path, description, visibility,
        content, content_format, metadata_json, created_at
      ) VALUES (
        'revision:track:archive-raced', 'track:archive-raced', 1,
        'Archive Raced Track', 'archive-raced', '/music/tracks/archive-raced',
        NULL, 'public', '', 'text', '{}', 2
      )
    `).run();
    sqlite.prepare(`
      INSERT INTO tracks (resource_id, album_resource_id, track_number)
      VALUES ('track:archive-raced', 'album', 19)
    `).run();
  };

  await assert.rejects(
    () => archiveAlbumResourceGroup("album", database),
    /changed while archive was being prepared/,
  );

  assert.equal(
    sqlite.prepare("SELECT count(*) AS count FROM resources WHERE status = 'archived'").get()?.count,
    0,
  );
  assert.equal(
    sqlite.prepare("SELECT count(*) AS count FROM resources WHERE status = 'draft'").get()?.count,
    20,
  );
  assert.equal(sqlite.prepare("SELECT count(*) AS count FROM publication_events").get()?.count, 0);
});

test("single-resource publication rejects a concurrent current-revision change", async () => {
  const { sqlite, d1, database } = publicationFixture();
  d1.beforeBatch = () => {
    sqlite.prepare(`
      INSERT INTO resource_revisions (
        id, resource_id, version, title, slug, path, description, visibility,
        content, content_format, metadata_json, created_at
      ) VALUES (
        'revision:album:raced', 'album', 2, 'Raced Album', 'raced',
        '/music/albums/raced', NULL, 'public', '', 'text', '{}', 2
      )
    `).run();
    sqlite.prepare(`
      UPDATE resources
      SET current_revision_id = 'revision:album:raced', updated_at = 2
      WHERE id = 'album'
    `).run();
  };

  await assert.rejects(
    () => publishCurrentRevision({ resourceId: "album" }, database),
    /changed while publication was being prepared/,
  );

  const album = sqlite.prepare(`
    SELECT title, path, status, current_revision_id AS currentRevisionId,
           published_revision_id AS publishedRevisionId
    FROM resources WHERE id = 'album'
  `).get();
  assert.equal(album?.currentRevisionId, "revision:album:raced");
  assert.equal(album?.publishedRevisionId, null);
  assert.equal(album?.title, "Old album");
  assert.equal(album?.path, "/music/albums/old");
  assert.equal(album?.status, "draft");
  assert.equal(sqlite.prepare("SELECT count(*) AS count FROM publication_events").get()?.count, 0);
  assert.equal(sqlite.prepare("SELECT count(*) AS count FROM redirects").get()?.count, 0);
  assert.equal(
    sqlite.prepare("SELECT resource_id AS id FROM resource_routes WHERE path = '/music/albums/old'").get()?.id,
    "album",
  );
  assert.equal(
    sqlite.prepare("SELECT count(*) AS count FROM resource_routes WHERE path IN ('/music/albums/new', '/music/albums/raced')").get()?.count,
    0,
  );
});

test("single-resource publication cannot revive a concurrently scheduled resource", async () => {
  const { sqlite, d1, database } = publicationFixture();
  d1.beforeBatch = () => {
    sqlite.prepare(`
      UPDATE resources
      SET status = 'scheduled', scheduled_at = 123, updated_at = 2
      WHERE id = 'album'
    `).run();
  };

  await assert.rejects(
    () => publishCurrentRevision({ resourceId: "album" }, database),
    /changed while publication was being prepared/,
  );

  const album = sqlite.prepare(`
    SELECT status, scheduled_at AS scheduledAt, published_revision_id AS publishedRevisionId
    FROM resources WHERE id = 'album'
  `).get();
  assert.equal(album?.status, "scheduled");
  assert.equal(album?.scheduledAt, 123);
  assert.equal(album?.publishedRevisionId, null);
  assert.equal(sqlite.prepare("SELECT count(*) AS count FROM publication_events").get()?.count, 0);
});

test("single-resource publication commits one internally consistent revision", async () => {
  const { sqlite, database } = publicationFixture();
  const published = await publishCurrentRevision({ resourceId: "album" }, database);

  assert.equal(published?.title, "New album");
  assert.equal(published?.path, "/music/albums/new");
  assert.equal(published?.currentRevisionId, "revision:album");
  assert.equal(published?.publishedRevisionId, "revision:album");
  const album = sqlite.prepare(`
    SELECT title, slug, path, status, current_revision_id AS currentRevisionId,
           published_revision_id AS publishedRevisionId
    FROM resources WHERE id = 'album'
  `).get();
  assert.equal(album?.title, "New album");
  assert.equal(album?.slug, "new-0");
  assert.equal(album?.path, "/music/albums/new");
  assert.equal(album?.status, "published");
  assert.equal(album?.currentRevisionId, "revision:album");
  assert.equal(album?.publishedRevisionId, "revision:album");
  assert.equal(
    sqlite.prepare("SELECT revision_id AS revisionId FROM publication_events WHERE resource_id = 'album'").get()?.revisionId,
    "revision:album",
  );
  assert.equal(
    sqlite.prepare("SELECT resource_id AS id FROM resource_routes WHERE path = '/music/albums/new'").get()?.id,
    "album",
  );
  assert.equal(
    sqlite.prepare("SELECT count(*) AS count FROM resource_routes WHERE path = '/music/albums/old'").get()?.count,
    0,
  );
});

test("saving a revision uses a current-revision CAS and rolls back stale work", async () => {
  const { sqlite, d1, database } = publicationFixture();
  d1.beforeBatch = () => {
    sqlite.prepare(`
      INSERT INTO resource_revisions (
        id, resource_id, version, title, slug, path, description, visibility,
        content, content_format, metadata_json, created_at
      ) VALUES (
        'revision:album:concurrent', 'album', 2, 'Concurrent Album', 'concurrent',
        '/music/albums/concurrent', NULL, 'public', '', 'markdown', '{}', 2
      )
    `).run();
    sqlite.prepare(`
      UPDATE resources
      SET current_revision_id = 'revision:album:concurrent', updated_at = 2
      WHERE id = 'album'
    `).run();
  };

  await assert.rejects(
    () => insertRevisionAndSelectIt({
      resourceId: "album",
      expectedCurrentRevisionId: "revision:album",
      revision: {
        id: "revision:album:stale",
        resourceId: "album",
        version: 2,
        title: "Stale Album",
        slug: "stale",
        path: "/music/albums/stale",
        description: null,
        visibility: "public",
        content: "",
        contentFormat: "markdown",
        metadataJson: "{}",
        createdAt: new Date(3_000),
      },
    }, database),
    /changed while its revision was being saved/,
  );

  assert.equal(
    sqlite.prepare("SELECT current_revision_id AS id FROM resources WHERE id = 'album'").get()?.id,
    "revision:album:concurrent",
  );
  assert.equal(
    sqlite.prepare("SELECT count(*) AS count FROM resource_revisions WHERE id = 'revision:album:stale'").get()?.count,
    0,
  );
  assert.equal(sqlite.prepare("SELECT count(*) AS count FROM publication_events").get()?.count, 0);
});

test("scheduling cannot revive a concurrently archived resource", async () => {
  const { sqlite, d1, database } = publicationFixture();
  d1.beforeBatch = () => {
    sqlite.prepare("UPDATE resources SET status = 'archived', updated_at = 2 WHERE id = 'album'").run();
  };

  await assert.rejects(
    () => scheduleCurrentRevision({
      resourceId: "album",
      scheduledAt: new Date(Date.now() + 60_000),
    }, database),
    /changed while scheduling was being prepared/,
  );

  assert.equal(
    sqlite.prepare("SELECT status FROM resources WHERE id = 'album'").get()?.status,
    "archived",
  );
  assert.equal(sqlite.prepare("SELECT count(*) AS count FROM publication_events").get()?.count, 0);
});

test("unpublishing cannot overwrite a concurrent lifecycle change", async () => {
  const { sqlite, d1, database } = publicationFixture();
  await publishCurrentRevision({ resourceId: "album" }, database);
  d1.beforeBatch = () => {
    sqlite.prepare("UPDATE resources SET status = 'archived', updated_at = 2 WHERE id = 'album'").run();
  };

  await assert.rejects(
    () => unpublishResourceRecord("album", null, database),
    /changed while unpublishing was being prepared/,
  );

  const album = sqlite.prepare(`
    SELECT status, published_revision_id AS publishedRevisionId
    FROM resources WHERE id = 'album'
  `).get();
  assert.equal(album?.status, "archived");
  assert.equal(album?.publishedRevisionId, "revision:album");
  assert.equal(
    sqlite.prepare("SELECT count(*) AS count FROM publication_events WHERE event_type = 'unpublished'").get()?.count,
    0,
  );
});
