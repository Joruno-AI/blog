import { NextResponse } from "next/server";

import { getPublicResource } from "@/modules/resources/application/queries";


export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const resource = await getPublicResource(
    `/${path.map((segment) => decodeURIComponent(segment)).join("/")}`
  );

  if (!resource) {
    return NextResponse.json({ error: "Resource not found" }, { status: 404 });
  }

  return NextResponse.json(resource, {
    headers: {
      "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=3600",
    },
  });
}
