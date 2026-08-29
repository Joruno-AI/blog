import { NextResponse } from "next/server";

export function GET(request: Request) {
  return NextResponse.redirect(new URL("/docs/catalog.static.json", request.url), 307);
}
