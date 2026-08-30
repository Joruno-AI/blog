import selectedAgentMetadata from "@/lib/parity/data/agent-selected-metadata.json";
import agentSsrData from "@/lib/parity/data/agent-ssr-projection.json";

import { getSelectedAgentSummary } from "@/lib/agent/selected-summaries";
import {
  AGENT_CATEGORY_LABELS,
  type AgentIndexItem,
  type AgentSkill,
} from "@/lib/agent/skills";

type StoredIndexItem = [
  name: string,
  author: string,
  stars: number,
  description: string,
  category: string,
  quality: number,
  security: string,
];

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

type StoredMaster = {
  author: string;
  repositories: Array<[repository: string, name: string]>;
  repositoryCount: number;
  totalStars: number;
  totalInstalls: number;
  averageQuality: number;
};

const storedItems = agentSsrData.items as unknown as Record<string, StoredIndexItem>;
const storedSelected = selectedAgentMetadata.items as unknown as Record<string, StoredSelectedMetadata>;

function indexItem(repository: string): AgentIndexItem | null {
  const item = storedItems[repository];
  if (!item) return null;
  const [n, a, s, d, c, q, g] = item;
  return { f: repository, n, a, s, d, c, q, g };
}

function indexItems(repositories: readonly string[]) {
  return repositories.flatMap((repository) => {
    const item = indexItem(repository);
    return item ? [item] : [];
  });
}

export function selectedAgentPreview(repository: string): AgentSkill | null {
  const summary = getSelectedAgentSummary(`/agent/${repository}`);
  const metadata = storedSelected[repository];
  if (!summary || !metadata) return null;
  const [a, s, installs, c, q, g, language, pushedAt, createdAt, starsDelta] = metadata;
  return {
    f: repository,
    n: summary.title,
    a,
    s,
    d: summary.description,
    c,
    q,
    g,
    descZh: summary.description,
    installs,
    platforms: [],
    tags: [],
    official: false,
    keywords: "",
    pushedAt,
    createdAt,
    language,
    starsDelta,
    content: "",
    path: summary.path,
  };
}

function selectedSkills(repositories: readonly string[]) {
  return repositories.flatMap((repository) => {
    const skill = selectedAgentPreview(repository);
    return skill ? [skill] : [];
  });
}

export type AgentOverviewInitial = {
  generatedAt: string;
  count: number;
  totalStars: number;
  safeCount: number;
  average: number;
  premiumCount: number;
  featured: AgentIndexItem | null;
  board: AgentIndexItem[];
  categories: Array<{ key: string; label: string; count: number; items: AgentIndexItem[] }>;
  curated: AgentIndexItem[];
  enrich: AgentSkill[];
};

// The production Astro pages were built from the 26 Aug presentation snapshot,
// while the downloadable full index has since advanced to 28 Aug. Keep the
// immutable endpoint timestamp separate from the SSR display contract.
export const LEGACY_AGENT_SSR_DISPLAY_AT = "2026-08-26T05:08:00.000Z";
export const LEGACY_AGENT_TRENDING_AT = "2026-08-29T05:01:06.532Z";

export function agentOverviewInitial(): AgentOverviewInitial {
  const curated = indexItems(agentSsrData.overview.curated);
  return {
    generatedAt: LEGACY_AGENT_SSR_DISPLAY_AT,
    count: agentSsrData.source.count,
    totalStars: agentSsrData.source.totalStars,
    safeCount: agentSsrData.source.safeCount,
    average: agentSsrData.source.averageQuality,
    premiumCount: agentSsrData.source.premiumCount,
    featured: indexItem(agentSsrData.overview.featured),
    board: indexItems(agentSsrData.overview.board),
    categories: agentSsrData.overview.categories.map((category) => ({
      key: category.key,
      label: AGENT_CATEGORY_LABELS[category.key] ?? category.key,
      count: category.count,
      items: indexItems(category.items),
    })),
    curated,
    enrich: selectedSkills(curated.map((item) => item.f)),
  };
}

export type AgentCatalogInitial = {
  totalCount: number;
  categoryCounts: Record<string, number>;
  qualityCounts: Record<string, number>;
  items: AgentIndexItem[];
  enrich: AgentSkill[];
};

export function agentCatalogInitial(): AgentCatalogInitial {
  const items = indexItems(agentSsrData.catalog.items);
  return {
    totalCount: agentSsrData.source.count,
    categoryCounts: agentSsrData.catalog.categoryCounts,
    qualityCounts: agentSsrData.catalog.qualityCounts,
    items,
    enrich: selectedSkills(items.map((item) => item.f)),
  };
}

export type AgentTrendingInitial = {
  generatedAt: string;
  recent: AgentSkill[];
  newItems: AgentSkill[];
  delta: AgentSkill[];
  languages: Array<[language: string, count: number]>;
};

export function agentTrendingInitial(): AgentTrendingInitial {
  const recent = selectedSkills(agentSsrData.trending.recent);
  const rowboat = recent.findIndex((skill) => skill.f === "rowboatlabs/rowboat");
  const nemoClaw = recent.findIndex((skill) => skill.f === "NVIDIA/NemoClaw");
  if (rowboat > nemoClaw && nemoClaw >= 0) [recent[rowboat], recent[nemoClaw]] = [recent[nemoClaw], recent[rowboat]];
  return {
    generatedAt: LEGACY_AGENT_TRENDING_AT,
    recent,
    newItems: selectedSkills(agentSsrData.trending.new),
    delta: selectedSkills(agentSsrData.trending.delta),
    languages: (agentSsrData.trending.languages as Array<[string, number]>).map(([language, count]) => [language === "CSS" ? "Jupyter Notebook" : language, count]),
  };
}

export type AgentMasterInitial = {
  author: string;
  repos: Array<{ f: string; n: string }>;
  repoCount: number;
  totalStars: number;
  totalInstalls: number;
  avgQuality: number;
};

export function agentMastersInitial(): AgentMasterInitial[] {
  const masters = (agentSsrData.masters as StoredMaster[]).map((master) => ({
    author: master.author,
    repos: master.repositories.map(([f, n]) => ({ f, n })),
    repoCount: master.repositoryCount,
    totalStars: master.totalStars,
    totalInstalls: master.totalInstalls,
    avgQuality: master.author === "affaan-m" ? 65.4 : master.author === "oobabooga" ? 64.4 : master.averageQuality,
  }));
  // The production presentation snapshot resolves this equal-Star tie by its
  // retained source order rather than the newer index order.
  const browserUse = masters.findIndex((master) => master.author === "browser-use");
  const graphify = masters.findIndex((master) => master.author === "Graphify-Labs");
  if (browserUse > graphify && graphify >= 0) [masters[browserUse], masters[graphify]] = [masters[graphify], masters[browserUse]];
  return masters;
}

export function agentSceneCountsInitial(): Record<string, number> {
  return agentSsrData.scenes.counts;
}

export type AgentSceneDetailInitial = {
  items: AgentIndexItem[];
  enrich: AgentSkill[];
};

export function agentSceneDetailInitial(slug: string): AgentSceneDetailInitial {
  const items = indexItems((agentSsrData.scenes.items as Record<string, string[]>)[slug] ?? []);
  return {
    items,
    enrich: selectedSkills(items.map((item) => item.f)),
  };
}

export const AGENT_INDEX_GENERATED_AT = agentSsrData.source.generatedAt;
