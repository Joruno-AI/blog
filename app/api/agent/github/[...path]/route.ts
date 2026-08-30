import { NextResponse } from "next/server";

import { isAgentRepositoryAllowed } from "@/lib/agent/repository-access";
import { fetchWithTimeout, readLimitedText } from "@/lib/agent/upstream";

const REPO_PART = /^[A-Za-z0-9_.-]{1,100}$/;
const GITHUB_API = "https://api.github.com";
const CACHE_CONTROL = "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400";

type Context = { params: Promise<{ path: string[] }> };

function error(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": status >= 500 ? "no-store" : "public, max-age=60", "X-Content-Type-Options": "nosniff" } });
}

function safeQuery(value: string | null, maximum: number) {
  const normalized = value?.trim() ?? "";
  return normalized && normalized.length <= maximum && !normalized.includes("\0") ? normalized : "";
}

async function github(path: string, query: Record<string, string> = {}) {
  const url = new URL(`${GITHUB_API}${path}`);
  for (const [key, value] of Object.entries(query)) if (value) url.searchParams.set(key, value);
  const response = await fetchWithTimeout(url, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "wangshengliang-blog-repository-reader",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    next: { revalidate: 3600 },
  }, 10_000);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(response.status === 403 || response.status === 429 ? "GitHub 请求频率已达上限，请稍后重试。" : "GitHub 数据请求失败，请稍后重试。");
  return JSON.parse(await readLimitedText(response, 6_000_000)) as Record<string, unknown> | Record<string, unknown>[];
}

function repositoryOverview(payload: Record<string, unknown>) {
  const owner = payload.owner && typeof payload.owner === "object" ? payload.owner as Record<string, unknown> : {};
  const license = payload.license && typeof payload.license === "object" ? payload.license as Record<string, unknown> : null;
  return {
    full_name: payload.full_name,
    name: payload.name,
    owner: { login: owner.login },
    description: payload.description,
    stargazers_count: payload.stargazers_count,
    forks_count: payload.forks_count,
    subscribers_count: payload.subscribers_count,
    watchers_count: payload.watchers_count,
    language: payload.language,
    default_branch: payload.default_branch,
    updated_at: payload.updated_at,
    pushed_at: payload.pushed_at,
    license: license ? { spdx_id: license.spdx_id, name: license.name } : null,
    topics: Array.isArray(payload.topics) ? payload.topics.slice(0, 50) : [],
    archived: payload.archived,
    homepage: payload.homepage,
  };
}

function repositoryTree(payload: Record<string, unknown>) {
  const source = Array.isArray(payload.tree) ? payload.tree : [];
  const tree = source.slice(0, 5_000).flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const item = entry as Record<string, unknown>;
    if (item.type !== "blob" && item.type !== "tree") return [];
    if (typeof item.path !== "string" || item.path.length > 1_800) return [];
    return [{ path: item.path, type: item.type, size: typeof item.size === "number" ? item.size : null }];
  });
  return {
    sha: typeof payload.sha === "string" ? payload.sha : "",
    tree,
    truncated: payload.truncated === true || source.length > tree.length,
  };
}

export async function GET(request: Request, context: Context) {
  const [owner = "", repo = "", action = ""] = (await context.params).path;
  if (!REPO_PART.test(owner) || !REPO_PART.test(repo)) return error("仓库地址不合法。", 400);
  if (!await isAgentRepositoryAllowed(owner, repo, request.url)) return error("仓库不在 Agent 目录中。", 404);
  const repoPath = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
  const requestUrl = new URL(request.url);
  try {
    if (action === "overview") {
      const payload = await github(repoPath);
      if (!payload || Array.isArray(payload)) return error("仓库不存在或暂时不可访问。", 404);
      return NextResponse.json({ repo: repositoryOverview(payload) }, { headers: { "Cache-Control": CACHE_CONTROL, "X-Content-Type-Options": "nosniff" } });
    }
    if (action === "tree") {
      const ref = safeQuery(requestUrl.searchParams.get("ref"), 255);
      if (!ref) return error("缺少仓库分支。", 400);
      const payload = await github(`${repoPath}/git/trees/${encodeURIComponent(ref)}`, { recursive: "1" });
      if (!payload || Array.isArray(payload)) return error("仓库文件树不存在。", 404);
      return NextResponse.json(repositoryTree(payload), { headers: { "Cache-Control": CACHE_CONTROL, "X-Content-Type-Options": "nosniff" } });
    }
    return error("不支持的仓库操作。", 404);
  } catch (reason) {
    return error(reason instanceof Error ? reason.message : "仓库数据加载失败，请稍后重试。", 502);
  }
}
