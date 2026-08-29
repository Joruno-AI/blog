import { NextRequest, NextResponse } from "next/server";
import { getAlbumBySlug } from "@/lib/db/queries/albums";


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ albumId: string }> }
) {
  try {
    const { albumId } = await params;
    const album = await getAlbumBySlug(albumId);

    if (!album) {
      return NextResponse.json({ error: "Album not found" }, { status: 404 });
    }

    // Only return published albums in public API
    if (!album.published) {
      return NextResponse.json({ error: "Album not found" }, { status: 404 });
    }

    // Transform to match the original JSON format
    const result = {
      id: album.slug,
      name: album.name,
      description: album.description,
      artist: album.artist,
      cover: album.cover,
      color: album.color,
      releaseDate: album.releaseDate?.toISOString().split("T")[0],
      songs: album.songs.map((song) => ({
        id: song.id,
        name: song.name,
        duration: song.duration || "0:00",
        url: song.sourceType === "upload" ? song.url : song.externalUrl,
      })),
    };

    return NextResponse.json(result, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    console.error("Error fetching album:", error);
    return NextResponse.json(
      { error: "Failed to fetch album" },
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
