import { NextRequest, NextResponse } from "next/server";
import { getPostById, getPosts, getPostsCount } from "@/lib/db/queries/posts";
import { createArticle } from "@/modules/articles/application/article-service";
import { mutationErrorResponse } from "@/lib/http/api-error";


export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");
    const categoryId = searchParams.get("categoryId") || undefined;
    const draft = searchParams.get("draft")
      ? searchParams.get("draft") === "true"
      : undefined;
    const search = searchParams.get("search") || undefined;

    const [posts, total] = await Promise.all([
      getPosts({ limit, offset, categoryId, draft, search }),
      getPostsCount({ categoryId, draft }),
    ]);

    return NextResponse.json({
      posts,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Error fetching posts:", error);
    return NextResponse.json(
      { error: "Failed to fetch posts" },
      { status: 500 }
    );
  }
}
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.title || typeof body.content !== "string") {
      return NextResponse.json(
        { error: "Title and content are required" },
        { status: 400 }
      );
    }

    const created = await createArticle(body);
    const post = await getPostById(created.id);

    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    console.error("Error creating post:", error);
    return mutationErrorResponse(error, "Failed to create post");
  }
}
