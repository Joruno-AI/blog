import { NextResponse } from "next/server";
import { getTagsWithPostCount } from "@/lib/db/queries/tags";


/**
 * Public API endpoint for fetching tags
 * Used by the Astro blog
 */
export async function GET() {
  try {
    const tags = await getTagsWithPostCount();

    return NextResponse.json(tags, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    console.error("Error fetching public tags:", error);
    return NextResponse.json(
      { error: "Failed to fetch tags" },
      { status: 500 }
    );
  }
}

