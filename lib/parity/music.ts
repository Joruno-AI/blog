import musicQualityData from "@/lib/parity/data/music-quality-data.json";

export type PlaybackMode = "order" | "shuffle" | "repeat-all" | "repeat-one";

export interface PublicMusicQuality {
  incomplete: boolean;
  lyricsMismatch: boolean;
  actualSeconds: number;
  expectedSeconds: number;
  studioStatus: string;
  fingerprintSimilarity: number | null;
  lyricsAlignmentStatus: string;
}

export interface PublicMusicSong {
  id: string;
  name: string;
  duration: string;
  url: string | null;
  hasLyrics: boolean;
  quality: PublicMusicQuality | null;
}

export interface PublicMusicAlbum {
  id: string;
  name: string;
  description: string | null;
  artist: string;
  cover: string | null;
  color: string;
  releaseDate: string | null;
  songs: PublicMusicSong[];
}

export interface MusicCatalogPayload {
  albums: PublicMusicAlbum[];
}

export interface MusicCatalogSourceSong {
  id: string;
  name: string;
  duration: string | null;
  sourceType: string;
  url: string | null;
  externalUrl: string | null;
  lyrics?: string | null;
  metadataJson?: string;
}

export interface MusicCatalogSourceAlbum {
  slug: string;
  name: string;
  artist: string;
  description: string | null;
  cover: string | null;
  color: string | null;
  releaseDate: Date | string | null;
  songs: MusicCatalogSourceSong[];
}

type MusicQualityEntry = {
  studioUrl: string | null;
  quality: PublicMusicQuality;
  lyricsVerified: boolean;
};

const qualityBySong = musicQualityData as Record<string, MusicQualityEntry>;

function sourceSongMetadata(value: string | undefined) {
  if (!value) return {};
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

function sourceMusicQuality(value: unknown): PublicMusicQuality | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const quality = value as Record<string, unknown>;
  if (
    typeof quality.incomplete !== "boolean"
    || typeof quality.lyricsMismatch !== "boolean"
    || typeof quality.actualSeconds !== "number"
    || typeof quality.expectedSeconds !== "number"
    || typeof quality.studioStatus !== "string"
    || !(typeof quality.fingerprintSimilarity === "number" || quality.fingerprintSimilarity === null)
    || typeof quality.lyricsAlignmentStatus !== "string"
  ) return null;
  return quality as unknown as PublicMusicQuality;
}

export interface LyricLine {
  time: number;
  text: string;
}

export const MUSIC_CATALOG_ENDPOINT = "/music/data.json";
export const MUSIC_DEFAULT_COLOR = "#1a1a2e";
export const MUSIC_PLAYBACK_RATES = [0.5, 1, 1.5, 2] as const;

export function parseLrc(source: string | null | undefined): LyricLine[] {
  if (!source) return [];
  const output: LyricLine[] = [];
  for (const rawLine of source.split(/\r?\n/)) {
    const timestamps = [...rawLine.matchAll(/\[(\d{1,3}):(\d{2}(?:\.\d+)?)\]/g)];
    const text = rawLine.replace(/\[[^\]]+\]/g, "").trim();
    if (!text) continue;
    for (const timestamp of timestamps) {
      output.push({
        time: Number(timestamp[1]) * 60 + Number(timestamp[2]),
        text,
      });
    }
  }
  return output.sort((left, right) => left.time - right.time);
}

export function formatMusicTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}

export function parseMusicDuration(duration: string | null | undefined) {
  if (!duration) return 0;
  const parts = duration.split(":").map(Number);
  if (!parts.length || parts.some((part) => !Number.isFinite(part) || part < 0)) return 0;
  return parts.reduce((total, part) => total * 60 + part, 0);
}

export function legacyMusicSongId(id: string) {
  return id.replace(/^track:/, "");
}

