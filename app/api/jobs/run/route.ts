import { NextRequest, NextResponse } from "next/server";

import { matchesBearerSecret } from "@/lib/auth/bearer-secret";
import { runScheduledPublications } from "@/modules/jobs/application/scheduled-publication";


export async function POST(request: NextRequest) {
  if (!(await matchesBearerSecret(request.headers.get("authorization"), process.env.CRON_SECRET))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const requestedLimit = Number.parseInt(request.nextUrl.searchParams.get("limit") || "25", 10);
    const result = await runScheduledPublications(Number.isFinite(requestedLimit) ? requestedLimit : 25);
    return NextResponse.json(result, { status: result.failed.length ? 207 : 200 });
  } catch (error) {
    console.error("Scheduled publication runner failed", error);
    return NextResponse.json({ error: "Scheduled publication runner failed" }, { status: 500 });
  }
}
