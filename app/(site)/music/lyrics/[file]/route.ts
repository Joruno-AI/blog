import { getAlbumBySlug } from "@/lib/db/queries/albums";
export const dynamic = "force-dynamic";
export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const file = decodeURIComponent((await params).file);
  const slug = file.replace(/\.json$/, "");
  const album = await getAlbumBySlug(slug);
  if (!album || !album.published) return Response.json({ error: "Album not found" }, { status: 404 });
  return Response.json({ album: album.slug, lyrics: Object.fromEntries(album.songs.map((song) => [song.id, song.lyrics ?? ""])) }, { headers: { "Cache-Control": "public, s-maxage=300" } });
}
