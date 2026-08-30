import { and, asc, count, desc, eq, inArray, like, ne, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";

import { db } from "@/lib/db";
import {
  assets,
  resourceAlbums,
  resourceRevisions,
  resources,
  tracks,
} from "@/lib/db/schema";
import { resolveMusicResourceId } from "@/modules/music/application/music-service";
import { publishedMusicVisibilityCondition } from "./music-visibility";
import {
  albumMutableFieldsFromRevision,
  musicRevisionIntegerOrder,
} from "./music-snapshot";
import { getSongsByAlbumId, getSongsByAlbumResourceIds } from "./songs";

const albumTracks = alias(tracks, "album_tracks");
const albumTrackResources = alias(resources, "album_track_resources");
const albumTrackPublishedRevisions = alias(
  resourceRevisions,
  "album_track_published_revisions",
);

/**
 * Counts the same tracks exposed by the public song query. A correlated
 * subquery keeps albums with zero public tracks in the result while excluding
 * draft/archived/private tracks and broken published-revision pointers.
 */
export function albumSongCountSelection(publishedRevision: boolean) {
  if (!publishedRevision) {
    return sql<number>`(
      select count(*)
      from ${tracks} as album_tracks
      where ${albumTracks.albumResourceId} = ${resources.id}
    )`;
  }

  return sql<number>`(
    select count(*)
    from ${tracks} as album_tracks
    inner join ${resources} as album_track_resources
      on ${albumTrackResources.id} = ${albumTracks.resourceId}
      and ${albumTrackResources.type} = 'track'
    inner join ${resourceRevisions} as album_track_published_revisions
      on ${albumTrackPublishedRevisions.id} = ${albumTrackResources.publishedRevisionId}
    where ${albumTracks.albumResourceId} = ${resources.id}
      and ${publishedMusicVisibilityCondition({
        status: albumTrackResources.status,
        resourceVisibility: albumTrackResources.visibility,
        revisionVisibility: albumTrackPublishedRevisions.visibility,
      })}
  )`;
}

async function queryAlbums(options: {
  limit?: number;
  offset?: number;
  published?: boolean;
  search?: string;
  ids?: string[];
  slug?: string;
  publishedRevision?: boolean;
} = {}) {
  const {
    limit = 50,
    offset = 0,
    published,
    search,
    ids,
    slug,
    publishedRevision = false,
  } = options;
  const revisionPointer = publishedRevision
    ? resources.publishedRevisionId
    : resources.currentRevisionId;
  const conditions = [eq(resources.type, "album"), ne(resources.status, "archived")];
  if (published === true) conditions.push(publishedMusicVisibilityCondition()!);
  if (published === false) conditions.push(ne(resources.status, "published"));
  if (search) conditions.push(like(resourceRevisions.title, `%${search}%`));
  if (slug) conditions.push(eq(resourceRevisions.slug, slug));
  if (ids?.length) conditions.push(inArray(resources.id, ids));
  const albumOrder = publishedRevision
    ? musicRevisionIntegerOrder(
        resourceRevisions.metadataJson,
        "order",
        resourceAlbums.sortOrder,
      )
    : resourceAlbums.sortOrder;
  const songCount = albumSongCountSelection(publishedRevision);

  return db
    .select({
      id: resources.id,
      name: resourceRevisions.title,
      slug: resourceRevisions.slug,
      description: resourceRevisions.description,
      metadataJson: resourceRevisions.metadataJson,
      artist: resourceAlbums.artist,
      cover: assets.url,
      color: resourceAlbums.color,
      status: resources.status,
      order: resourceAlbums.sortOrder,
      releaseDate: resourceAlbums.releaseDate,
      createdAt: resources.createdAt,
      updatedAt: resources.updatedAt,
      songCount,
    })
    .from(resources)
    .innerJoin(resourceRevisions, eq(resourceRevisions.id, revisionPointer))
    .innerJoin(resourceAlbums, eq(resourceAlbums.resourceId, resources.id))
    .leftJoin(assets, eq(assets.id, resources.coverAssetId))
    .where(and(...conditions))
    .orderBy(asc(albumOrder), desc(resources.createdAt))
    .limit(Math.min(Math.max(limit, 1), 1_000))
    .offset(Math.max(offset, 0));
}

type AlbumRow = Awaited<ReturnType<typeof queryAlbums>>[number];

function albumDto(row: AlbumRow) {
  const snapshot = albumMutableFieldsFromRevision(row.metadataJson, {
    artist: row.artist,
    cover: row.cover,
    color: row.color,
    order: row.order,
    releaseDate: row.releaseDate,
  });
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    artist: snapshot.artist,
    cover: snapshot.cover,
    color: snapshot.color,
    published: row.status === "published",
    order: snapshot.order,
    releaseDate: snapshot.releaseDate,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    songCount: row.songCount,
  };
}

