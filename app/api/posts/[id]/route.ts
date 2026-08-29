import { NextRequest, NextResponse } from "next/server";
import {
  getPostById,
} from "@/lib/db/queries/posts";
import {
  archiveArticles,
  updateArticle,
} from "@/modules/articles/application/article-service";
import { mutationErrorResponse } from "@/lib/http/api-error";


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const post = await getPostById(id);

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    return NextResponse.json(post);
  } catch (error) {
    console.error("Error fetching post:", error);
    return NextResponse.json(
      { error: "Failed to fetch post" },
      { status: 500 }
    );
  }
}
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    await updateArticle(id, body);
    const post = await getPostById(id);

    return NextResponse.json(post);
  } catch (error) {
    console.error("Error updating post:", error);
    return mutationErrorResponse(error, "Failed to update post");
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await archiveArticles([id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting post:", error);
    return mutationErrorResponse(error, "Failed to delete post");
  }
}
