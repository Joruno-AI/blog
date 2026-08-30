type RateLimitBinding = {
  limit(input: { key: string }): Promise<{ success: boolean }>;
};

type AgentRateLimitEnvironment = {
  AGENT_RATE_LIMITER?: RateLimitBinding;
};

function agentApiGroup(pathname: string) {
  if (pathname.startsWith("/api/agent/github/")) return "github";
  if (pathname.startsWith("/api/zread/")) return "zread";
  return "";
}

export async function agentRateLimitResponse(
  request: Request,
  environment: AgentRateLimitEnvironment,
): Promise<Response | null> {
  const group = agentApiGroup(new URL(request.url).pathname);
  if (!group || !environment.AGENT_RATE_LIMITER) return null;

  const actor = request.headers.get("cf-connecting-ip")?.trim() || "anonymous";
  try {
    const { success } = await environment.AGENT_RATE_LIMITER.limit({ key: `${actor}:${group}` });
    if (success) return null;
  } catch {
    // Availability of the catalog itself must not depend on the limiter API.
    return null;
  }

  return Response.json(
    { error: "请求过于频繁，请稍后重试。" },
    {
      status: 429,
      headers: {
        "cache-control": "no-store",
        "retry-after": "60",
        "x-content-type-options": "nosniff",
      },
    },
  );
}
