import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import test from "node:test";

import { sql, type SQL } from "drizzle-orm";
import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core";

import { albumSongCountSelection } from "@/lib/db/queries/albums";
import {
  albumMutableFieldsFromRevision,
  musicRevisionIntegerOrder,
  trackMutableFieldsFromRevision,
} from "@/lib/db/queries/music-snapshot";
import {
  resourceAlbums,
  resourceRevisions,
  resources,
  tracks,
} from "@/lib/db/schema";

const oldReleaseDate = new Date("2001-01-01T00:00:00.000Z");
const newReleaseDate = new Date("2026-08-30T00:00:00.000Z");
const dialect = new SQLiteSyncDialect();

function compile(statement: SQL) {
  const query = dialect.sqlToQuery(statement);
  return { sql: query.sql, params: query.params as SQLInputValue[] };
}

test("published album and track metadata remain an immutable public snapshot", () => {
  const album = albumMutableFieldsFromRevision(JSON.stringify({
    artist: "Published Artist",
    cover: null,
    color: "#111111",
    releaseDate: oldReleaseDate.toISOString(),
    order: 1,
  }), {
    artist: "Unpublished Side Artist",
    cover: "https://example.test/unpublished-cover.jpg",
    color: "#eeeeee",
    releaseDate: newReleaseDate,
    order: 99,
  });
  assert.deepEqual(album, {
    artist: "Published Artist",
    cover: null,
    color: "#111111",
    releaseDate: oldReleaseDate,
    order: 1,
  });

  const track = trackMutableFieldsFromRevision(JSON.stringify({
    duration: null,
    durationSeconds: null,
    url: "https://example.test/published.mp3",
    externalUrl: null,
    sourceType: "upload",
    trackNumber: 2,
  }), {
    duration: "9:59",
    durationSeconds: 599,
    url: null,
    externalUrl: "https://example.test/unpublished.mp3",
    sourceType: "external",
    trackNumber: 20,
  });
  assert.deepEqual(track, {
    duration: null,
    durationSeconds: null,
    url: "https://example.test/published.mp3",
    externalUrl: null,
    sourceType: "upload",
    trackNumber: 2,
  });
});

test("legacy revisions without full music metadata fall back to normalized side tables", () => {
  const albumFallback = {
    artist: "Legacy Artist",
    cover: "https://example.test/legacy.jpg",
    color: null,
    releaseDate: oldReleaseDate,
    order: 4,
  };
  assert.deepEqual(
    albumMutableFieldsFromRevision('{"unrelated":true}', albumFallback),
    albumFallback,
  );

  const trackFallback = {
    duration: "3:30",
    durationSeconds: 210,
    url: null,
    externalUrl: "https://example.test/legacy.mp3",
    sourceType: "external" as const,
    trackNumber: 7,
  };
  assert.deepEqual(
    trackMutableFieldsFromRevision('{"quality":null}', trackFallback),
    trackFallback,
  );
});

test("published album order wins over newer draft side-table order", () => {
  const database = new DatabaseSync(":memory:");
  database.exec(`
    CREATE TABLE resource_revisions (
      id TEXT PRIMARY KEY,
      metadata_json TEXT NOT NULL
    );
    CREATE TABLE resource_albums (
      resource_id TEXT PRIMARY KEY,
      sort_order INTEGER NOT NULL
    );
    INSERT INTO resource_revisions (id, metadata_json) VALUES
      ('revision:first', '{"order":1}'),
      ('revision:second', '{"order":2}'),
      ('revision:legacy', '{}');
    INSERT INTO resource_albums (resource_id, sort_order) VALUES
      ('first', 20),
      ('second', 10),
      ('legacy', 3);
  `);

  const snapshotOrder = musicRevisionIntegerOrder(
    resourceRevisions.metadataJson,
    "order",
    resourceAlbums.sortOrder,
  );
  const statement = sql`
    SELECT ${resourceAlbums.resourceId} AS id, ${snapshotOrder} AS snapshot_order
    FROM ${resourceAlbums}
    JOIN ${resourceRevisions}
      ON ${resourceRevisions.id} = 'revision:' || ${resourceAlbums.resourceId}
    ORDER BY ${snapshotOrder}, ${resourceAlbums.resourceId}
  `;
  const query = compile(statement);
  const rows = database.prepare(query.sql).all(...query.params)
    .map((row) => ({ id: row.id, snapshot_order: row.snapshot_order }));

  assert.deepEqual(rows, [
    { id: "first", snapshot_order: 1 },
    { id: "second", snapshot_order: 2 },
    { id: "legacy", snapshot_order: 3 },
  ]);
});

test("published track number wins over newer draft side-table order", () => {
  const database = new DatabaseSync(":memory:");
  database.exec(`
    CREATE TABLE resource_revisions (
      id TEXT PRIMARY KEY,
      metadata_json TEXT NOT NULL
    );
    CREATE TABLE tracks (
      resource_id TEXT PRIMARY KEY,
      track_number INTEGER NOT NULL
    );
    INSERT INTO resource_revisions (id, metadata_json) VALUES
      ('revision:first', '{"trackNumber":1}'),
      ('revision:second', '{"trackNumber":2}'),
      ('revision:legacy', '{}');
    INSERT INTO tracks (resource_id, track_number) VALUES
      ('first', 20),
      ('second', 10),
      ('legacy', 3);
  `);

  const snapshotOrder = musicRevisionIntegerOrder(
    resourceRevisions.metadataJson,
    "trackNumber",
    tracks.trackNumber,
    { positive: true },
  );
  const statement = sql`
    SELECT ${tracks.resourceId} AS id, ${snapshotOrder} AS snapshot_order
    FROM ${tracks}
    JOIN ${resourceRevisions}
      ON ${resourceRevisions.id} = 'revision:' || ${tracks.resourceId}
    ORDER BY ${snapshotOrder}, ${tracks.resourceId}
  `;
  const query = compile(statement);
  const rows = database.prepare(query.sql).all(...query.params)
    .map((row) => ({ id: row.id, snapshot_order: row.snapshot_order }));

  assert.deepEqual(rows, [
    { id: "first", snapshot_order: 1 },
    { id: "second", snapshot_order: 2 },
    { id: "legacy", snapshot_order: 3 },
  ]);
});

