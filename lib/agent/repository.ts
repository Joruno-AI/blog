export type AgentRepositoryMeta = {
  fullName: string;
  name: string;
  owner: string;
  description: string;
  stars: number;
  forks: number;
  watchers: number;
  language: string | null;
  defaultBranch: string;
  updatedAt: string;
  license: string | null;
  topics: string[];
  archived: boolean;
  homepage: string | null;
};

export type AgentRepositoryTreeItem = {
  path: string;
  type: "blob" | "tree";
  size: number | null;
};

export type AgentDocumentHeading = {
  depth: number;
  id: string;
  title: string;
};

export type AgentManifestNode = {
  id: string;
  name: string;
  path: string;
  dependencyNames: string[];
  dependencies: string[];
  incoming: string[];
  workspace: boolean;
};

export const AGENT_RESERVED_ROUTES = new Set([
  "all",
  "about",
  "analyzer",
  "compare",
  "masters",
  "repository",
  "scenes",
  "trending",
]);

const REPO_PART = /^[A-Za-z0-9_.-]{1,100}$/;

export function normalizeAgentRepository(value: string | null | undefined) {
  const normalized = (value ?? "")
    .trim()
    .replace(/^https?:\/\/github\.com\//i, "")
    .replace(/^\/+|\/+$/g, "")
    .replace(/\.git$/i, "");
  const [owner = "", repo = "", ...rest] = normalized.split("/");
  if (rest.length || !REPO_PART.test(owner) || !REPO_PART.test(repo) || AGENT_RESERVED_ROUTES.has(owner)) return "";
  return `${owner}/${repo}`;
}

export function agentHeadingId(value: string) {
  return value
    .toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/[`*_~[\](){}]/g, "")
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

export function agentDocumentHeadings(markdown: string): AgentDocumentHeading[] {
  const used = new Map<string, number>();
  return markdown.split("\n").flatMap((line) => {
    const match = line.match(/^(#{1,4})\s+(.+?)\s*#*$/);
    if (!match) return [];
    const title = match[2].replace(/!?(?:\[([^\]]+)\])\([^)]*\)/g, "$1").replace(/[`*_~]/g, "").trim();
    const base = agentHeadingId(title) || "section";
    const sequence = used.get(base) ?? 0;
    used.set(base, sequence + 1);
    return [{ depth: match[1].length, title, id: sequence ? `${base}-${sequence}` : base }];
  });
}

export function githubRepositoryFromPayload(value: Record<string, unknown>): AgentRepositoryMeta {
  const owner = value.owner && typeof value.owner === "object" ? String((value.owner as Record<string, unknown>).login ?? "") : "";
  const license = value.license && typeof value.license === "object" ? value.license as Record<string, unknown> : null;
  return {
    fullName: String(value.full_name ?? `${owner}/${String(value.name ?? "")}`),
    name: String(value.name ?? ""),
    owner,
    description: String(value.description ?? ""),
    stars: Number(value.stargazers_count ?? 0),
    forks: Number(value.forks_count ?? 0),
    watchers: Number(value.subscribers_count ?? value.watchers_count ?? 0),
    language: typeof value.language === "string" ? value.language : null,
    defaultBranch: String(value.default_branch ?? "HEAD"),
    updatedAt: String(value.updated_at ?? value.pushed_at ?? ""),
    license: license ? String(license.spdx_id ?? license.name ?? "") || null : null,
    topics: Array.isArray(value.topics) ? value.topics.map(String) : [],
    archived: value.archived === true,
    homepage: typeof value.homepage === "string" && value.homepage ? value.homepage : null,
  };
}

export function githubTreeFromPayload(value: Record<string, unknown>): AgentRepositoryTreeItem[] {
  if (!Array.isArray(value.tree)) return [];
  return value.tree.flatMap<AgentRepositoryTreeItem>((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const item = entry as Record<string, unknown>;
    const type: AgentRepositoryTreeItem["type"] | null = item.type === "tree" ? "tree" : item.type === "blob" ? "blob" : null;
    const path = typeof item.path === "string" ? item.path : "";
    return type && path ? [{ path, type, size: typeof item.size === "number" ? item.size : null }] : [];
  }).slice(0, 5000);
}

