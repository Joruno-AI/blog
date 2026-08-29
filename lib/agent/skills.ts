import type { PublishedResource } from "@/modules/resources/infrastructure/resource-repository";

export const AGENT_CATEGORIES = [
  "claude-skill",
  "codex-skill",
  "mcp-server",
  "agent-tool",
  "ai-skill",
  "llm-plugin",
  "uncategorized",
] as const;

export const AGENT_CATEGORY_LABELS: Record<string, string> = {
  "claude-skill": "Claude Skills",
  "codex-skill": "Codex Skills",
  "mcp-server": "MCP Servers",
  "agent-tool": "Agent Tools",
  "ai-skill": "AI Skills",
  "llm-plugin": "Prompt / LLM Plugins",
  uncategorized: "其他工具",
};

export const INSTALLABLE_AGENT_CATEGORIES = new Set(["claude-skill", "codex-skill"]);

export type AgentIndexItem = {
  f: string;
  n: string;
  a: string;
  s: number;
  d: string;
  c: string;
  q: number;
  g: string;
};

export type AgentSkill = AgentIndexItem & {
  descZh: string;
  installs: number | null;
  platforms: string[];
  tags: string[];
  official: boolean;
  keywords: string;
  pushedAt: string | null;
  createdAt: string | null;
  language: string | null;
  starsDelta: number | null;
  content: string;
  path: string;
};

function record(value: string) {
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

function text(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function number(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function list(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export function agentSkillFromResource(resource: PublishedResource): AgentSkill {
  const metadata = record(resource.metadataJson);
  const id = text(metadata.repo, resource.path.replace(/^\/agent\//, ""));
  return {
    f: id,
    n: resource.title,
    a: text(metadata.author, id.split("/")[0] ?? ""),
    s: number(metadata.stars),
    d: text(metadata.desc, resource.description ?? ""),
    c: text(metadata.category, "uncategorized"),
    q: number(metadata.qualityScore),
    g: text(metadata.securityGrade, "unknown"),
    descZh: text(metadata.descZh, resource.description ?? ""),
    installs: metadata.installs === null ? null : number(metadata.installs) || null,
    platforms: list(metadata.platforms),
    tags: list(metadata.tags),
    official: metadata.official === true,
    keywords: text(metadata.keywords),
    pushedAt: typeof metadata.pushedAt === "string" ? metadata.pushedAt : null,
    createdAt: typeof metadata.createdAt === "string" ? metadata.createdAt : null,
    language: typeof metadata.language === "string" ? metadata.language : null,
    starsDelta: metadata.starsDelta === null ? null : number(metadata.starsDelta) || null,
    content: resource.content,
    path: resource.path,
  };
}

export function agentQualityBand(score: number) {
  return score >= 80 ? "S" : score >= 65 ? "A" : score >= 50 ? "B" : "C";
}

export function agentCatalogScore(item: AgentIndexItem) {
  return item.q * 0.72 + Math.min(Math.log10(item.s + 1) * 8, 28);
}

export function agentInstallCommand(repo: string) {
  return `npx skills add ${repo}`;
}

export function formatAgentCount(value: number | null | undefined) {
  if (value === null || value === undefined) return "";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return String(value);
}

export function agentDescription(item: AgentIndexItem, enrich?: AgentSkill) {
  return enrich?.descZh || item.d || "暂无描述";
}
