import { NextRequest, NextResponse } from "next/server";

import { getSongById } from "@/lib/db/queries/songs";
import { mutationErrorResponse } from "@/lib/http/api-error";
import {
  archiveTrackResource,
  updateTrackResource,
} from "@/modules/music/application/music-service";


export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const song = await getSongById(id);
    return song
      ? NextResponse.json(song)
      : NextResponse.json({ error: "Song not found" }, { status: 404 });
  } catch (error) {
    console.error("Error fetching song:", error);
    return NextResponse.json({ error: "Failed to fetch song" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await updateTrackResource(id, await request.json());
    return NextResponse.json(await getSongById(id));
  } catch (error) {
    console.error("Error updating song:", error);
    return mutationErrorResponse(error, "Failed to update song");
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const archived = await archiveTrackResource(id);
    return NextResponse.json({ success: true, archived });
  } catch (error) {
    console.error("Error deleting song:", error);
    return mutationErrorResponse(error, "Failed to delete song");
  }
}
