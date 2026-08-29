import { NextRequest, NextResponse } from "next/server";

import { getAlbumById, getAlbums, getAlbumsCount } from "@/lib/db/queries/albums";
import { mutationErrorResponse } from "@/lib/http/api-error";
import { createAlbumResource } from "@/modules/music/application/music-service";


export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");
    const published = searchParams.get("published")
      ? searchParams.get("published") === "true"
      : undefined;
    const search = searchParams.get("search") || undefined;
    const [albumRows, total] = await Promise.all([
      getAlbums({ limit, offset, published, search }),
      getAlbumsCount({ published }),
    ]);
    return NextResponse.json({ albums: albumRows, total, limit, offset });
  } catch (error) {
    console.error("Error fetching albums:", error);
    return NextResponse.json({ error: "Failed to fetch albums" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const created = await createAlbumResource(await request.json());
    return NextResponse.json(await getAlbumById(created.id), { status: 201 });
  } catch (error) {
    console.error("Error creating album:", error);
    return mutationErrorResponse(error, "Failed to create album");
  }
}
