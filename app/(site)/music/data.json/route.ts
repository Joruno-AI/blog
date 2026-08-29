import { getAlbumsWithSongs } from "@/lib/db/queries/albums";
export const dynamic = "force-dynamic";
export async function GET() {
  const data = await getAlbumsWithSongs({ published: true });
  const albums = data.map((album) => ({ id: album.slug, name: album.name, description: album.description, artist: album.artist, cover: album.cover, color: album.color, songs: album.songs.map((song) => ({ id: song.id, name: song.name, duration: song.duration || "0:00", url: song.sourceType === "upload" ? song.url : song.externalUrl })) }));
  return Response.json({ albums, total: albums.length }, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600" } });
}
