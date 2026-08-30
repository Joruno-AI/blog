import { NextRequest, NextResponse } from "next/server";

import { matchesBearerSecret } from "@/lib/auth/bearer-secret";
import { acknowledgePublicContentRebuildDeployment } from "@/modules/jobs/application/public-content-rebuild";

export async function POST(request: NextRequest) {
  if (!(await matchesBearerSecret(request.headers.get("authorization"), process.env.CRON_SECRET))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload: unknown = await request.json().catch(() => null);
  const generation = payload && typeof payload === "object" && !Array.isArray(payload)
    ? (payload as { generation?: unknown }).generation
    : null;
  if (typeof generation !== "number" || !Number.isSafeInteger(generation) || generation <= 0) {
    return NextResponse.json(
      { error: "generation must be a positive safe integer" },
      { status: 400 },
    );
  }

  const state = await acknowledgePublicContentRebuildDeployment(generation);
  if (!state) {
    return NextResponse.json(
      { error: "The generation was not submitted by the public rebuild outbox." },
      { status: 409 },
    );
  }

  console.info(JSON.stringify({
    event: "public-content-rebuild-deployed",
    acknowledgedGeneration: generation,
    generation: state.generation,
    submittedGeneration: state.submittedGeneration,
    deployedGeneration: state.deployedGeneration,
    status: state.status,
  }));

  return NextResponse.json({
    acknowledgement: "accepted",
    acknowledgedGeneration: generation,
    ...state,
  });
}