export function repositoryEntryFiles(items: AgentRepositoryTreeItem[]) {
  const score = (item: AgentRepositoryTreeItem) => {
    const path = item.path.toLowerCase();
    const depth = path.split("/").length;
    if (/^readme(?:\.|$)/.test(path)) return 1000;
    if (/(^|\/)readme(?:\.|$)/.test(path)) return 900 - depth * 4;
    if (/(^|\/)(architecture|contributing|docs?|guide)(\/|\.|$)/.test(path)) return 720 - depth * 5;
    if (/(^|\/)(package\.json|pyproject\.toml|cargo\.toml|go\.mod)$/.test(path)) return 620 - depth * 5;
    if (/(^|\/)(index|main|entry)\.(?:[cm]?[jt]sx?|py|go|rs)$/.test(path)) return 520 - depth * 5;
    return 0;
  };
  return items.filter((item) => item.type === "blob").map((item) => ({ item, score: score(item) })).filter(({ score }) => score > 0).sort((a, b) => b.score - a.score || a.item.path.localeCompare(b.item.path)).slice(0, 10).map(({ item }) => item);
}

export function repositoryDocumentFiles(items: AgentRepositoryTreeItem[]) {
  return items.filter((item) => item.type === "blob" && /(^|\/)(readme[^/]*|contributing[^/]*|changelog[^/]*|[^/]+\.(?:md|mdx))$/i.test(item.path)).sort((a, b) => a.path.split("/").length - b.path.split("/").length || a.path.localeCompare(b.path));
}

export function formatRepositoryDate(value: string) {
  if (!value || Number.isNaN(new Date(value).getTime())) return "未知";
  return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "long", day: "numeric" }).format(new Date(value));
}

export function repositoryLanguage(path: string) {
  const extension = path.toLowerCase().split(".").pop() ?? "";
  return ({ ts: "TypeScript", tsx: "TSX", js: "JavaScript", jsx: "JSX", py: "Python", rs: "Rust", go: "Go", java: "Java", css: "CSS", html: "HTML", json: "JSON", yaml: "YAML", yml: "YAML", toml: "TOML", md: "Markdown", mdx: "MDX", sh: "Shell", sql: "SQL" } as Record<string, string>)[extension] ?? "Text";
}

export function agentPackageManifestPaths(items: AgentRepositoryTreeItem[]) {
  const indexed = items.filter((item) => item.type === "blob" && /(^|\/)package\.json$/i.test(item.path) && !item.path.includes("node_modules/"));
  const manifests = indexed.some((item) => item.path === "package.json")
    ? indexed
    : [{ path: "package.json", type: "blob" as const, size: null }, ...indexed];
  return manifests.sort((a, b) => {
    if (a.path === "package.json") return -1;
    if (b.path === "package.json") return 1;
    return a.path.split("/").length - b.path.split("/").length || a.path.localeCompare(b.path);
  }).slice(0, 8);
}

export function parseAgentPackageManifest(path: string, text: string, repositoryName: string) {
  const json = JSON.parse(text) as Record<string, unknown>;
  const dependencyNames = Object.keys({
    ...((json.dependencies as Record<string, string> | undefined) ?? {}),
    ...((json.peerDependencies as Record<string, string> | undefined) ?? {}),
    ...((json.optionalDependencies as Record<string, string> | undefined) ?? {}),
  });
  return {
    id: path,
    name: typeof json.name === "string" ? json.name : path === "package.json" ? repositoryName : path.split("/").at(-2) || path,
    path,
    dependencyNames,
  };
}

export function buildAgentManifestGraph(parsed: Array<{ id: string; name: string; path: string; dependencyNames: string[] }>): AgentManifestNode[] {
  const names = new Map(parsed.map((item) => [item.name, item.id]));
  const nodes: AgentManifestNode[] = parsed.map((item) => ({
    ...item,
    dependencies: item.dependencyNames.map((name) => names.get(name)).filter((value): value is string => Boolean(value)),
    incoming: [],
    workspace: item.path !== "package.json",
  }));
  const byId = new Map(nodes.map((node) => [node.id, node]));
  nodes.forEach((node) => node.dependencies.forEach((dependency) => byId.get(dependency)?.incoming.push(node.id)));
  return nodes;
}
