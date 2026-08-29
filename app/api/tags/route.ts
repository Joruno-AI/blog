import { NextRequest, NextResponse } from "next/server";
import { getTagsWithPostCount, createTag } from "@/lib/db/queries/tags";
import { slugify } from "@/lib/utils";


export async function GET() {
  try {
    const tags = await getTagsWithPostCount();
    return NextResponse.json(tags);
  } catch (error) {
    console.error("Error fetching tags:", error);
    return NextResponse.json(
      { error: "Failed to fetch tags" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, slug: customSlug } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const slug = customSlug || slugify(name);

    const tag = await createTag({
      id: crypto.randomUUID(),
      name,
      slug,
    });

    return NextResponse.json(tag, { status: 201 });
  } catch (error) {
    console.error("Error creating tag:", error);
    return NextResponse.json(
      { error: "Failed to create tag" },
      { status: 500 }
    );
  }
}

