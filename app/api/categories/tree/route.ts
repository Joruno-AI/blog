import { NextResponse } from "next/server";
import { getCategoriesTreeWithPaths } from "@/lib/db/queries/categories";


/**
 * Internal API endpoint for fetching categories as tree
 * Used by the admin dashboard
 */
export async function GET() {
  try {
    const categories = await getCategoriesTreeWithPaths();
    return NextResponse.json(categories);
  } catch (error) {
    console.error("Error fetching categories tree:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}
