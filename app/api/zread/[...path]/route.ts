import { NextResponse } from "next/server";

import { cachedAgentResponse } from "@/lib/agent/platform-cache";
import { isAgentRepositoryAllowed } from "@/lib/agent/repository-access";
import { fetchZReadPage, fetchZReadStructure } from "@/lib/agent/zread";

const REPO_PART = /^[A-Za-z0-9_.-]{1,100}$/;
const CACHE_CONTROL = "public, max-age=900, s-maxage=21600, stale-while-revalidate=86400";
type Context = { params: Promise<{ path: string[] }> };

function json(payload: unknown, status = 200, cache = CACHE_CONTROL) {
  return NextResponse.json(payload, { status, headers: { "Cache-Control": cache, "X-Content-Type-Options": "nosniff" } });
}

export async function GET(request: Request, context: Context) {
  return cachedAgentResponse(request, async () => {
    const [owner = "", repo = "", action = "overview"] = (await context.params).path;
    if (!REPO_PART.test(owner) || !REPO_PART.test(repo)) return json({ error: "仓库地址不合法。" }, 400, "no-store");
    if (!await isAgentRepositoryAllowed(owner, repo, request.url)) return json({ error: "仓库不在 Agent 目录中。" }, 404, "no-store");
    try {
      if (action === "structure") return json(await fetchZReadStructure(owner, repo, request.signal));
      if (action === "overview" || action === "page") {
        const requested = action === "overview" ? "Overview" : new URL(request.url).searchParams.get("title")?.slice(0, 120) || "Overview";
        return json(await fetchZReadPage(owner, repo, requested, request.signal));
      }
      return json({ error: "不支持的 ZRead 操作。" }, 404, "no-store");
    } catch (reason) {
      const timedOut = reason instanceof Error && reason.name === "AbortError";
      return json({ error: timedOut ? "ZRead 响应超时，请稍后重试。" : reason instanceof Error ? reason.message : "ZRead 中文文档加载失败。" }, 502, "no-store");
    }
  });
}
