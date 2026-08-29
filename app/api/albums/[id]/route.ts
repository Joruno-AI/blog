import { NextRequest, NextResponse } from "next/server";

import { getAlbumById } from "@/lib/db/queries/albums";
import { mutationErrorResponse } from "@/lib/http/api-error";
import {
  archiveAlbumResource,
  updateAlbumResource,
} from "@/modules/music/application/music-service";


export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const album = await getAlbumById(id);
    return album
      ? NextResponse.json(album)
      : NextResponse.json({ error: "Album not found" }, { status: 404 });
  } catch (error) {
    console.error("Error fetching album:", error);
    return NextResponse.json({ error: "Failed to fetch album" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await updateAlbumResource(id, await request.json());
    return NextResponse.json(await getAlbumById(id));
  } catch (error) {
    console.error("Error updating album:", error);
    return mutationErrorResponse(error, "Failed to update album");
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const archived = await archiveAlbumResource(id);
    return NextResponse.json({ success: true, archived });
  } catch (error) {
    console.error("Error deleting album:", error);
    return mutationErrorResponse(error, "Failed to delete album");
  }
}
