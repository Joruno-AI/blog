import { and, asc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  assets,
  resourceAlbums,
  resourceRevisions,
  resources,
  tracks,
} from "@/lib/db/schema";
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

  const albumTracks = await db
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
        eq(resources.status, "published"),
        eq(resources.visibility, "public")
      )
    )
    .orderBy(asc(tracks.trackNumber), asc(resourceRevisions.title));

  return { resource, ...album, tracks: albumTracks };
}
