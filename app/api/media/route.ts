import { NextRequest, NextResponse } from "next/server";

import { mutationErrorResponse } from "@/lib/http/api-error";
import { assetDto, createAsset, listAssets } from "@/modules/assets/application/asset-service";


export async function GET() {
  try {
    return NextResponse.json((await listAssets()).map(assetDto));
  } catch (error) {
    console.error("Error fetching media:", error);
    return NextResponse.json({ error: "Failed to fetch media" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (file.size > 100 * 1024 * 1024) {
      return NextResponse.json({ error: "File exceeds the 100 MB upload limit" }, { status: 413 });
    }
    return NextResponse.json(assetDto(await createAsset(file)), { status: 201 });
  } catch (error) {
    console.error("Error uploading file:", error);
    return mutationErrorResponse(error, "Failed to upload file");
  }
}
