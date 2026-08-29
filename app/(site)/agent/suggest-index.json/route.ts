import type { NextRequest } from "next/server";

export function GET(request: NextRequest) {
  return Response.redirect(new URL("/agent/suggest-index.static.json", request.url), 307);
}
