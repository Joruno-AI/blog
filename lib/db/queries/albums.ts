import { and, asc, count, desc, eq, inArray, like, ne } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  assets,
  resourceAlbums,
  resourceRevisions,
  resources,
  tracks,
} from "@/lib/db/schema";
import { resolveMusicResourceId } from "@/modules/music/application/music-service";
import { getSongsByAlbumId } from "./songs";

function parseMetadata(value: string) {
  try {
    const metadata: unknown = JSON.parse(value);
    return metadata && typeof metadata === "object" && !Array.isArray(metadata)
      ? metadata as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
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
  if (published === true) conditions.push(eq(resources.status, "published"));
  if (published === false) conditions.push(ne(resources.status, "published"));
  if (search) conditions.push(like(resourceRevisions.title, `%${search}%`));
  if (slug) conditions.push(eq(resourceRevisions.slug, slug));
  if (ids?.length) conditions.push(inArray(resources.id, ids));

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
      songCount: count(tracks.resourceId),
    })
    .from(resources)
    .innerJoin(resourceRevisions, eq(resourceRevisions.id, revisionPointer))
    .innerJoin(resourceAlbums, eq(resourceAlbums.resourceId, resources.id))
    .leftJoin(assets, eq(assets.id, resources.coverAssetId))
    .leftJoin(tracks, eq(tracks.albumResourceId, resources.id))
    .where(and(...conditions))
    .groupBy(resources.id)
    .orderBy(asc(resourceAlbums.sortOrder), desc(resources.createdAt))
    .limit(Math.min(Math.max(limit, 1), 1_000))
    .offset(Math.max(offset, 0));
}

type AlbumRow = Awaited<ReturnType<typeof queryAlbums>>[number];

function albumDto(row: AlbumRow) {
  const metadata = parseMetadata(row.metadataJson);
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    artist: row.artist,
    cover: row.cover ?? (typeof metadata.cover === "string" ? metadata.cover : null),
    color: row.color,
    published: row.status === "published",
    order: row.order,
    releaseDate: row.releaseDate,
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

export async function getAlbumsWithSongs(options?: { published?: boolean }) {
  const albumRows = await getAlbums({ limit: 1_000, published: options?.published });
  return Promise.all(albumRows.map(async (album) => ({
    ...album,
    songs: await getSongsByAlbumId(album.id, options?.published === true),
  })));
}
