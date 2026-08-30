import { NextResponse } from "next/server";

import { getAuth } from "@/lib/auth";

const sessionCookiePattern = /(?:^|;\s*)(?:__Secure-)?better-auth\.session_token=/;

/**
 * Defense-in-depth for private route handlers.
 *
 * Middleware remains the primary boundary, but a route must not trust the
 * identity headers injected by middleware on their own: a matcher regression
 * could let a client send those headers directly. Better Auth re-validates the
 * signed cookie and its database session here before a handler reads or mutates
 * Studio data.
 */
export async function requirePlatformEditor(
  request: Request
): Promise<NextResponse | null> {
  const cookie = request.headers.get("cookie") ?? "";
  if (!sessionCookiePattern.test(cookie)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Authorization is a read. Do not let Better Auth's rolling-session update
    // turn a GET-only review request into a write against the shared D1.
    const session = await getAuth().api.getSession({
      headers: request.headers,
      query: { disableRefresh: true },
    });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = session.user.role;
    if (role !== "admin" && role !== "editor") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return null;
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