export async function getAlbums(options?: {
  limit?: number;
  offset?: number;
  published?: boolean;
  search?: string;
}) {
  const rows = await queryAlbums({ ...options, publishedRevision: options?.published === true });
  return rows.map(albumDto);
}

export async function getAlbumById(id: string) {
  const resourceId = await resolveMusicResourceId(id, "album");
  if (!resourceId) return null;
  const [row] = await queryAlbums({ ids: [resourceId], limit: 1 });
  if (!row) return null;
  return { ...albumDto(row), songs: await getSongsByAlbumId(resourceId) };
}

export async function getAlbumBySlug(slug: string) {
  const [row] = await queryAlbums({ slug, published: true, publishedRevision: true, limit: 1 });
  if (!row) return null;
  return { ...albumDto(row), songs: await getSongsByAlbumId(row.id, true) };
}

export async function getAlbumsCount(options?: { published?: boolean }) {
  const conditions = [eq(resources.type, "album"), ne(resources.status, "archived")];
  if (options?.published === true) conditions.push(eq(resources.status, "published"));
  if (options?.published === false) conditions.push(ne(resources.status, "published"));
  const [result] = await db.select({ total: count() }).from(resources).where(and(...conditions));
  return result?.total ?? 0;
}

type AlbumDto = ReturnType<typeof albumDto>;
type SongDto = Awaited<ReturnType<typeof getSongsByAlbumResourceIds>>[number];

export interface AlbumCatalogQueries {
  getAlbums: (options: {
    limit: number;
    published?: boolean;
  }) => Promise<AlbumDto[]>;
  getSongsByAlbumResourceIds: (
    albumResourceIds: readonly string[],
    publishedRevision: boolean,
  ) => Promise<SongDto[]>;
}

const albumCatalogQueries: AlbumCatalogQueries = {
  getAlbums,
  getSongsByAlbumResourceIds,
};

/**
 * Loads the complete music catalog with two D1 statements: one for albums and
 * one batched statement for every song. The optional dependency seam keeps the
 * query-count contract directly regression-testable without request-scoped D1.
 */
export async function getAlbumsWithSongs(
  options?: { published?: boolean },
  queries: AlbumCatalogQueries = albumCatalogQueries,
) {
  const albumRows = await queries.getAlbums({
    limit: 1_000,
    published: options?.published,
  });
  if (albumRows.length === 0) return [];

  const songRows = await queries.getSongsByAlbumResourceIds(
    albumRows.map((album) => album.id),
    options?.published === true,
  );
  const songsByAlbumId = new Map<string, SongDto[]>();
  for (const song of songRows) {
    const albumSongs = songsByAlbumId.get(song.albumId);
    if (albumSongs) albumSongs.push(song);
    else songsByAlbumId.set(song.albumId, [song]);
  }

  return albumRows.map((album) => ({
    ...album,
    songs: songsByAlbumId.get(album.id) ?? [],
  }));
}
