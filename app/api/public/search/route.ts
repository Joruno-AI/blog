import { NextResponse } from "next/server";

import {
  parsePublicSearchCollection,
  searchPublicResources,
} from "@/modules/resources/application/queries";


export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const query = searchParams.get("q")?.trim().slice(0, 120) ?? "";
  const collection = parsePublicSearchCollection(searchParams.get("collection"));
  if (!collection) {
    return NextResponse.json(
      { error: "collection must be either blog or changelog" },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }
  const results = query
    ? await searchPublicResources(query, collection, 50)
    : [];
  const resources = results.map((result) => ({
    id: result.id,
    type: result.type,
    title: result.title,
    slug: result.slug,
    path: result.path,
    description: result.description,
    publishedAt: result.publishedAt?.toISOString() ?? null,
  }));

  return NextResponse.json(
    { query, collection, total: resources.length, resources },
    {
      headers: {
        "Cache-Control": "public, max-age=60, s-maxage=300",
        "X-Content-Type-Options": "nosniff",
      },
    }
  );
}
