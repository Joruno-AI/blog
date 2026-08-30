import { and, asc, count, eq, max, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { assets, resourceRevisions, resources, tracks } from "@/lib/db/schema";
import { resolveMusicResourceId } from "@/modules/music/application/music-service";
import { publishedMusicVisibilityCondition } from "./music-visibility";
import {
  musicRevisionIntegerOrder,
  trackMutableFieldsFromRevision,
} from "./music-snapshot";

/**
 * Hydrates songs for canonical album resource ids in one D1 statement.
 *
 * Callers that already selected albums from `resources` must use this helper
 * instead of resolving and querying every album separately. The returned row
 * order preserves the per-album order of `getSongsByAlbumId`.
 */
export async function getSongsByAlbumResourceIds(
  albumResourceIds: readonly string[],
  publishedRevision = false,
) {
  const uniqueAlbumResourceIds = [...new Set(albumResourceIds)];
  if (uniqueAlbumResourceIds.length === 0) return [];
  const revisionPointer = publishedRevision
    ? resources.publishedRevisionId
    : resources.currentRevisionId;
  // Bind the ids as one JSON array instead of one placeholder per album. D1's
  // 100-variable ceiling must not turn a growing music catalog back into
  // chunked/N+1 queries.
  const conditions = [sql`${tracks.albumResourceId} in (
    select value from json_each(${JSON.stringify(uniqueAlbumResourceIds)})
  )`];
  if (publishedRevision) {
    conditions.push(
      publishedMusicVisibilityCondition()!,
      eq(resources.type, "track"),
    );
  }
  const trackOrder = publishedRevision
    ? musicRevisionIntegerOrder(
        resourceRevisions.metadataJson,
        "trackNumber",
        tracks.trackNumber,
        { positive: true },
      )
    : tracks.trackNumber;

  const rows = await db
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
      metadataJson: resourceRevisions.metadataJson,
      createdAt: resources.createdAt,
    })
    .from(tracks)
    .innerJoin(resources, eq(resources.id, tracks.resourceId))
    .innerJoin(resourceRevisions, eq(resourceRevisions.id, revisionPointer))
    .leftJoin(assets, eq(assets.id, tracks.audioAssetId))
    .where(and(...conditions))
    .orderBy(
      asc(tracks.albumResourceId),
      asc(trackOrder),
      asc(resourceRevisions.title),
    );

  return rows.map((row) => ({
    ...row,
    ...trackMutableFieldsFromRevision(row.metadataJson, {
      duration: row.duration,
      durationSeconds: row.durationSeconds,
      url: row.url,
      externalUrl: row.externalUrl,
      sourceType: row.sourceType,
      trackNumber: row.trackNumber,
    }),
  }));
}

export async function getSongsByAlbumId(albumId: string, publishedRevision = false) {
  const albumResourceId = await resolveMusicResourceId(albumId, "album");
  if (!albumResourceId) return [];
  return getSongsByAlbumResourceIds([albumResourceId], publishedRevision);
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
