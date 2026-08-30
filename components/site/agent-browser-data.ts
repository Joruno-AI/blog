import type { AgentIndexItem, AgentSkill } from "@/lib/agent/skills";

export type AgentSelectedIndexItem = {
  f: string;
  z?: string;
  i?: number;
  k?: string;
  p?: string;
  r?: string;
  l?: string;
  x?: number;
};

type AgentFullIndexPayload = {
  generatedAt?: string;
  items?: AgentIndexItem[];
};

type AgentSelectedIndexPayload = {
  items?: AgentSelectedIndexItem[];
};

let fullIndexRequest: Promise<Required<Pick<AgentFullIndexPayload, "items">> & AgentFullIndexPayload> | undefined;
let selectedIndexRequest: Promise<AgentSelectedIndexItem[]> | undefined;

async function readJson<T>(path: string) {
  const response = await fetch(path, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`Agent index request failed (${response.status})`);
  return response.json() as Promise<T>;
}

/**
 * Loads the production Astro index once per browser session. Keeping the
 * promise at module scope also deduplicates overlapping route transitions.
 */
export function loadAgentFullIndex() {
  fullIndexRequest ??= readJson<AgentFullIndexPayload>("/agent/full-index.json")
    .then((payload) => {
      if (!Array.isArray(payload.items)) throw new Error("Agent full index is malformed");
      return { ...payload, items: payload.items };
    })
    .catch((error) => {
      fullIndexRequest = undefined;
      throw error;
    });
  return fullIndexRequest;
}

/** Selected CMS entries only carry fields absent from full-index.json. */
export function loadAgentSelectedIndex() {
  selectedIndexRequest ??= readJson<AgentSelectedIndexPayload>("/agent/selected-index.json")
    .then((payload) => Array.isArray(payload.items) ? payload.items : [])
    .catch((error) => {
      selectedIndexRequest = undefined;
      throw error;
    });
  return selectedIndexRequest;
}

export function selectedAgentSkill(
  item: AgentIndexItem,
  metadata: AgentSelectedIndexItem,
): AgentSkill {
  return {
    ...item,
    descZh: metadata.z || item.d,
    installs: metadata.i ?? null,
    platforms: [],
    tags: [],
    official: false,
    keywords: metadata.k || "",
    pushedAt: metadata.p || null,
    createdAt: metadata.r || null,
    language: metadata.l || null,
    starsDelta: metadata.x ?? null,
    content: "",
    path: `/agent/${item.f}`,
  };
}
