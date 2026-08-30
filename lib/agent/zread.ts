import { fetchWithTimeout, readLimitedText } from "@/lib/agent/upstream";

export type AgentWikiSource = "zread";

export interface ZReadPageMeta {
  page_id: string;
  topic: string;
  group: string;
  section: string;
  slug: string;
  order: number;
}

export interface AgentWikiStructureItem {
  depth: number;
  id: string;
  title: string;
  slug?: string;
  group?: string;
  section?: string;
}

const ZREAD_ORIGIN = "https://zread.ai";
const RESPONSE_LIMIT = 2_000_000;

function repositoryUrl(owner: string, repo: string, slug = "") {
  const pathname = [owner, repo, slug].filter(Boolean).map(encodeURIComponent).join("/");
  return `${ZREAD_ORIGIN}/${pathname}`;
}

async function fetchZReadHtml(url: string, signal?: AbortSignal) {
  const response = await fetchWithTimeout(url, {
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.7",
        "User-Agent": "Joruno-Repository-Reader/1.0",
      },
      redirect: "follow",
      signal,
    }, 30_000);
    if (!response.ok) throw new Error(`ZRead 返回 ${response.status}`);
    const html = await readLimitedText(response, RESPONSE_LIMIT);
    if (!html) throw new Error("ZRead 返回的文档体积异常");
    return html;
}

export function decodeZReadFlightPayloads(html: string) {
  const payloads: string[] = [];
  const pattern = /self\.__next_f\.push\(\[1,"((?:\\.|[^"\\])*)"\]\)<\/script>/g;
  for (const match of html.matchAll(pattern)) {
    try {
      payloads.push(JSON.parse(`"${match[1] || ""}"`) as string);
    } catch {
      // Framework and analytics rows are independent from the wiki rows.
    }
  }
  return payloads;
}

export function extractZReadPages(payloads: string[]) {
  for (const payload of payloads) {
    const match = payload.match(/"pages":(\[[\s\S]*?\]),"refresh_chance":/);
    if (!match?.[1]) continue;
    try {
      const pages = JSON.parse(match[1]) as Partial<ZReadPageMeta>[];
      const valid = pages.filter((page): page is ZReadPageMeta =>
        typeof page.page_id === "string" && typeof page.topic === "string" && typeof page.slug === "string",
      );
      if (valid.length) return valid;
    } catch {
      // Try the next RSC row when this one is only a partial reference.
    }
  }
  throw new Error("ZRead 暂未生成该仓库的中文目录");
}

function extractMarkdown(payloads: string[], slug: string) {
  const candidates = payloads.map((payload) => {
    const start = payload.indexOf("---\nslug:");
    if (start < 0) return null;
    const content = payload.slice(start);
    const frontmatter = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n+/);
    const pageSlug = frontmatter?.[1]?.match(/^slug:\s*(.+)$/m)?.[1]?.trim();
    return pageSlug ? { slug: pageSlug, markdown: content.replace(/^---\s*\n[\s\S]*?\n---\s*\n+/, "") } : null;
  }).filter((entry): entry is { slug: string; markdown: string } => Boolean(entry));
  const selected = candidates.find((candidate) => candidate.slug === slug) || candidates[0];
  if (!selected?.markdown.trim()) throw new Error("ZRead 中文正文暂不可用");
  return selected.markdown.trim();
}

export function normalizeZReadCallouts(markdown: string) {
  const callout = (input: string, tag: string, label: string) => input.replace(
    new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi"),
    (_, body: string) => `\n> **${label}** ${body.trim().split(/\r?\n/).join("\n> ")}\n`,
  );
  let normalized = callout(markdown, "CgxTip", "提示");
  normalized = callout(normalized, "CgxInfo", "说明");
  normalized = callout(normalized, "CgxWarning", "注意");
  normalized = callout(normalized, "CgxDanger", "警告");
  return normalized.replace(/<\/?Cgx[A-Za-z]+[^>]*>/g, "");
}

function normalizedKey(value: string) {
  return value.trim().toLowerCase().normalize("NFKD").replace(/^\d+-/, "").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "");
}

function resolvePage(pages: ZReadPageMeta[], requested: string) {
  if (!requested || /^(overview|概述)$/i.test(requested)) return pages[0];
  const key = normalizedKey(requested);
  return pages.find((page) => normalizedKey(page.topic) === key || normalizedKey(page.slug) === key);
}

export function resolveAgentWikiPageTitle(payload: Record<string, unknown>, fallback: string) {
  if (typeof payload.page === "string" && payload.page.trim()) return payload.page.trim();
  if (typeof payload.markdown === "string") {
    const heading = payload.markdown.match(/^\s*#\s+(.+?)\s*#*\s*$/m)?.[1]?.trim();
    if (heading) return heading;
  }
  return fallback;
}

export async function fetchZReadStructure(owner: string, repo: string, signal?: AbortSignal) {
  const sourceUrl = repositoryUrl(owner, repo);
  const html = await fetchZReadHtml(sourceUrl, signal);
  const pages = extractZReadPages(decodeZReadFlightPayloads(html)).sort((left, right) => left.order - right.order);
  return {
    source: "zread" as const,
    sourceUrl,
    items: pages.map((page, index): AgentWikiStructureItem => ({
      depth: 0,
      id: page.slug.match(/^\d+/)?.[0] || String(index + 1),
      title: page.topic,
      slug: page.slug,
      group: page.group || "",
      section: page.section || "",
    })),
  };
}

export async function fetchZReadPage(owner: string, repo: string, requested = "Overview", signal?: AbortSignal) {
  const repositorySourceUrl = repositoryUrl(owner, repo);
  const repositoryHtml = await fetchZReadHtml(repositorySourceUrl, signal);
  const repositoryPayloads = decodeZReadFlightPayloads(repositoryHtml);
  const pages = extractZReadPages(repositoryPayloads).sort((left, right) => left.order - right.order);
  const page = resolvePage(pages, requested);
  if (!page) throw new Error(`ZRead 没有找到“${requested.slice(0, 120)}”`);
  const sourceUrl = repositoryUrl(owner, repo, page.slug);
  const payloads = page === pages[0] ? repositoryPayloads : decodeZReadFlightPayloads(await fetchZReadHtml(sourceUrl, signal));
  const body = normalizeZReadCallouts(extractMarkdown(payloads, page.slug));
  return {
    source: "zread" as const,
    sourceUrl,
    page: page.topic,
    slug: page.slug,
    markdown: `# ${page.topic}\n\n${body}`.slice(0, 220_000),
  };
}
