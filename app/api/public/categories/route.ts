import { NextResponse } from "next/server";
import { getCategoriesTreeWithPaths } from "@/lib/db/queries/categories";


/**
 * Public API endpoint for fetching categories
 * Used by the Astro blog
 *
 * Returns enhanced category tree with:
 * - path: full slug path (e.g., "frontend/react")
 * - level: depth in tree (0 = root)
 * - postCount: direct posts count
 * - totalPostCount: posts including all descendants
 * - children: nested subcategories
 */
export async function GET() {
  try {
    const categories = await getCategoriesTreeWithPaths();

    return NextResponse.json(categories, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    console.error("Error fetching public categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}

