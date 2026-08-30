import { NextRequest, NextResponse } from "next/server";
import { getPublicPostBySlug } from "@/lib/db/queries/posts";


/**
 * Public API endpoint for fetching a single post by slug
 * Used by the Astro blog to fetch content
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // Decode the slug in case it contains URL-encoded characters
    const decodedSlug = decodeURIComponent(slug);

    // Unlisted posts preserve the historical direct-link contract, while
    // private revisions remain inaccessible to anonymous callers.
    const post = await getPublicPostBySlug(decodedSlug, { allowUnlisted: true });

    if (!post || post.draft) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Add CORS headers for external access
    return NextResponse.json(post, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    console.error("Error fetching public post:", error);
    return NextResponse.json(
      { error: "Failed to fetch post" },
      { status: 500 }
    );
  }
}
