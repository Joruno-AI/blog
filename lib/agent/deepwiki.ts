import type { AgentWikiStructureItem } from "@/lib/agent/zread";
import { fetchWithTimeout, readLimitedText } from "@/lib/agent/upstream";

interface McpEnvelope {
  id?: number | string;
  result?: {
    content?: Array<{ type: string; text?: string }>;
    structuredContent?: { result?: string };
    isError?: boolean;
  };
  error?: { message?: string };
}

const MCP_ENDPOINT = "https://mcp.deepwiki.com/mcp";
const CONTENT_TTL = 6 * 60 * 60_000;
const MEMORY_CACHE_LIMIT = 8;
const contentCache = new Map<string, { savedAt: number; text: string }>();

async function callDeepWiki(tool: string, arguments_: Record<string, string>) {
  const response = await fetchWithTimeout(MCP_ENDPOINT, {
      method: "POST",
      headers: { Accept: "application/json, text/event-stream", "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: tool, arguments: arguments_ } }),
      cache: "no-store",
    }, 15_000);
    if (!response.ok) throw new Error(`DeepWiki 返回 ${response.status}`);
    const stream = await readLimitedText(response, 2_000_000);
    const envelopes = stream.split(/\r?\n/).filter((line) => line.startsWith("data: ")).map((line) => {
      try { return JSON.parse(line.slice(6)) as McpEnvelope; } catch { return null; }
    }).filter((entry): entry is McpEnvelope => Boolean(entry));
    const envelope = [...envelopes].reverse().find((entry) => entry.id === 1 || entry.error);
    if (envelope?.error) throw new Error(envelope.error.message || "DeepWiki 请求失败");
    const result = envelope?.result;
    const text = result?.structuredContent?.result || result?.content?.find((item) => item.type === "text")?.text || "";
    if (result?.isError || !text) throw new Error(text || "DeepWiki 暂无文档");
    return text;
}

function rememberWikiContents(repoName: string, text: string) {
  contentCache.delete(repoName);
  contentCache.set(repoName, { savedAt: Date.now(), text });
  while (contentCache.size > MEMORY_CACHE_LIMIT) {
    const oldest = contentCache.keys().next().value;
    if (typeof oldest !== "string") break;
    contentCache.delete(oldest);
  }
}

export function parseDeepWikiOutline(markdown: string): AgentWikiStructureItem[] {
  return markdown.split(/\r?\n/).map((line) => {
    const match = line.match(/^(\s*)-\s+([\d.]+)\s+(.+)$/);
    if (!match) return null;
    return { depth: Math.floor((match[1]?.length ?? 0) / 2), id: match[2] ?? "", title: match[3]?.trim() ?? "" };
  }).filter((item): item is AgentWikiStructureItem => Boolean(item?.title));
}

export function extractDeepWikiPage(contents: string, requestedTitle: string) {
  const pages = [...contents.matchAll(/^# Page:\s*(.+)$/gm)];
  if (!pages.length) return contents.slice(0, 180_000);
  const normalized = requestedTitle.trim().toLowerCase();
  const match = pages.find((entry) => (entry[1] ?? "").trim().toLowerCase() === normalized) ?? pages[0];
  const start = match.index ?? 0;
  const next = pages.find((entry) => (entry.index ?? 0) > start);
  return contents.slice(start, next?.index ?? contents.length).slice(0, 180_000);
}

async function readWikiContents(repoName: string) {
  const cached = contentCache.get(repoName);
  if (cached && Date.now() - cached.savedAt < CONTENT_TTL) return cached.text;
  const cacheStorage = (globalThis as typeof globalThis & { caches?: CacheStorage & { default?: Cache } }).caches;
  const platformCache = cacheStorage?.default;
  const cacheKey = new Request(`https://deepwiki-content-cache.invalid/${encodeURIComponent(repoName)}`);
  if (platformCache) {
    const response = await platformCache.match(cacheKey);
    if (response) {
      const text = await response.text();
      rememberWikiContents(repoName, text);
      return text;
    }
  }
  const text = await callDeepWiki("read_wiki_contents", { repoName });
  rememberWikiContents(repoName, text);
  if (platformCache) await platformCache.put(cacheKey, new Response(text, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=900, s-maxage=21600, stale-while-revalidate=86400",
    },
  }));
  return text;
}

export async function fetchDeepWikiStructure(owner: string, repo: string) {
  const repoName = `${owner}/${repo}`;
  const markdown = await callDeepWiki("read_wiki_structure", { repoName });
  return { source: "deepwiki" as const, repo: repoName, sourceUrl: `https://deepwiki.com/${owner}/${repo}`, items: parseDeepWikiOutline(markdown) };
}

export async function fetchDeepWikiPage(owner: string, repo: string, requestedTitle = "Overview") {
  const repoName = `${owner}/${repo}`;
  const contents = await readWikiContents(repoName);
  return {
    source: "deepwiki" as const,
    repo: repoName,
    sourceUrl: `https://deepwiki.com/${owner}/${repo}`,
    page: requestedTitle,
    markdown: extractDeepWikiPage(contents, requestedTitle),
  };
}
