import { NextResponse } from "next/server";

import { searchPublicResources } from "@/modules/resources/application/queries";


export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim().slice(0, 120) ?? "";
  const results = query ? await searchPublicResources(query, 50) : [];

  return NextResponse.json(
    { query, total: results.length, resources: results },
    { headers: { "Cache-Control": "public, max-age=60, s-maxage=300" } }
  );
}
