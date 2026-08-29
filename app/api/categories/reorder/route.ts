import { NextRequest, NextResponse } from "next/server";
import { updateCategoriesOrder } from "@/lib/db/queries/categories";


/**
 * Batch update category orders and parent relationships
 * Used for drag & drop reordering in the admin panel
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { updates } = body as {
      updates: Array<{ id: string; parentId: string | null; order: number }>;
    };

    if (!updates || !Array.isArray(updates)) {
      return NextResponse.json(
        { error: "Invalid request body. Expected { updates: Array<{ id, parentId, order }> }" },
        { status: 400 }
      );
    }

    // Validate each update
    for (const update of updates) {
      if (!update.id || typeof update.order !== "number") {
        return NextResponse.json(
          { error: "Each update must have id and order fields" },
          { status: 400 }
        );
      }
    }

    await updateCategoriesOrder(updates);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error reordering categories:", error);
    return NextResponse.json(
      { error: "Failed to reorder categories" },
      { status: 500 }
    );
  }
}
