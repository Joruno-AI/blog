import { MusicExperience, type PublicMusicAlbum } from "@/components/site/music-experience";
import { getAlbumsWithSongs } from "@/lib/db/queries/albums";

export const dynamic = "force-dynamic";

export default async function MusicPage() {
  const rows = await getAlbumsWithSongs({ published: true });
  const albums: PublicMusicAlbum[] = rows.map((album) => ({
    id: album.id,
    slug: album.slug,
    name: album.name,
    description: album.description,
    artist: album.artist,
    cover: album.cover,
    color: album.color,
    releaseDate: album.releaseDate?.toISOString() ?? null,
    songs: album.songs.map((song) => ({
      id: song.id,
      name: song.name,
      duration: song.duration,
      durationSeconds: song.durationSeconds,
      url: song.sourceType === "upload" ? song.url : song.externalUrl,
      lyrics: song.lyrics,
    })),
  }));
  return <MusicExperience albums={albums} />;
}
