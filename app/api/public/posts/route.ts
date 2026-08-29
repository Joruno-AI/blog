import { NextRequest, NextResponse } from "next/server";
import { getPosts, getPostsCount, getPostsWithCategoryPath } from "@/lib/db/queries/posts";


/**
 * Public API endpoint for fetching published posts
 * Used by the Astro blog to fetch content
 *
 * Query params:
 * - limit: number of posts to fetch (default: 100)
 * - offset: pagination offset (default: 0)
 * - categoryId: filter by category (includes descendants)
 * - categoryPath: filter by category path (e.g., "frontend/react", includes descendants)
 * - includeContent: if "true", returns full post data with content, relations, and categoryPath
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");
    const categoryId = searchParams.get("categoryId") || undefined;
    const categoryPath = searchParams.get("categoryPath") || undefined;
    const includeContent = searchParams.get("includeContent") === "true";

    // Fetch posts with or without full content
    let postsResult;
    if (includeContent) {
      // Use enhanced query that includes categoryPath
      postsResult = await getPostsWithCategoryPath({
        limit,
        offset,
        categoryId,
        categoryPath,
        draft: false,
      });
    } else {
      postsResult = await getPosts({ limit, offset, categoryId, draft: false });
    }

    const total = await getPostsCount({ categoryId, draft: false });

    // Add CORS headers for external access
    return NextResponse.json(
      {
        posts: postsResult,
        total,
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
    console.error("Error fetching public posts:", error);
    return NextResponse.json(
      { error: "Failed to fetch posts" },
      { status: 500 }
    );
  }
}
