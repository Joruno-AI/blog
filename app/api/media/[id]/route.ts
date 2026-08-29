import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { mutationErrorResponse } from "@/lib/http/api-error";
import { deleteAsset, renameAsset } from "@/modules/assets/application/asset-service";


const renameSchema = z.object({ name: z.string().trim().min(1).max(500) });

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { name } = renameSchema.parse(await request.json());
    await renameAsset(id, name);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating media:", error);
    return mutationErrorResponse(error, "Failed to update media");
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await deleteAsset(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting media:", error);
    return mutationErrorResponse(error, "Failed to delete media");
  }
}
