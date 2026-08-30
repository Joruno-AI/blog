import { NextResponse } from "next/server";

import {
  getPublicChangelogResourceBySlug,
  getPublicResource,
} from "@/modules/resources/application/queries";


export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const resourcePath = `/${path.map((segment) => decodeURIComponent(segment)).join("/")}`;
  const changelogSlug = resourcePath.match(/^\/changelog\/([^/]+)$/)?.[1];
  const resource = await getPublicResource(resourcePath)
    ?? (changelogSlug
      ? await getPublicChangelogResourceBySlug(changelogSlug)
      : null);

  if (!resource) {
    return NextResponse.json({ error: "Resource not found" }, { status: 404 });
  }

  return NextResponse.json(resource, {
    headers: {
      "Cache-Control": "private, no-store",
    },
  });
}
