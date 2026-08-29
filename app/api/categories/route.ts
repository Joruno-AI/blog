import { NextRequest, NextResponse } from "next/server";
import {
  getCategoriesWithPostCount,
  createCategory,
} from "@/lib/db/queries/categories";
import { slugify } from "@/lib/utils";


export async function GET() {
  try {
    const categories = await getCategoriesWithPostCount();
    return NextResponse.json(categories);
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, slug: customSlug, description, parentId, order } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const slug = customSlug || slugify(name);

    const category = await createCategory({
      id: crypto.randomUUID(),
      name,
      slug,
      description,
      parentId,
      order: order || 0,
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error("Error creating category:", error);
    return NextResponse.json(
      { error: "Failed to create category" },
      { status: 500 }
    );
  }
}

