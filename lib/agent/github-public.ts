import selectedAgentMetadata from "@/lib/parity/data/agent-selected-metadata.json";

import { getSelectedAgentSummary } from "@/lib/agent/selected-summaries";
import { fetchWithTimeout, readLimitedText } from "@/lib/agent/upstream";

const GITHUB_API = "https://api.github.com";
const RAW_GITHUB = "https://raw.githubusercontent.com";
const PUBLIC_GITHUB_HEADERS = {
  Accept: "application/vnd.github+json",
  "User-Agent": "wangshengliang-blog-repository-reader",
  "X-GitHub-Api-Version": "2022-11-28",
};
const COMMON_ROOT_FILES = [
  "README.md",
  "README.MD",
  "README",
  "package.json",
  "pyproject.toml",
  "Cargo.toml",
  "go.mod",
  "LICENSE",
  "LICENSE.md",
  "CONTRIBUTING.md",
] as const;

type GithubPayload = Record<string, unknown> | Record<string, unknown>[];
type StoredSelectedMetadata = [
  author: string,
  stars: number,
  installs: number | null,
  category: string,
  quality: number,
  security: string,
  language: string | null,
  pushedAt: string | null,
  createdAt: string | null,
  starsDelta: number | null,
];

const selectedMetadata = selectedAgentMetadata.items as unknown as Record<string, StoredSelectedMetadata>;
const selectedMetadataKeys = new Map(
  Object.keys(selectedMetadata).map((repository) => [repository.toLowerCase(), repository]),
);

export class PublicGithubApiError extends Error {
  constructor(public readonly status: number) {
    super(status === 403 || status === 429
      ? "GitHub 请求频率已达上限，请稍后重试。"
      : "GitHub 数据请求失败，请稍后重试。");
    this.name = "PublicGithubApiError";
  }
}

export async function fetchPublicGithubJson(
  path: string,
  query: Record<string, string> = {},
  maximumBytes = 6_000_000,
) {
  const url = new URL(`${GITHUB_API}${path}`);
  for (const [key, value] of Object.entries(query)) if (value) url.searchParams.set(key, value);
  const response = await fetchWithTimeout(url, {
    headers: PUBLIC_GITHUB_HEADERS,
    next: { revalidate: 3600 },
  }, 10_000);
  if (response.status === 404) return null;
  if (!response.ok) {
    await response.body?.cancel();
    throw new PublicGithubApiError(response.status);
  }
  return JSON.parse(await readLimitedText(response, maximumBytes)) as GithubPayload;
}

/**
 * Preserve useful repository facts when GitHub's shared anonymous quota is
 * exhausted. The selected metadata is the immutable Astro presentation
 * snapshot already used by SSR; no private credential is required here.
 */
export function fallbackRepositoryOverview(owner: string, repo: string) {
  const repository = `${owner}/${repo}`;
  const storedKey = selectedMetadataKeys.get(repository.toLowerCase());
  const metadata = storedKey ? selectedMetadata[storedKey] : undefined;
  const summary = getSelectedAgentSummary(`/agent/${storedKey ?? repository}`);
  return {
    full_name: storedKey ?? repository,
    name: repo,
    owner: { login: metadata?.[0] ?? owner },
    description: summary?.description ?? "",
    stargazers_count: metadata?.[1] ?? 0,
    forks_count: 0,
    subscribers_count: 0,
    watchers_count: metadata?.[1] ?? 0,
    language: metadata?.[6] ?? null,
    // HEAD is understood by both the GitHub Trees API and raw.githubusercontent.
    // It remains correct for repositories whose default branch is not `main`.
    default_branch: "HEAD",
    updated_at: metadata?.[7] ?? null,
    pushed_at: metadata?.[7] ?? null,
    license: null,
    topics: [],
    archived: false,
    homepage: null,
  };
}

export type RawRootTreeItem = {
  path: string;
  type: "blob";
  size: number | null;
};

/**
 * Last-resort, token-free repository root discovery. Raw GitHub does not use
 * the REST core quota, so a useful README/package entry remains available
 * when the anonymous REST pool is exhausted. HEAD avoids guessing `main` vs
 * `master`; responses are intentionally limited to known root files.
 */
export async function probeRawRepositoryRoot(owner: string, repo: string, ref: string) {
  const encodedRepository = `${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
  const encodedRef = encodeURIComponent(ref || "HEAD");
  const items = await Promise.all(COMMON_ROOT_FILES.map(async (path): Promise<RawRootTreeItem | null> => {
    const encodedPath = path.split("/").map(encodeURIComponent).join("/");
    try {
      const response = await fetchWithTimeout(
        `${RAW_GITHUB}/${encodedRepository}/${encodedRef}/${encodedPath}`,
        { method: "HEAD", cache: "force-cache" },
        4_000,
      );
      if (!response.ok) return null;
      const declaredLength = Number(response.headers.get("content-length"));
      return {
        path,
        type: "blob",
        size: Number.isSafeInteger(declaredLength) && declaredLength >= 0 ? declaredLength : null,
      };
    } catch {
      return null;
    }
  }));
  return items.filter((item): item is RawRootTreeItem => item !== null);
}