/** Applies the exact public audio/lyrics validation gates used by the Astro route. */
export function legacyMusicSongState({
  id,
  url,
  lyrics,
  metadataJson,
}: {
  id: string;
  url: string | null;
  lyrics?: string | null;
  metadataJson?: string;
}): Pick<PublicMusicSong, "id" | "url" | "hasLyrics" | "quality"> {
  const publicId = legacyMusicSongId(id);
  const metadata = sourceSongMetadata(metadataJson);
  const explicitQuality = sourceMusicQuality(metadata.quality);
  const explicitLyrics = typeof metadata.hasLyrics === "boolean"
    ? metadata.hasLyrics
    : typeof metadata.lyricsVerified === "boolean"
      ? metadata.lyricsVerified
      : null;

  // New CMS content and deliberate URL replacements are authoritative. The
  // immutable Astro snapshot is only a compatibility fallback while the id
  // and studio URL still identify the exact legacy recording. The first
  // migration intentionally stored blocked legacy audio as a null track URL;
  // its revision is still identifiable by `legacySongId` until Studio writes
  // the complete mutable track snapshot.
  const entry = qualityBySong[publicId];
  const legacyRevision = typeof metadata.legacySongId === "string"
    && legacyMusicSongId(metadata.legacySongId) === publicId
    && !["url", "externalUrl", "sourceType", "quality", "hasLyrics", "lyricsVerified"]
      .some((field) => Object.prototype.hasOwnProperty.call(metadata, field));
  const exactLegacyRecording = Boolean(entry)
    && (entry.studioUrl === url || legacyRevision);
  if (!exactLegacyRecording || explicitQuality || explicitLyrics !== null) {
    const quality = explicitQuality;
    return {
      id: publicId,
      url: quality?.incomplete ? null : url,
      hasLyrics: Boolean(lyrics?.trim())
        && (explicitLyrics ?? !quality?.lyricsMismatch),
      quality,
    };
  }

  const quality = entry?.quality ?? null;
  const studioVerified = Boolean(url)
    && entry?.studioUrl === url
    && quality?.studioStatus === "verified-studio-master";
  const audioUnavailable = Boolean(quality?.incomplete) || (Boolean(url) && !studioVerified);
  return {
    id: publicId,
    url: audioUnavailable ? null : url,
    hasLyrics: !quality?.lyricsMismatch
      && (!url || studioVerified)
      && entry?.lyricsVerified === true,
    quality,
  };
}

/** Serializes CMS/D1 rows to the byte-contract shape exposed by the Astro endpoint. */
export function buildLegacyMusicCatalog(
  rows: readonly MusicCatalogSourceAlbum[],
): MusicCatalogPayload {
  return {
    albums: rows.map((album) => ({
      id: album.slug,
      name: album.name,
      artist: album.artist,
      description: album.description?.trim() || null,
      cover: album.cover,
      color: album.color || MUSIC_DEFAULT_COLOR,
      releaseDate: album.releaseDate instanceof Date
        ? album.releaseDate.toISOString()
        : album.releaseDate,
      songs: album.songs.map((song) => {
        const source = song.sourceType === "upload" ? song.url : song.externalUrl;
        const state = legacyMusicSongState({
          id: song.id,
          url: source,
          lyrics: song.lyrics,
          metadataJson: song.metadataJson,
        });
        return {
          id: state.id,
          name: song.name,
          duration: song.duration || "0:00",
          url: state.url,
          hasLyrics: state.hasLyrics,
          quality: state.quality,
        };
      }),
    })),
  };
}

export function galleryCover(cover: string | null) {
  if (!cover) return "/joruno.png";
  return cover.replace(/\/\d+x\d+bb\.(jpe?g|png|webp)$/i, "/360x360bb.$1");
}

export function playableIndexes(album: PublicMusicAlbum | null) {
  if (!album) return [];
  return album.songs.flatMap((song, index) => (song.url ? [index] : []));
}

export function resolveAdjacentTrack({
  album,
  currentIndex,
  direction,
  mode,
  random = Math.random,
}: {
  album: PublicMusicAlbum | null;
  currentIndex: number;
  direction: 1 | -1;
  mode: PlaybackMode;
  random?: () => number;
}): number | null {
  if (!album) return null;
  const playable = playableIndexes(album);
  if (!playable.length) return null;

  if (mode === "shuffle") {
    const alternatives = playable.filter((index) => index !== currentIndex);
    const pool = alternatives.length ? alternatives : playable;
    return pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))] ?? null;
  }

  const next = direction === 1
    ? playable.find((index) => index > currentIndex)
    : [...playable].reverse().find((index) => index < currentIndex);
  if (next !== undefined) return next;

  if (mode !== "repeat-all") return null;
  return direction === 1 ? playable[0] : playable.at(-1) ?? null;
}

export function firstPlayableTrack(album: PublicMusicAlbum | null) {
  return album?.songs.findIndex((song) => Boolean(song.url)) ?? -1;
}

export function isExactMusicRoute(pathname: string) {
  return /^\/music\/?$/.test(pathname);
}
