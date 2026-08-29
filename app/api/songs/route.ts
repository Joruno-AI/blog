import { NextRequest, NextResponse } from "next/server";

import { getSongById } from "@/lib/db/queries/songs";
import { mutationErrorResponse } from "@/lib/http/api-error";
import { createTrackResource } from "@/modules/music/application/music-service";


export async function POST(request: NextRequest) {
  try {
    const created = await createTrackResource(await request.json());
    return NextResponse.json(await getSongById(created.id), { status: 201 });
  } catch (error) {
    console.error("Error creating song:", error);
    return mutationErrorResponse(error, "Failed to create song");
  }
}
