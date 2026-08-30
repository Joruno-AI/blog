import { NextResponse } from "next/server";

import {
  fallbackRepositoryOverview,
  fetchPublicGithubJson,
  mergeRepositoryTreeSnapshot,
  probeRawRepositoryRoot,
} from "@/lib/agent/github-public";
import { cachedAgentResponse } from "@/lib/agent/platform-cache";
import { isAgentRepositoryAllowed } from "@/lib/agent/repository-access";

const REPO_PART = /^[A-Za-z0-9_.-]{1,100}$/;
const CACHE_CONTROL = "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400";
const FALLBACK_CACHE_CONTROL = "public, max-age=60, s-maxage=300, stale-while-revalidate=3600";

type Context = { params: Promise<{ path: string[] }> };

function error(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": status >= 500 ? "no-store" : "public, max-age=60", "X-Content-Type-Options": "nosniff" } });
}

function safeQuery(value: string | null, maximum: number) {
  const normalized = value?.trim() ?? "";
  return normalized && normalized.length <= maximum && !normalized.includes("\0") ? normalized : "";
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

function repositoryTree(payload: Record<string, unknown>, partial = false) {
  const source = Array.isArray(payload.tree) ? payload.tree : [];
  const tree = source.slice(0, 5_000).flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const item = entry as Record<string, unknown>;
    if (item.type !== "blob" && item.type !== "tree") return [];
    if (typeof item.path !== "string" || item.path.length > 1_800) return [];
    return [{ path: item.path, type: item.type as "blob" | "tree", size: typeof item.size === "number" ? item.size : null }];
  });
  return {
    sha: typeof payload.sha === "string" ? payload.sha : "",
    tree,
    truncated: partial || payload.truncated === true || source.length > tree.length,
  };
}

export async function GET(request: Request, context: Context) {
  return cachedAgentResponse(request, async () => {
    const [owner = "", repo = "", action = ""] = (await context.params).path;
    if (!REPO_PART.test(owner) || !REPO_PART.test(repo)) return error("仓库地址不合法。", 400);
    if (!await isAgentRepositoryAllowed(owner, repo, request.url)) return error("仓库不在 Agent 目录中。", 404);
    const repoPath = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
    const requestUrl = new URL(request.url);

    if (action === "overview") {
      try {
        const payload = await fetchPublicGithubJson(repoPath);
        if (payload && !Array.isArray(payload)) {
          return NextResponse.json(
            { repo: repositoryOverview(payload), source: "github" },
            { headers: { "Cache-Control": CACHE_CONTROL, "X-Content-Type-Options": "nosniff" } },
          );
        }
      } catch {
        // A selected SSR snapshot keeps the page useful when GitHub's shared
        // anonymous quota is unavailable. Never attach the CMS credential.
      }
      return NextResponse.json(
        { repo: fallbackRepositoryOverview(owner, repo), source: "snapshot", partial: true },
        { headers: { "Cache-Control": FALLBACK_CACHE_CONTROL, "X-Content-Type-Options": "nosniff" } },
      );
    }

    if (action === "tree") {
      const ref = safeQuery(requestUrl.searchParams.get("ref"), 255);
      if (!ref) return error("缺少仓库分支。", 400);
      const treePath = `${repoPath}/git/trees/${encodeURIComponent(ref)}`;
      try {
        const payload = await fetchPublicGithubJson(treePath, { recursive: "1" });
        if (payload && !Array.isArray(payload)) {
          const liveTree = repositoryTree(payload);
          const restoredTree = liveTree.truncated
            ? mergeRepositoryTreeSnapshot(owner, repo, ref, liveTree.tree)
            : null;
          return NextResponse.json(
            restoredTree
              ? { ...restoredTree, source: "github+snapshot" }
              : { ...liveTree, source: "github" },
            { headers: { "Cache-Control": CACHE_CONTROL, "X-Content-Type-Options": "nosniff" } },
          );
        }
      } catch {
        // Large recursive trees exceed the bounded Worker reader. Fetching the
        // root tree is the official API's bounded representation and still
        // exposes entry documents without retaining a multi-megabyte payload.
      }
      try {
        const root = await fetchPublicGithubJson(treePath, {}, 1_000_000);
        if (root && !Array.isArray(root)) {
          const rootTree = repositoryTree(root, true);
          const restoredTree = mergeRepositoryTreeSnapshot(owner, repo, ref, rootTree.tree);
          return NextResponse.json(
            restoredTree
              ? { ...restoredTree, source: "github-root+snapshot" }
              : { ...rootTree, source: "github-root" },
            { headers: { "Cache-Control": CACHE_CONTROL, "X-Content-Type-Options": "nosniff" } },
          );
        }
      } catch {
        // Raw GitHub uses a separate public path and remains available when
        // the REST core quota for a shared Worker egress address is exhausted.
      }
      const versionedTree = mergeRepositoryTreeSnapshot(owner, repo, ref);
      if (versionedTree) {
        return NextResponse.json(
          { ...versionedTree, source: "snapshot" },
          { headers: { "Cache-Control": CACHE_CONTROL, "X-Content-Type-Options": "nosniff" } },
        );
      }
      const rawTree = await probeRawRepositoryRoot(owner, repo, ref);
      const restoredRawTree = mergeRepositoryTreeSnapshot(owner, repo, ref, rawTree);
      return NextResponse.json(
        restoredRawTree
          ? { ...restoredRawTree, source: "raw-root+snapshot" }
          : { sha: "", tree: rawTree, truncated: true, source: "raw-root", partial: true },
        { headers: { "Cache-Control": FALLBACK_CACHE_CONTROL, "X-Content-Type-Options": "nosniff" } },
      );
    }
    return error("不支持的仓库操作。", 404);
  });
}
