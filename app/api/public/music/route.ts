import { NextResponse } from "next/server";
import { getAlbumsWithSongs } from "@/lib/db/queries/albums";


export async function GET() {
  try {
    // Anonymous callers never get a draft override. Public visibility is
    // enforced again inside the album and track queries.
    const albumsData = await getAlbumsWithSongs({ published: true });

    // Transform to match the original JSON format from the blog project
    const albums = albumsData.map((album) => ({
      id: album.slug, // Use slug as id for compatibility
      name: album.name,
      description: album.description,
      artist: album.artist,
      cover: album.cover,
      color: album.color,
      songs: album.songs.map((song) => ({
        id: song.id,
        name: song.name,
        duration: song.duration || "0:00",
        url: song.sourceType === "upload" ? song.url : song.externalUrl,
      })),
    }));

    return NextResponse.json(
      { albums, total: albums.length },
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET",
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (error) {
    console.error("Error fetching public music:", error);
    return NextResponse.json(
      { error: "Failed to fetch music" },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
