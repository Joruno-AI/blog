import { and, asc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  assets,
  resourceAlbums,
  resourceRevisions,
  resources,
  tracks,
} from "@/lib/db/schema";
import { publishedMusicVisibilityCondition } from "@/lib/db/queries/music-visibility";
import {
  albumMutableFieldsFromRevision,
  musicRevisionIntegerOrder,
  trackMutableFieldsFromRevision,
} from "@/lib/db/queries/music-snapshot";
import { getPublicResource } from "@/modules/resources/application/queries";

export async function getPublicAlbum(
  path: string,
  viewer: Parameters<typeof getPublicResource>[1] = null
) {
  const resource = await getPublicResource(path, viewer);
  if (!resource || resource.type !== "album") return null;

  const [album] = await db
    .select({
      artist: resourceAlbums.artist,
      color: resourceAlbums.color,
      releaseDate: resourceAlbums.releaseDate,
      coverUrl: assets.url,
    })
    .from(resourceAlbums)
    .innerJoin(resources, eq(resources.id, resourceAlbums.resourceId))
    .leftJoin(assets, eq(assets.id, resources.coverAssetId))
    .where(eq(resourceAlbums.resourceId, resource.id))
    .limit(1);

  if (!album) return null;

  const albumSnapshot = albumMutableFieldsFromRevision(resource.metadataJson, {
    artist: album.artist,
    color: album.color,
    cover: album.coverUrl,
    order: 0,
    releaseDate: album.releaseDate,
  });

  const albumTrackRows = await db
    .select({
      id: resources.id,
      title: resourceRevisions.title,
      path: resourceRevisions.path,
      duration: tracks.duration,
      durationSeconds: tracks.durationSeconds,
      trackNumber: tracks.trackNumber,
      lyrics: resourceRevisions.content,
      audioUrl: assets.url,
      externalUrl: tracks.externalUrl,
      sourceType: tracks.sourceType,
      metadataJson: resourceRevisions.metadataJson,
    })
    .from(tracks)
    .innerJoin(resources, eq(resources.id, tracks.resourceId))
    .innerJoin(
      resourceRevisions,
      eq(resourceRevisions.id, resources.publishedRevisionId)
    )
    .leftJoin(assets, eq(assets.id, tracks.audioAssetId))
    .where(
      and(
        eq(tracks.albumResourceId, resource.id),
        publishedMusicVisibilityCondition(),
      )
    )
    .orderBy(
      asc(musicRevisionIntegerOrder(
        resourceRevisions.metadataJson,
        "trackNumber",
        tracks.trackNumber,
        { positive: true },
      )),
      asc(resourceRevisions.title),
    );

  const albumTracks = albumTrackRows.map((track) => {
    const snapshot = trackMutableFieldsFromRevision(track.metadataJson, {
      duration: track.duration,
      durationSeconds: track.durationSeconds,
      url: track.audioUrl,
      externalUrl: track.externalUrl,
      sourceType: track.sourceType,
      trackNumber: track.trackNumber,
    });
    return {
      id: track.id,
      title: track.title,
      path: track.path,
      lyrics: track.lyrics,
      duration: snapshot.duration,
      durationSeconds: snapshot.durationSeconds,
      trackNumber: snapshot.trackNumber,
      audioUrl: snapshot.url,
      externalUrl: snapshot.externalUrl,
      sourceType: snapshot.sourceType,
    };
  });

  return {
    resource,
    artist: albumSnapshot.artist,
    color: albumSnapshot.color,
    releaseDate: albumSnapshot.releaseDate,
    coverUrl: albumSnapshot.cover,
    tracks: albumTracks,
  };
}