test("public album song counts exclude every track hidden by the public song query", () => {
  const database = new DatabaseSync(":memory:");
  database.exec(`
    CREATE TABLE resources (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      status TEXT NOT NULL,
      visibility TEXT NOT NULL,
      published_revision_id TEXT
    );
    CREATE TABLE resource_revisions (
      id TEXT PRIMARY KEY,
      visibility TEXT NOT NULL
    );
    CREATE TABLE tracks (
      resource_id TEXT PRIMARY KEY,
      album_resource_id TEXT NOT NULL
    );

    INSERT INTO resources (id, type, status, visibility, published_revision_id) VALUES
      ('album:a', 'album', 'published', 'public', NULL),
      ('album:b', 'album', 'published', 'public', NULL),
      ('track:visible-a', 'track', 'published', 'public', 'revision:visible-a'),
      ('track:visible-b', 'track', 'published', 'public', 'revision:visible-b'),
      ('track:draft', 'track', 'draft', 'public', NULL),
      ('track:archived', 'track', 'archived', 'public', 'revision:archived'),
      ('track:private-resource', 'track', 'published', 'private', 'revision:private-resource'),
      ('track:private-revision', 'track', 'published', 'public', 'revision:private-revision'),
      ('track:stale-pointer', 'track', 'published', 'public', 'revision:missing'),
      ('not-a-track', 'album', 'published', 'public', 'revision:not-a-track');

    INSERT INTO resource_revisions (id, visibility) VALUES
      ('revision:visible-a', 'public'),
      ('revision:visible-b', 'public'),
      ('revision:archived', 'public'),
      ('revision:private-resource', 'public'),
      ('revision:private-revision', 'private'),
      ('revision:not-a-track', 'public');

    INSERT INTO tracks (resource_id, album_resource_id) VALUES
      ('track:visible-a', 'album:a'),
      ('track:visible-b', 'album:b'),
      ('track:draft', 'album:a'),
      ('track:archived', 'album:a'),
      ('track:private-resource', 'album:a'),
      ('track:private-revision', 'album:a'),
      ('track:stale-pointer', 'album:a'),
      ('not-a-track', 'album:a');
  `);

  const songCount = albumSongCountSelection(true);
  const statement = sql`
    SELECT ${resources.id} AS id, ${songCount} AS song_count
    FROM ${resources}
    WHERE ${resources.type} = 'album'
      AND ${resources.id} IN ('album:a', 'album:b')
    ORDER BY ${resources.id}
  `;
  const query = compile(statement);
  const rows = database.prepare(query.sql).all(...query.params)
    .map((row) => ({ id: row.id, song_count: row.song_count }));

  assert.deepEqual(rows, [
    { id: "album:a", song_count: 1 },
    { id: "album:b", song_count: 1 },
  ]);
});

test("every music mutation writes complete revision metadata and publishes side fields atomically", () => {
  const source = readFileSync(
    path.join(process.cwd(), "modules/music/application/music-service.ts"),
    "utf8",
  );
  const repository = readFileSync(
    path.join(process.cwd(), "modules/resources/infrastructure/resource-repository.ts"),
    "utf8",
  );
  const albumQueries = readFileSync(
    path.join(process.cwd(), "lib/db/queries/albums.ts"),
    "utf8",
  );
  const trackQueries = readFileSync(
    path.join(process.cwd(), "lib/db/queries/songs.ts"),
    "utf8",
  );
  const publicAlbumQueries = readFileSync(
    path.join(process.cwd(), "modules/music/application/queries.ts"),
    "utf8",
  );
  for (const field of [
    "artist", "cover", "color", "releaseDate", "order",
    "duration", "durationSeconds", "url", "externalUrl", "sourceType", "trackNumber",
  ]) {
    assert.match(source, new RegExp(`\\b${field}\\b`));
  }
  assert.match(source, /additionalStatements:\s*(?:input\.)?additionalStatements/);
  assert.match(source, /additionalStatements:\s*\[sideStatement\]/);
  assert.match(repository, /additionalStatements\?: readonly BatchItem<"sqlite">\[\]/);
  assert.match(repository, /statements\.push\(\.\.\.\(input\.additionalStatements \?\? \[\]\)\)/);
  assert.match(albumQueries, /albumMutableFieldsFromRevision\(row\.metadataJson/);
  assert.match(albumQueries, /musicRevisionIntegerOrder\([\s\S]*?"order"/);
  assert.match(trackQueries, /trackMutableFieldsFromRevision\(row\.metadataJson/);
  assert.match(trackQueries, /musicRevisionIntegerOrder\([\s\S]*?"trackNumber"/);
  assert.match(publicAlbumQueries, /musicRevisionIntegerOrder\([\s\S]*?"trackNumber"/);
});
