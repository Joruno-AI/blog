import { and, asc, count, eq, max } from "drizzle-orm";

import { db } from "@/lib/db";
import { assets, resourceRevisions, resources, tracks } from "@/lib/db/schema";
import { resolveMusicResourceId } from "@/modules/music/application/music-service";

export async function getSongsByAlbumId(albumId: string, publishedRevision = false) {
  const albumResourceId = await resolveMusicResourceId(albumId, "album");
  if (!albumResourceId) return [];
  const revisionPointer = publishedRevision
    ? resources.publishedRevisionId
    : resources.currentRevisionId;
  const conditions = [eq(tracks.albumResourceId, albumResourceId)];
  if (publishedRevision) conditions.push(eq(resources.status, "published"));

  return db
    .select({
      id: resources.id,
      albumId: tracks.albumResourceId,
      name: resourceRevisions.title,
      duration: tracks.duration,
      durationSeconds: tracks.durationSeconds,
      url: assets.url,
      externalUrl: tracks.externalUrl,
      sourceType: tracks.sourceType,
      trackNumber: tracks.trackNumber,
      lyrics: resourceRevisions.content,
      createdAt: resources.createdAt,
    })
    .from(tracks)
    .innerJoin(resources, eq(resources.id, tracks.resourceId))
    .innerJoin(resourceRevisions, eq(resourceRevisions.id, revisionPointer))
    .leftJoin(assets, eq(assets.id, tracks.audioAssetId))
    .where(and(...conditions))
    .orderBy(asc(tracks.trackNumber), asc(resourceRevisions.title));
}

export async function getSongById(id: string) {
  const resourceId = await resolveMusicResourceId(id, "track");
  if (!resourceId) return null;
  const [track] = await db
    .select({ albumId: tracks.albumResourceId })
    .from(tracks)
    .where(eq(tracks.resourceId, resourceId))
    .limit(1);
  if (!track) return null;
  const songs = await getSongsByAlbumId(track.albumId);
  return songs.find((song) => song.id === resourceId) ?? null;
}

export async function getSongsCount(albumId?: string) {
  const albumResourceId = albumId ? await resolveMusicResourceId(albumId, "album") : null;
  if (albumId && !albumResourceId) return 0;
  const [result] = await db
    .select({ total: count() })
    .from(tracks)
    .where(albumResourceId ? eq(tracks.albumResourceId, albumResourceId) : undefined);
  return result?.total ?? 0;
}

export async function getNextTrackNumber(albumId: string) {
  const albumResourceId = await resolveMusicResourceId(albumId, "album");
  if (!albumResourceId) return 1;
  const [result] = await db
    .select({ value: max(tracks.trackNumber) })
    .from(tracks)
    .where(eq(tracks.albumResourceId, albumResourceId));
  return (result?.value ?? 0) + 1;
}

export async function getTotalSongsCount() {
  return getSongsCount();
}
