import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

import { matchesBearerSecret } from "@/lib/auth/bearer-secret";
import { runPublicContentRebuildOutbox } from "@/modules/jobs/application/public-content-rebuild";
import { runScheduledPublications } from "@/modules/jobs/application/scheduled-publication";


export async function POST(request: NextRequest) {
  if (!(await matchesBearerSecret(request.headers.get("authorization"), process.env.CRON_SECRET))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const requestedLimit = Number.parseInt(request.nextUrl.searchParams.get("limit") || "25", 10);
  let scheduledPublication;
  let scheduledPublicationError: string | null = null;
  try {
    scheduledPublication = await runScheduledPublications(
      Number.isFinite(requestedLimit) ? requestedLimit : 25,
    );
  } catch (error) {
    scheduledPublicationError = error instanceof Error ? error.message : "Unknown failure";
    console.error(JSON.stringify({
      event: "scheduled-publication-runner-failed",
      error: scheduledPublicationError,
    }));
    scheduledPublication = {
      jobId: null,
      scanned: 0,
      published: [],
      skipped: [],
      failed: [],
    };
  }

  const { env } = getCloudflareContext();
  const publicContentRebuild = await runPublicContentRebuildOutbox({
    environment: env,
  });
  if (publicContentRebuild.status === "failed") {
    console.error(JSON.stringify({
      event: "public-content-rebuild-dispatch-failed",
      generation: publicContentRebuild.generation,
      retryAt: publicContentRebuild.retryAt,
      error: publicContentRebuild.error,
    }));
  } else if (publicContentRebuild.status === "submitted") {
    console.info(JSON.stringify({
      event: "public-content-rebuild-submitted",
      generation: publicContentRebuild.generation,
      pendingGeneration: publicContentRebuild.pendingGeneration,
    }));
  }

  const partialFailure = Boolean(
    scheduledPublicationError
    || scheduledPublication.failed.length
    || publicContentRebuild.status === "failed",
  );
  return NextResponse.json({
    ...scheduledPublication,
    runnerError: scheduledPublicationError,
    publicContentRebuild,
  }, { status: partialFailure ? 207 : 200 });
}
