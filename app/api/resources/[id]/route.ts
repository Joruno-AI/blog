import { NextRequest, NextResponse } from "next/server";

import { mutationErrorResponse } from "@/lib/http/api-error";
import { getStudioResource } from "@/modules/resources/application/queries";
import {
  archiveGenericResource,
  updateGenericResource,
} from "@/modules/resources/application/resource-service";


export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const resource = await getStudioResource(id);
    return resource
      ? NextResponse.json(resource)
      : NextResponse.json({ error: "Resource not found" }, { status: 404 });
  } catch (error) {
    console.error("Error fetching resource:", error);
    return NextResponse.json({ error: "Failed to fetch resource" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await updateGenericResource(id, await request.json());
    return NextResponse.json(await getStudioResource(id));
  } catch (error) {
    console.error("Error updating resource:", error);
    return mutationErrorResponse(error, "Failed to update resource");
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const archived = await archiveGenericResource(id);
    return NextResponse.json({ success: true, archived });
  } catch (error) {
    console.error("Error deleting resource:", error);
    return mutationErrorResponse(error, "Failed to delete resource");
  }
}
