import {
  albumMutableFieldsFromRevision,
  trackMutableFieldsFromRevision,
} from "@/lib/db/queries/music-snapshot";
import {
  buildLegacyMusicCatalog,
  type MusicCatalogPayload,
  type MusicCatalogSourceSong,
} from "@/lib/parity/music";

export type PublicMusicAlbumBuildRow = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  metadataJson: string;
  artist: string;
  cover: string | null;
  color: string | null;
  releaseDate: number | null;
  sortOrder: number;
  createdAt: number;
};

export type PublicMusicTrackBuildRow = {
  id: string;
  albumId: string;
  title: string;
  metadataJson: string;
  lyrics: string;
  duration: string | null;
  durationSeconds: number | null;
  audioUrl: string | null;
  externalUrl: string | null;
  sourceType: "upload" | "external";
  trackNumber: number;
};

function dateFromD1(seconds: number | null) {
  return seconds === null ? null : new Date(seconds * 1_000);
}

function compareText(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0;
}

/**
 * Rebuilds the immutable Astro-compatible music endpoint from the published
 * revision pointers selected in D1. The normalized music tables are fallback
 * data only for revisions created before complete snapshots were introduced.
 */
export function publicMusicCatalogFromBuildRows(
  albumRows: readonly PublicMusicAlbumBuildRow[],
  trackRows: readonly PublicMusicTrackBuildRow[],
): MusicCatalogPayload {
  const songsByAlbum = new Map<string, Array<MusicCatalogSourceSong & { trackNumber: number }>>();

  for (const row of trackRows) {
    const snapshot = trackMutableFieldsFromRevision(row.metadataJson, {
      duration: row.duration,
      durationSeconds: row.durationSeconds,
      url: row.audioUrl,
      externalUrl: row.externalUrl,
      sourceType: row.sourceType,
      trackNumber: row.trackNumber,
    });
    const songs = songsByAlbum.get(row.albumId) ?? [];
    songs.push({
      id: row.id,
      name: row.title,
      duration: snapshot.duration,
      sourceType: snapshot.sourceType,
      url: snapshot.url,
      externalUrl: snapshot.externalUrl,
      lyrics: row.lyrics,
      metadataJson: row.metadataJson,
      trackNumber: snapshot.trackNumber,
    });
    songsByAlbum.set(row.albumId, songs);
  }

  const albums = albumRows.map((row) => {
    const snapshot = albumMutableFieldsFromRevision(row.metadataJson, {
      artist: row.artist,
      cover: row.cover,
      color: row.color,
      order: row.sortOrder,
      releaseDate: dateFromD1(row.releaseDate),
    });
    const songs = songsByAlbum.get(row.id) ?? [];
    songs.sort((left, right) => left.trackNumber - right.trackNumber || compareText(left.name, right.name));
    return {
      id: row.id,
      slug: row.slug,
      name: row.title,
      description: row.description,
      artist: snapshot.artist,
      cover: snapshot.cover,
      color: snapshot.color,
      releaseDate: snapshot.releaseDate,
      order: snapshot.order,
      createdAt: row.createdAt,
      songs,
    };
  });

  albums.sort((left, right) => left.order - right.order
    || right.createdAt - left.createdAt
    || compareText(left.id, right.id));

  return buildLegacyMusicCatalog(albums);
}
