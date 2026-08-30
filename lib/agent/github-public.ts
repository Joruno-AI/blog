import repositoryTreeSnapshots from "@/lib/agent/data/repository-tree-snapshots.json";
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
  const treeSnapshot = getRepositoryTreeSnapshot(owner, repo, "HEAD");
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
    // A checked-in tree records the real default branch. Repositories without
    // that snapshot retain HEAD, which both Trees API and raw GitHub resolve.
    default_branch: treeSnapshot?.ref ?? "HEAD",
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

export type PublicRepositoryTreeItem = {
  path: string;
  type: "blob" | "tree";
  size: number | null;
};

type StoredRepositoryTreeSnapshot = {
  repository: string;
  ref: string;
  commit: string;
  generatedAt: string;
  tree: Array<{ path: string; type: string; size: number | null }>;
};

export type RepositoryTreeSnapshot = {
  repository: string;
  ref: string;
  commit: string;
  generatedAt: string;
  tree: PublicRepositoryTreeItem[];
};

const storedRepositoryTreeSnapshots = repositoryTreeSnapshots.repositories as Record<string, StoredRepositoryTreeSnapshot>;

function normalizedSnapshotRef(value: string) {
  return value.trim().replace(/^refs\/heads\//i, "").toLowerCase();
}

/**
 * Resolve a checked-in tree captured from git itself. HEAD intentionally maps
 * to the snapshot's recorded default branch, while named refs only use a
 * snapshot created for that exact branch/commit.
 */
export function getRepositoryTreeSnapshot(owner: string, repo: string, ref: string): RepositoryTreeSnapshot | null {
  const repository = `${owner}/${repo}`.toLowerCase();
  const stored = storedRepositoryTreeSnapshots[repository];
  if (!stored || stored.repository.toLowerCase() !== repository) return null;
  if (!stored.ref || !/^[a-f0-9]{40}$/i.test(stored.commit)) return null;
  const requestedRef = normalizedSnapshotRef(ref || "HEAD");
  const snapshotRef = normalizedSnapshotRef(stored.ref);
  const snapshotCommit = stored.commit.toLowerCase();
  const matchesRef = requestedRef === "head"
    || requestedRef === snapshotRef
    || requestedRef === snapshotCommit
    || (requestedRef.length >= 7 && snapshotCommit.startsWith(requestedRef));
  if (!matchesRef) return null;
  const tree = stored.tree.flatMap<PublicRepositoryTreeItem>((entry) => {
    if (!entry || (entry.type !== "blob" && entry.type !== "tree")) return [];
    if (typeof entry.path !== "string" || !entry.path || entry.path.length > 1_800) return [];
    return [{
      path: entry.path,
      type: entry.type,
      size: typeof entry.size === "number" && Number.isSafeInteger(entry.size) && entry.size >= 0 ? entry.size : null,
    }];
  });
  if (!tree.length || tree.length !== stored.tree.length || tree.length > 5_000) return null;
  return {
    repository: stored.repository,
    ref: stored.ref,
    commit: stored.commit,
    generatedAt: stored.generatedAt,
    tree,
  };
}

/** Merge any fresh bounded/root entries over a complete versioned snapshot. */
export function mergeRepositoryTreeSnapshot(
  owner: string,
  repo: string,
  ref: string,
  partialTree: PublicRepositoryTreeItem[] = [],
) {
  const snapshot = getRepositoryTreeSnapshot(owner, repo, ref);
  if (!snapshot) return null;
  const merged = new Map(snapshot.tree.map((entry) => [entry.path, entry]));
  for (const entry of partialTree) {
    if (!entry.path || (entry.type !== "blob" && entry.type !== "tree")) continue;
    if (!merged.has(entry.path) && merged.size >= 5_000) continue;
    merged.set(entry.path, entry);
  }
  return {
    sha: snapshot.commit,
    tree: [...merged.values()].sort((left, right) => left.path.localeCompare(right.path)),
    truncated: false,
    partial: false,
    snapshot: {
      ref: snapshot.ref,
      commit: snapshot.commit,
      generatedAt: snapshot.generatedAt,
    },
  };
}

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
