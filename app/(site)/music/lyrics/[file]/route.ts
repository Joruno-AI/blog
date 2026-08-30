import { getAlbumBySlug } from "@/lib/db/queries/albums";
import { legacyMusicSongState } from "@/lib/parity/music";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ file: string }> },
) {
  const file = decodeURIComponent((await params).file);
  const slug = file.replace(/\.json$/, "");
  const album = await getAlbumBySlug(slug);
  if (!album || !album.published) {
    return Response.json({ error: "Album not found" }, { status: 404 });
  }
  const lyrics = Object.fromEntries(
    album.songs
      .map((song) => {
        const source = song.sourceType === "upload" ? song.url : song.externalUrl;
        return {
          song,
          state: legacyMusicSongState({
            id: song.id,
            url: source,
            lyrics: song.lyrics,
            metadataJson: song.metadataJson,
          }),
        };
      })
      .filter(({ song, state }) => state.hasLyrics && Boolean(song.lyrics?.trim()))
      .map(({ song, state }) => [state.id, song.lyrics!.trim()]),
  );
  return Response.json(lyrics, {
    headers: { "Cache-Control": "public, max-age=0, must-revalidate" },
  });
}
