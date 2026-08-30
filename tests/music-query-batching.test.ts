import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  getAlbumsWithSongs,
  type AlbumCatalogQueries,
} from "../lib/db/queries/albums";

type AlbumRows = Awaited<ReturnType<AlbumCatalogQueries["getAlbums"]>>;
type SongRows = Awaited<ReturnType<AlbumCatalogQueries["getSongsByAlbumResourceIds"]>>;

const albums: AlbumRows = [
  {
    id: "album:b",
    name: "Second in database sort",
    slug: "second",
    description: null,
    artist: "Artist B",
    cover: null,
    color: "#222222",
    published: true,
    order: 1,
    releaseDate: null,
    createdAt: new Date("2024-01-02T00:00:00.000Z"),
    updatedAt: new Date("2024-01-03T00:00:00.000Z"),
    songCount: 2,
  },
  {
    id: "album:a",
    name: "First in database sort",
    slug: "first",
    description: "Description",
    artist: "Artist A",
    cover: "https://example.test/cover.jpg",
    color: "#111111",
    published: true,
    order: 2,
    releaseDate: new Date("2024-02-01T00:00:00.000Z"),
    createdAt: new Date("2024-02-02T00:00:00.000Z"),
    updatedAt: new Date("2024-02-03T00:00:00.000Z"),
    songCount: 1,
  },
];

const songs: SongRows = [
  {
    id: "track:b-1",
    albumId: "album:b",
    name: "B1",
    duration: "3:01",
    durationSeconds: 181,
    url: "https://example.test/b1.mp3",
    externalUrl: null,
    sourceType: "upload",
    trackNumber: 1,
    lyrics: "B1 lyrics",
    metadataJson: "{}",
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
  },
  {
    id: "track:b-2",
    albumId: "album:b",
    name: "B2",
    duration: "3:02",
    durationSeconds: 182,
    url: null,
    externalUrl: "https://example.test/b2.mp3",
    sourceType: "external",
    trackNumber: 2,
    lyrics: "",
    metadataJson: "{}",
    createdAt: new Date("2024-01-02T00:00:00.000Z"),
  },
  {
    id: "track:a-1",
    albumId: "album:a",
    name: "A1",
    duration: null,
    durationSeconds: null,
    url: null,
    externalUrl: null,
    sourceType: "external",
    trackNumber: 1,
    lyrics: "",
    metadataJson: "{}",
    createdAt: new Date("2024-02-01T00:00:00.000Z"),
  },
];

test("hydrates the complete catalog with exactly two batched query calls", async () => {
  const calls: Array<{ query: string; value: unknown }> = [];
  const queries: AlbumCatalogQueries = {
    async getAlbums(options) {
      calls.push({ query: "albums", value: options });
      return albums;
    },
    async getSongsByAlbumResourceIds(albumResourceIds, publishedRevision) {
      calls.push({
        query: "songs",
        value: { albumResourceIds, publishedRevision },
      });
      return songs;
    },
  };

  const result = await getAlbumsWithSongs({ published: true }, queries);

  assert.deepEqual(calls, [
    { query: "albums", value: { limit: 1_000, published: true } },
    {
      query: "songs",
      value: {
        albumResourceIds: ["album:b", "album:a"],
        publishedRevision: true,
      },
    },
  ]);
  assert.equal(result.length, 2);
  assert.deepEqual(result.map((album) => album.id), ["album:b", "album:a"]);
  assert.deepEqual(result[0].songs, songs.slice(0, 2));
  assert.deepEqual(result[1].songs, songs.slice(2));
  assert.deepEqual(Object.keys(result[0]), [...Object.keys(albums[0]), "songs"]);
});

test("skips the song query for an empty album result", async () => {
  let queryCount = 0;
  const queries: AlbumCatalogQueries = {
    async getAlbums() {
      queryCount += 1;
      return [];
    },
    async getSongsByAlbumResourceIds() {
      queryCount += 1;
      return songs;
    },
  };

  assert.deepEqual(await getAlbumsWithSongs(undefined, queries), []);
  assert.equal(queryCount, 1);
});

test("keeps the song batch within one D1 statement past the bind-variable ceiling", () => {
  const source = readFileSync(
    path.join(process.cwd(), "lib/db/queries/songs.ts"),
    "utf8",
  );

  assert.match(source, /json_each\(\$\{JSON\.stringify\(uniqueAlbumResourceIds\)\}\)/);
  assert.doesNotMatch(source, /inArray\(tracks\.albumResourceId/);
});
