import { NextRequest, NextResponse } from "next/server";
import { count, like } from "drizzle-orm";

import { db } from "@/lib/db";
import { assets } from "@/lib/db/schema";
import { listAssets } from "@/modules/assets/application/asset-service";


export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "100"), 1), 1_000);
    const offset = Math.max(parseInt(searchParams.get("offset") || "0"), 0);
    const typeFilter = searchParams.get("type") || "image";
    const [assetRows, result] = await Promise.all([
      listAssets({ limit, offset, mimePrefix: typeFilter }),
      db.select({ total: count() }).from(assets).where(like(assets.mimeType, `${typeFilter}%`)),
    ]);
    return NextResponse.json(
      {
        photos: assetRows.map((asset) => ({
          id: asset.id.replace(/^asset:/, ""),
          url: asset.url,
          name: asset.name,
          type: asset.mimeType ?? asset.mediaType,
          size: asset.size,
          createdAt: asset.createdAt.toISOString(),
        })),
        total: result[0]?.total ?? 0,
        limit,
        offset,
      },
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET",
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (error) {
    console.error("Error fetching public media:", error);
    return NextResponse.json({ error: "Failed to fetch media" }, { status: 500 });
  }
}
