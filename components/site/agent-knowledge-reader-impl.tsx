"use client";

/* eslint-disable @next/next/no-img-element -- GitHub file previews use arbitrary raw/data URLs. */

import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Code2,
  Copy,
  File,
  FileCode2,
  Folder,
  FolderOpen,
  Network,
  Search,
  Star,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AgentKnowledgeLoading } from "@/components/site/agent-knowledge-reader-loading";
import { AgentManifestArchify } from "@/components/site/agent-manifest-archify";
import { AgentMarkdown } from "@/components/site/agent-markdown";
import { AgentSourceIcon } from "@/components/site/agent-source-icon";
import {
  agentPackageManifestPaths,
  agentDocumentHeadings,
  buildAgentManifestGraph,
  formatRepositoryDate,
  githubRepositoryFromPayload,
  githubTreeFromPayload,
  normalizeAgentRepository,
  parseAgentPackageManifest,
  repositoryDocumentFiles,
  repositoryEntryFiles,
  repositoryLanguage,
  type AgentRepositoryMeta,
  type AgentRepositoryTreeItem,
  type AgentManifestNode,
} from "@/lib/agent/repository";
import {
  resolveAgentWikiPageTitle,
  type AgentWikiSource,
  type AgentWikiStructureItem,
} from "@/lib/agent/zread";
import {
  INSTALLABLE_AGENT_CATEGORIES,
  agentInstallCommand,
  agentSkillFromResource,
  formatAgentCount,
  type AgentIndexItem,
  type AgentSkill,
} from "@/lib/agent/skills";

type AtlasTab = "overview" | "docs" | "files";
type FileState = { path: string; ref: string; text: string; loading: boolean; error: string };
type AgentDocumentHeading = ReturnType<typeof agentDocumentHeadings>[number];
type TocTrackGeometry = { width: number; height: number; path: string; activeBottom: number };

const EMPTY_TOC_TRACK: TocTrackGeometry = { width: 1, height: 1, path: "", activeBottom: 0 };

const GITHUB_HEADERS = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
};

const wikiResponseCache = new Map<string, { savedAt: number; payload: Record<string, unknown> }>();

function readWikiCache(url: string) {
  const memory = wikiResponseCache.get(url);
  if (memory) return memory;
  try {
    const raw = window.sessionStorage.getItem(`agent-json:${url}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { savedAt?: number; payload?: Record<string, unknown> };
    if (!Number.isFinite(parsed.savedAt) || !parsed.payload || typeof parsed.payload !== "object") return null;
    const entry = { savedAt: parsed.savedAt as number, payload: parsed.payload };
    wikiResponseCache.set(url, entry);
    return entry;
  } catch {
    return null;
  }
}

function writeWikiCache(url: string, payload: Record<string, unknown>) {
  const entry = { savedAt: Date.now(), payload };
  wikiResponseCache.set(url, entry);
  try {
    const serialized = JSON.stringify(entry);
    if (serialized.length <= 900_000) window.sessionStorage.setItem(`agent-json:${url}`, serialized);
  } catch {
    // Memory caching remains available when session storage is unavailable.
  }
}

function repositoryMetaFromSkill(skill: AgentSkill): AgentRepositoryMeta {
  return {
    fullName: skill.f,
    name: skill.n,
    owner: skill.a,
    description: skill.descZh || skill.d,
    stars: skill.s,
    forks: 0,
    watchers: 0,
    language: skill.language ?? null,
    defaultBranch: "HEAD",
    updatedAt: skill.pushedAt ?? "",
    license: null,
    topics: skill.tags ?? [],
    archived: false,
    homepage: null,
  };
}

function repositoryMetaFromIndex(item: AgentIndexItem): AgentRepositoryMeta {
  return {
    fullName: item.f,
    name: item.n,
    owner: item.a,
    description: item.d,
    stars: item.s,
    forks: 0,
    watchers: 0,
    language: null,
    defaultBranch: "HEAD",
    updatedAt: "",
    license: null,
    topics: [],
    archived: false,
    homepage: null,
  };
}

async function readJson(url: string, signal: AbortSignal) {
  const response = await fetch(url, { headers: url.startsWith("https://api.github.com") ? GITHUB_HEADERS : { Accept: "application/json" }, signal });
  const payload = await response.json().catch(() => null) as Record<string, unknown> | null;
  if (!response.ok || !payload) {
    const message = payload && typeof payload.message === "string" ? payload.message : payload && typeof payload.error === "string" ? payload.error : "GitHub 数据读取失败";
    throw new Error(response.status === 403 ? "GitHub 请求频率已达上限，请稍后重试。" : message);
  }
  return payload;
}

function wikiPageCacheKey(value: string) {
  return value
    .trim()
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}._-]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 160) || "overview";
}

async function readWikiJson(repo: string, action: "structure" | "overview" | "page", title: string, signal: AbortSignal, pageSlug = "") {
  const source = "zread" as const;
  let lastError: unknown;
  const staticPath = repo.split("/").map(encodeURIComponent).join("/");
  const staticKeys = action === "page"
    ? [...new Set([pageSlug, title].map(wikiPageCacheKey).filter(Boolean))]
    : [];
  const staticUrls = action === "page"
    ? staticKeys.map((key) => new URL(`/agent/zread-cache/${staticPath}/pages/${encodeURIComponent(key)}.json`, window.location.origin))
    : [new URL(`/agent/zread-cache/${staticPath}/${action}.json`, window.location.origin)];
  const readStaticFallback = async () => {
    for (const staticUrl of staticUrls) {
      const staticCache = readWikiCache(staticUrl.toString());
      if (staticCache && staticCache.payload.source === source) {
        return Object.assign(staticCache.payload, { source: source as AgentWikiSource });
      }
      try {
        const response = await fetch(staticUrl, { headers: { Accept: "application/json" }, signal });
        const payload = await response.json().catch(() => null) as Record<string, unknown> | null;
        if (response.ok && payload?.source === source) {
          writeWikiCache(staticUrl.toString(), payload);
          return Object.assign(payload, { source: source as AgentWikiSource });
        }
      } catch (reason) {
        if (signal.aborted) throw reason;
      }
    }
    return null;
  };
  const url = new URL(`/api/${source}/${repo}/${action}`, window.location.origin);
  if (action === "page" && title) url.searchParams.set("title", title);
  const cache = readWikiCache(url.toString());
  if (cache && Date.now() - cache.savedAt < 5 * 60_000) {
    return Object.assign(cache.payload, { source: source as AgentWikiSource });
  }
  const activeLive = { controller: null as AbortController | null };
  const readLive = async () => {
    const maximumAttempts = 1;
    for (let attempt = 0; attempt < maximumAttempts; attempt += 1) {
      const controller = new AbortController();
      activeLive.controller = controller;
      const abort = () => controller.abort();
      signal.addEventListener("abort", abort, { once: true });
      const timeout = window.setTimeout(() => controller.abort(), 12_000);
      try {
        const response = await fetch(url, { headers: { Accept: "application/json" }, signal: controller.signal });
        const payload = await response.json().catch(() => null) as Record<string, unknown> | null;
        if (response.ok && payload?.source === source) {
          writeWikiCache(url.toString(), payload);
          return Object.assign(payload, { source: source as AgentWikiSource });
        }
        const transient = !payload || new Set([429, 500, 502, 503, 504]).has(response.status);
        if (!transient) throw new Error(typeof payload?.error === "string" ? payload.error : "ZRead 请求暂时未能完成。");
        throw new Error(typeof payload?.error === "string" ? payload.error : "ZRead 暂时没有响应，请稍后重试。");
      } catch (reason) {
        if (signal.aborted) throw reason;
        lastError = reason;
        if (reason instanceof Error && reason.name === "AbortError") break;
      } finally {
        window.clearTimeout(timeout);
        signal.removeEventListener("abort", abort);
        if (activeLive.controller === controller) activeLive.controller = null;
      }
    }
    if (cache && Date.now() - cache.savedAt < 24 * 60 * 60_000) {
      return Object.assign(cache.payload, { source: source as AgentWikiSource });
    }
    throw lastError instanceof Error ? lastError : new Error("ZRead 中文文档暂时不可用。");
  };

  // Start live ZRead first. A validated static ZRead snapshot joins after a
  // short grace period so a slow/504 upstream never leaves the reader blank.
  const livePromise = readLive();
  const first = await Promise.race([
    livePromise.then((payload) => ({ kind: "payload" as const, payload })).catch((error: unknown) => ({ kind: "error" as const, error })),
    new Promise<void>((resolve) => window.setTimeout(resolve, 650))
      .then(readStaticFallback)
      .then((payload) => payload
        ? { kind: "payload" as const, payload }
        : { kind: "miss" as const, payload: null }),
  ]);
  if (first.kind === "payload" && first.payload) {
    activeLive.controller?.abort();
    return first.payload;
  }
  if (first.kind === "miss") return livePromise;
  const staticFallback = await readStaticFallback();
  if (staticFallback) return staticFallback;
  throw first.error instanceof Error ? first.error : new Error("ZRead 中文文档暂时不可用。");
}

function encodePath(path: string) {
  return path.split("/").map(encodeURIComponent).join("/");
}

function isMarkdown(path: string) {
  return /\.(?:md|mdx|markdown)$/i.test(path);
}

function isImage(path: string) {
  return /\.(?:avif|gif|jpe?g|png|svg|webp)$/i.test(path);
}

function fileGlyph(path: string) {
  if (isMarkdown(path)) return BookOpen;
  if (/\.(?:[cm]?[jt]sx?|py|rs|go|java|css|html|vue|svelte|astro)$/i.test(path)) return FileCode2;
  return File;
}

function visibleRepositoryTree(items: AgentRepositoryTreeItem[], collapsed: Set<string>, query: string) {
  const normalized = query.trim().toLowerCase();
  const sorted = [...items].sort((a, b) => {
    const aParts = a.path.split("/");
    const bParts = b.path.split("/");
    const aParent = aParts.slice(0, -1).join("/");
    const bParent = bParts.slice(0, -1).join("/");
    if (aParent === bParent && a.type !== b.type) return a.type === "tree" ? -1 : 1;
    return a.path.localeCompare(b.path);
  });
  if (normalized) return sorted.filter((item) => item.type === "blob" && item.path.toLowerCase().includes(normalized)).slice(0, 500);
  return sorted.filter((item) => {
    const parts = item.path.split("/");
    return !parts.slice(0, -1).some((_, index) => collapsed.has(parts.slice(0, index + 1).join("/")));
  }).slice(0, 1000);
}


function AgentPageToc({ headings }: { headings: AgentDocumentHeading[] }) {
  const tocHeadings = useMemo(() => headings.filter((heading) => heading.depth === 2 || heading.depth === 3).slice(0, 24), [headings]);
  const [activeId, setActiveId] = useState(tocHeadings[0]?.id || "");
  const [track, setTrack] = useState<TocTrackGeometry>(EMPTY_TOC_TRACK);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setActiveId(tocHeadings[0]?.id || "");
  }, [tocHeadings]);

  useEffect(() => {
    const sections = tocHeadings
      .map((heading) => document.getElementById(heading.id))
      .filter((section): section is HTMLElement => Boolean(section));
    if (!sections.length || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver((entries) => {
      const section = entries
        .filter((entry) => entry.isIntersecting)
        .sort((left, right) => Math.abs(left.boundingClientRect.top) - Math.abs(right.boundingClientRect.top))[0]
        ?.target;
      if (section instanceof HTMLElement) setActiveId(section.id);
    }, { rootMargin: "-16% 0px -68% 0px", threshold: [0, 1] });
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [tocHeadings]);

  useEffect(() => {
    const list = listRef.current;
    if (!list || !tocHeadings.length) {
      setTrack(EMPTY_TOC_TRACK);
      return;
    }

    let frame = 0;
    const links = [...list.querySelectorAll<HTMLAnchorElement>("[data-toc-target]")];
    const depth = (link: HTMLAnchorElement) => Math.max(0, Number(link.dataset.level || 2) - 2);
    const x = (link: HTMLAnchorElement) => 8.5 + depth(link) * 12;
    const measure = () => {
      if (!links.length) return;
      const width = 16.5 + Math.max(...links.map(depth)) * 12;
      const last = links.at(-1)!;
      const height = Math.max(1, last.offsetTop + last.offsetHeight);
      let path = `M ${x(links[0])} 0`;
      links.forEach((link, index) => {
        const linkX = x(link);
        const bottom = link.offsetTop + link.offsetHeight;
        const shoulder = Math.max(link.offsetTop, bottom - 12);
        path += ` L ${linkX} ${shoulder}`;
        const next = links[index + 1];
        path += next ? ` L ${x(next)} ${bottom}` : ` L ${linkX} ${bottom}`;
      });
      const active = links.find((link) => link.dataset.tocTarget === activeId);
      const activeBottom = active ? active.offsetTop + Math.max(8, active.offsetHeight - 12) : 0;
      setTrack((current) => current.width === width && current.height === height && current.path === path && current.activeBottom === activeBottom
        ? current
        : { width, height, path, activeBottom });
    };
    const schedule = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(measure);
    };

    schedule();
    const resizeObserver = "ResizeObserver" in window ? new ResizeObserver(schedule) : null;
    resizeObserver?.observe(list);
    links.forEach((link) => resizeObserver?.observe(link));
    window.addEventListener("resize", schedule);
    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      window.removeEventListener("resize", schedule);
    };
  }, [activeId, tocHeadings]);

  if (!tocHeadings.length) return <p>当前页面没有二级标题</p>;

  return <div className="agent-toc-list" data-toc-list ref={listRef}>
    <svg xmlns="http://www.w3.org/2000/svg" className="agent-toc-track agent-toc-track-base" data-toc-track-base aria-hidden="true" focusable="false" viewBox={`0 0 ${track.width} ${track.height}`} width={track.width} height={track.height}><path d={track.path} fill="none" vectorEffect="non-scaling-stroke" /></svg>
    <svg xmlns="http://www.w3.org/2000/svg" className="agent-toc-track agent-toc-track-active" data-toc-track-active aria-hidden="true" focusable="false" viewBox={`0 0 ${track.width} ${track.height}`} width={track.width} height={track.height} style={{ "--toc-track-bottom": `${track.activeBottom}px` } as React.CSSProperties}><path d={track.path} fill="none" vectorEffect="non-scaling-stroke" /></svg>
    {tocHeadings.map((heading) => {
      const active = activeId === heading.id;
      return <a href={`#${heading.id}`} className={active ? "is-active" : undefined} data-toc-target={heading.id} data-level={heading.depth} data-active={String(active)} aria-current={active ? "location" : undefined} onClick={() => setActiveId(heading.id)} key={heading.id}><span>{heading.title}</span></a>;
    })}
  </div>;
}

function RepositoryFileTree({
  items,
  query,
  activePath,
  onOpen,
}: {
  items: AgentRepositoryTreeItem[];
  query: string;
  activePath: string;
  onOpen: (path: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(() => new Set<string>());
  const visible = useMemo(() => visibleRepositoryTree(items, collapsed, query), [collapsed, items, query]);
  const toggle = (path: string) => setCollapsed((value) => {
    const next = new Set(value);
    if (next.has(path)) next.delete(path); else next.add(path);
    return next;
  });
  return <div className="agent-file-list">
    {visible.map((item) => {
      const depth = item.path.split("/").length - 1;
      const name = item.path.split("/").pop() || item.path;
      const open = item.type === "tree" && !collapsed.has(item.path);
      const Icon = item.type === "tree" ? open ? FolderOpen : Folder : fileGlyph(item.path);
      return <div className={`agent-tree-entry ${activePath === item.path ? "is-active" : ""}`} key={`${item.type}:${item.path}`}>
        <button type="button" style={{ paddingLeft: `${.55 + depth * .72}rem` }} onClick={() => item.type === "tree" ? toggle(item.path) : onOpen(item.path)} title={item.path}>
          <span className="agent-tree-chevron">{item.type === "tree" ? open ? <ChevronDown /> : <ChevronRight /> : null}</span>
          <Icon className="agent-material-icon" aria-hidden="true" />
          <strong>{name}</strong>
        </button>
      </div>;
    })}
    {!visible.length ? <div className="agent-empty"><p>没有匹配的文件</p></div> : null}
  </div>;
}

type AgentKnowledgeReaderProps = {
  repo?: string;
  resourcePath?: string;
  skill?: AgentSkill;
  onReady?: () => void;
};

export function AgentKnowledgeReader({ resourcePath, skill, repo = "", onReady }: AgentKnowledgeReaderProps) {
  const [loadedSkill, setLoadedSkill] = useState<AgentSkill | null>(() => resourcePath ? null : skill ?? null);
  const [resourceSettled, setResourceSettled] = useState(() => !resourcePath);

  useEffect(() => { onReady?.(); }, [onReady]);

  useEffect(() => {
    if (!resourcePath) {
      setLoadedSkill(skill ?? null);
      setResourceSettled(true);
      return;
    }

    const controller = new AbortController();
    const encodedPath = resourcePath.split("/").filter(Boolean).map(encodeURIComponent).join("/");
    setLoadedSkill(null);
    setResourceSettled(false);
    void fetch(`/api/public/resources/${encodedPath}`, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => null) as Parameters<typeof agentSkillFromResource>[0] | null;
        if (!response.ok || !payload || payload.type !== "tool") throw new Error("Agent resource unavailable");
        setLoadedSkill(agentSkillFromResource(payload));
      })
      .catch(() => {
        if (!controller.signal.aborted) setLoadedSkill(skill ?? null);
      })
      .finally(() => {
        if (!controller.signal.aborted) setResourceSettled(true);
      });
    return () => controller.abort();
  }, [resourcePath, skill]);

  if (!resourceSettled) return <AgentKnowledgeLoading repo={skill?.f || repo} skill={skill} />;
  return <AgentKnowledgeReaderContent repo={repo} skill={loadedSkill ?? skill} />;
}

function AgentKnowledgeReaderContent({ skill, repo: suppliedRepo = "" }: { skill?: AgentSkill; repo?: string }) {
  const [repo, setRepo] = useState(() => normalizeAgentRepository(skill?.f || suppliedRepo));
  const [indexItem, setIndexItem] = useState<AgentIndexItem | null>(null);
  const [meta, setMeta] = useState<AgentRepositoryMeta | null>(() => skill ? repositoryMetaFromSkill(skill) : null);
  const [tree, setTree] = useState<AgentRepositoryTreeItem[]>([]);
  const [manifestNodes, setManifestNodes] = useState<AgentManifestNode[]>([]);
  const [manifestStatus, setManifestStatus] = useState("正在分析 package.json…");
  const [documentText, setDocumentText] = useState("");
  const [documentSource, setDocumentSource] = useState("连接中");
  const [wikiItems, setWikiItems] = useState<AgentWikiStructureItem[]>([]);
  const [currentWikiPage, setCurrentWikiPage] = useState("Overview");
  const [wikiLoading, setWikiLoading] = useState(false);
  const [status, setStatus] = useState(repo ? "正在连接仓库源码与文档…" : "未指定仓库");
  const [repositoryError, setRepositoryError] = useState("");
  const [wikiError, setWikiError] = useState("");
  const [docQuery, setDocQuery] = useState("");
  const [atlasOpen, setAtlasOpen] = useState(false);
  const [atlasTab, setAtlasTab] = useState<AtlasTab>("overview");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [fileQuery, setFileQuery] = useState("");
  const [fileState, setFileState] = useState<FileState>({ path: "", ref: "", text: "", loading: false, error: "" });
  const [copied, setCopied] = useState(false);
  const [atlasWidth, setAtlasWidth] = useState(1120);
  const [atlasResizing, setAtlasResizing] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const atlasRef = useRef<HTMLDivElement>(null);
  const resizeRef = useRef<{ x: number; width: number } | null>(null);
  const wikiRequestRef = useRef<AbortController | null>(null);
  const wikiLoadSequenceRef = useRef(0);
  const resolvedMeta = meta ?? (skill ? repositoryMetaFromSkill(skill) : indexItem ? repositoryMetaFromIndex(indexItem) : null);

  useEffect(() => {
    if (repo) return;
    const requested = normalizeAgentRepository(new URLSearchParams(window.location.search).get("repo"));
    if (requested) setRepo(requested);
  }, [repo]);

  useEffect(() => {
    if (!repo || skill) return;
    const controller = new AbortController();
    fetch("/agent/full-index.json", { signal: controller.signal })
      .then((response) => response.ok ? response.json() as Promise<{ items?: AgentIndexItem[] }> : Promise.reject(new Error("index failed")))
      .then((payload) => {
        const item = payload.items?.find((entry) => entry.f.toLowerCase() === repo.toLowerCase()) ?? null;
        setIndexItem(item);
        if (item) setMeta((current) => current ?? repositoryMetaFromIndex(item));
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [repo, skill]);

  const loadRepository = useCallback(async (signal: AbortSignal) => {
    if (!repo) return;
    setStatus("正在连接仓库源码与文档…");
    setRepositoryError("");
    try {
      const overview = await readJson(`/api/agent/github/${repo}/overview`, signal);
      const repositoryPayload = overview.repo && typeof overview.repo === "object" ? overview.repo as Record<string, unknown> : overview;
      const repository = githubRepositoryFromPayload(repositoryPayload);
      setMeta(repository);
      setStatus("正在读取仓库文件树…");
      const treePayload = await readJson(`/api/agent/github/${repo}/tree?ref=${encodeURIComponent(repository.defaultBranch)}`, signal);
      const nextTree = githubTreeFromPayload(treePayload);
      setTree(nextTree);
      setStatus("");
    } catch (reason) {
      if (signal.aborted) return;
      const message = reason instanceof Error ? reason.message : "仓库数据加载失败，请稍后重试。";
      setRepositoryError(message);
      setStatus("");
    }
  }, [repo]);

  useEffect(() => {
    if (!repo) return;
    const controller = new AbortController();
    void loadRepository(controller.signal);
    return () => controller.abort();
  }, [loadRepository, repo]);

  const loadWikiPage = useCallback(async (title: string, signal?: AbortSignal, updateUrl = true, pageSlug = "") => {
    if (!repo) return;
    wikiRequestRef.current?.abort();
    const controller = new AbortController();
    wikiRequestRef.current = controller;
    const sequence = ++wikiLoadSequenceRef.current;
    const abort = () => controller.abort();
    signal?.addEventListener("abort", abort, { once: true });
    setCurrentWikiPage(title);
    setDocumentText("");
    setDocumentSource("正在读取文档");
    setWikiError("");
    setWikiLoading(true);
    try {
      const action = /^(overview|概述)$/i.test(title) ? "overview" : "page";
      const payload = await readWikiJson(repo, action, title, controller.signal, pageSlug);
      if (typeof payload.markdown !== "string" || !payload.markdown.trim()) throw new Error("文档源未返回正文。");
      if (sequence !== wikiLoadSequenceRef.current) return;
      setCurrentWikiPage(resolveAgentWikiPageTitle(payload, title));
      setDocumentText(payload.markdown);
      setDocumentSource("文档已就绪");
      setWikiError("");
      if (updateUrl) {
        const url = new URL(window.location.href);
        if (/^(overview|概述)$/i.test(title)) url.searchParams.delete("doc"); else url.searchParams.set("doc", title);
        window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
      }
      setMobileNavOpen(false);
      window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    } catch (reason) {
      if (sequence === wikiLoadSequenceRef.current && !controller.signal.aborted) {
        setDocumentSource("文档读取失败");
        setWikiError(reason instanceof Error ? reason.message : "ZRead 中文文档加载失败。");
      }
    } finally {
      if (sequence === wikiLoadSequenceRef.current) {
        if (!controller.signal.aborted) setWikiLoading(false);
        if (wikiRequestRef.current === controller) wikiRequestRef.current = null;
      }
      signal?.removeEventListener("abort", abort);
    }
  }, [repo]);

  useEffect(() => {
    if (!repo) return;
    const controller = new AbortController();
    const requested = new URLSearchParams(window.location.search).get("doc") || "Overview";
    void (async () => {
      let items: AgentWikiStructureItem[] = [];
      try {
        const payload = await readWikiJson(repo, "structure", "", controller.signal);
        items = Array.isArray(payload.items) ? payload.items.filter((item): item is AgentWikiStructureItem => Boolean(item) && typeof item === "object" && typeof (item as AgentWikiStructureItem).title === "string") : [];
        setWikiItems(items);
        if (/^(overview|概述)$/i.test(requested) && items[0]?.title) setCurrentWikiPage(items[0].title);
      } catch {
        if (!controller.signal.aborted) setWikiItems([]);
      }
      if (controller.signal.aborted) return;
      const page = items.find((item) => item.title === requested || item.slug === requested)
        ?? (/^(overview|概述)$/i.test(requested) ? items[0] : undefined);
      await loadWikiPage(page?.title || requested, controller.signal, false, page?.slug || "");
    })();
    return () => controller.abort();
  }, [loadWikiPage, repo]);

  useEffect(() => {
    if (!repo || !tree.length || !resolvedMeta) return;
    const controller = new AbortController();
    const manifests = agentPackageManifestPaths(tree);
    const ref = resolvedMeta.defaultBranch === "HEAD" ? "main" : resolvedMeta.defaultBranch;
    setManifestStatus(`发现 ${manifests.length} 份清单`);
    void (async () => {
      const parsed: Array<{ id: string; name: string; path: string; dependencyNames: string[] }> = [];
      let attempted = 0;
      const startedAt = performance.now();
      const softTimeout = <T,>(promise: Promise<T>, timeoutMs: number) => new Promise<T | null>((resolve) => {
        let settled = false;
        const timer = window.setTimeout(() => { if (!settled) { settled = true; resolve(null); } }, timeoutMs);
        void promise.then((value) => {
          if (settled) return;
          settled = true;
          window.clearTimeout(timer);
          resolve(value);
        }, () => {
          if (settled) return;
          settled = true;
          window.clearTimeout(timer);
          resolve(null);
        });
      });
      for (let start = 0; start < manifests.length; start += 4) {
        if (performance.now() - startedAt > 8_500) break;
        const batch = await Promise.all(manifests.slice(start, start + 4).map((manifest) => softTimeout((async () => {
          try {
            const response = await fetch(`https://raw.githubusercontent.com/${repo}/${encodeURIComponent(ref)}/${encodePath(manifest.path)}`, { signal: controller.signal, cache: "force-cache" });
            if (!response.ok) return null;
            return parseAgentPackageManifest(manifest.path, await response.text(), repo.split("/")[1] || repo);
          } catch { return null; }
        })(), 4_500)));
        if (controller.signal.aborted) return;
        attempted += batch.length;
        parsed.push(...batch.filter((item): item is NonNullable<typeof item> => Boolean(item)));
        const partial = buildAgentManifestGraph(parsed);
        setManifestNodes(partial);
        setManifestStatus(`已读取 ${attempted}/${manifests.length} 份清单`);
      }
      if (controller.signal.aborted) return;
      const nodes = buildAgentManifestGraph(parsed);
      const edgeCount = nodes.reduce((total, node) => total + node.dependencies.length, 0);
      setManifestNodes(nodes);
      setManifestStatus(nodes.length ? `${nodes.length} 个项目 · ${edgeCount} 条关系${attempted < manifests.length || nodes.length < attempted ? " · 部分结果" : ""}` : "没有检测到 package.json");
    })();
    return () => controller.abort();
  }, [repo, resolvedMeta, tree]);

  useEffect(() => {
    const stored = Number(window.localStorage.getItem("agent-atlas-width-v2"));
    if (Number.isFinite(stored) && stored > 0) setAtlasWidth(stored);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("agent-atlas-lock", atlasOpen);
    document.documentElement.classList.toggle("agent-mobile-nav-lock", mobileNavOpen);
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (atlasOpen) setAtlasOpen(false);
        else if (mobileNavOpen) setMobileNavOpen(false);
      }
      if (event.key === "/" && !atlasOpen && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        event.preventDefault();
        event.stopPropagation();
        searchRef.current?.focus();
      }
    };
    document.addEventListener("keydown", keydown, true);
    return () => {
      document.documentElement.classList.remove("agent-atlas-lock", "agent-mobile-nav-lock");
      document.removeEventListener("keydown", keydown, true);
    };
  }, [atlasOpen, mobileNavOpen]);

  const [owner = "GitHub", repoName = "正在读取仓库…"] = repo ? repo.split("/") : ["GitHub", "未指定仓库"];
  const command = repo ? skill && INSTALLABLE_AGENT_CATEGORIES.has(skill.c) ? agentInstallCommand(repo) : `git clone https://github.com/${repo}.git` : "";
  const headings = useMemo(() => agentDocumentHeadings(documentText), [documentText]);
  const filteredHeadings = headings.filter((heading) => !docQuery.trim() || heading.title.toLowerCase().includes(docQuery.trim().toLowerCase()));
  const filteredWikiItems = wikiItems.filter((item) => !docQuery.trim() || `${item.id} ${item.title} ${item.group || ""} ${item.section || ""}`.toLowerCase().includes(docQuery.trim().toLowerCase()));
  const wikiPageSlug = (title: string) => wikiItems.find((item) => item.title === title || item.slug === title)?.slug || "";
  const docs = useMemo(() => repositoryDocumentFiles(tree), [tree]);
  const entryFiles = useMemo(() => repositoryEntryFiles(tree), [tree]);
  const fileCount = tree.filter((item) => item.type === "blob").length;
  const directoryCount = tree.filter((item) => item.type === "tree").length;
  const topBoundaries = new Set(tree.map((item) => item.path.split("/")[0])).size;

  const openHeading = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    setMobileNavOpen(false);
  };

  const openFile = useCallback(async (path: string) => {
    if (!repo || !resolvedMeta) return;
    setAtlasOpen(true);
    setAtlasTab("files");
    const locationPath = window.location.pathname.split("/").filter(Boolean).map((part) => { try { return decodeURIComponent(part); } catch { return part; } });
    const blobIndex = locationPath.indexOf("blob");
    const routeRef = blobIndex >= 0 ? locationPath[blobIndex + 1] : "";
    const ref = new URLSearchParams(window.location.search).get("ref") || routeRef || (resolvedMeta.defaultBranch === "HEAD" ? "main" : resolvedMeta.defaultBranch);
    setFileState({ path, ref, text: "", loading: true, error: "" });
    try {
      if (isImage(path)) {
        setFileState({ path, ref, text: `https://raw.githubusercontent.com/${repo}/${encodeURIComponent(ref)}/${encodePath(path)}`, loading: false, error: "" });
        return;
      }
      const response = await fetch(`https://raw.githubusercontent.com/${repo}/${encodeURIComponent(ref)}/${encodePath(path)}`);
      if (!response.ok) throw new Error(`文件读取失败 (${response.status})`);
      const text = await response.text();
      setFileState({ path, ref, text: text.length > 1_000_000 ? `${text.slice(0, 1_000_000)}\n\n[文件过大，已截断]` : text, loading: false, error: "" });
      const url = new URL(window.location.href);
      url.searchParams.set("file", path);
      url.searchParams.set("ref", ref);
      window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    } catch (reason) {
      setFileState({ path, ref, text: "", loading: false, error: reason instanceof Error ? reason.message : "文件读取失败" });
    }
  }, [repo, resolvedMeta]);

  useEffect(() => {
    if (!resolvedMeta || !tree.length || fileState.path) return;
    const parts = window.location.pathname.split("/").filter(Boolean).map((part) => { try { return decodeURIComponent(part); } catch { return part; } });
    const blobIndex = parts.indexOf("blob");
    const requested = new URLSearchParams(window.location.search).get("file") || (blobIndex >= 0 ? parts.slice(blobIndex + 2).join("/") : "");
    if (requested && tree.some((item) => item.type === "blob" && item.path === requested)) void openFile(requested);
  }, [fileState.path, openFile, resolvedMeta, tree]);

  const copyCommand = async () => {
    if (!command) return;
    await navigator.clipboard.writeText(command);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  const beginResize = (event: React.PointerEvent<HTMLDivElement>) => {
    if (window.innerWidth <= 760) return;
    resizeRef.current = { x: event.clientX, width: atlasWidth };
    setAtlasResizing(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const resize = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!resizeRef.current) return;
    const next = Math.max(680, Math.min(window.innerWidth - 32, resizeRef.current.width + resizeRef.current.x - event.clientX));
    setAtlasWidth(next);
  };
  const finishResize = () => {
    resizeRef.current = null;
    setAtlasResizing(false);
    window.localStorage.setItem("agent-atlas-width-v2", String(Math.round(atlasWidth)));
  };

  if (!repo) return <div className="agent-knowledge" data-agent-knowledge data-atlas-open="false">
    <header className="agent-knowledge-head"><div className="agent-knowledge-head-inner"><div className="agent-knowledge-brand"><Link className="agent-back" href="/agent" aria-label="返回 Agent 目录"><ArrowLeft /></Link><div><p><span>GitHub</span><i>/</i></p><h1>未指定仓库</h1></div></div></div></header>
    <div className="agent-wiki-error"><Network /><h2>未指定仓库</h2><p>请使用 owner/repository 路径打开仓库知识库。</p><Link href="/agent/all">浏览项目库</Link></div>
  </div>;

  return <div
    className="agent-knowledge"
    data-agent-knowledge
    data-atlas-open={String(atlasOpen)}
    data-mobile-nav-open={String(mobileNavOpen)}
    data-atlas-resizing={atlasResizing ? "true" : undefined}
  >
    <header className="agent-knowledge-head">
      <div className="agent-knowledge-head-inner">
        <div className="agent-knowledge-brand">
          <Link className="site-link no-underline agent-back" href="/agent/" aria-label="返回 Agent 目录"><AgentSourceIcon name="i-ri-arrow-left-line" /></Link>
          <img src={`https://github.com/${resolvedMeta?.owner || owner}.png?size=96`} alt="" data-repo-avatar />
          <div><p><span>{resolvedMeta?.owner || owner}</span><i>/</i></p><h1>{resolvedMeta?.name || repoName}</h1></div>
          <span className={`agent-source-state ${documentText ? "is-ready" : ""}`} role="status" aria-live="polite"><i aria-hidden="true" /><span>{documentSource}</span></span>
        </div>
        <div className="agent-knowledge-actions">
          <button type="button" className="agent-mobile-nav" onClick={() => setMobileNavOpen(true)} aria-label="打开文档目录" aria-controls="agent-wiki-nav" aria-expanded={mobileNavOpen}><AgentSourceIcon name="i-ri-menu-2-line" />目录</button>
          {command ? <button type="button" onClick={() => void copyCommand()}><AgentSourceIcon name="i-ri-terminal-box-line" /><span>{copied ? "已复制" : skill && INSTALLABLE_AGENT_CATEGORIES.has(skill.c) ? "安装" : "克隆"}</span></button> : null}
          <button type="button" className="agent-atlas-launch" onClick={() => setAtlasOpen(true)} aria-controls="agent-atlas" aria-expanded={atlasOpen} aria-haspopup="dialog"><AgentSourceIcon name="i-ri-node-tree" />仓库地图</button>
          <a href={`https://github.com/${repo}`} target="_blank" rel="noopener" aria-label="在 GitHub 查看"><AgentSourceIcon name="i-uil-github-alt" /></a>
        </div>
      </div>
    </header>

    <div className="agent-reader-shell">
      <aside id="agent-wiki-nav" className="agent-wiki-nav" aria-label="知识库目录" aria-hidden={mobileNavOpen ? undefined : undefined}>
        <div className="agent-wiki-nav-head"><button type="button" onClick={() => setMobileNavOpen(false)} aria-label="关闭文档目录"><AgentSourceIcon name="i-ri-close-line" /></button></div>
        <label className="agent-nav-search"><Search /><input ref={searchRef} type="search" value={docQuery} onChange={(event) => setDocQuery(event.target.value)} placeholder="搜索章节" autoComplete="off" aria-label="搜索仓库文档章节" />{docQuery ? <button type="button" onClick={() => setDocQuery("")} aria-label="清空章节搜索"><X /></button> : <kbd>/</kbd>}</label>
        <nav className="agent-wiki-pages" aria-label="文档章节">
          {wikiItems.length ? filteredWikiItems.slice(0, 80).map((item, index) => <button type="button" className={currentWikiPage === item.title ? "is-active" : ""} aria-current={currentWikiPage === item.title ? "page" : undefined} aria-label={`${item.id.replace(/\.+$/, "") || String(index + 1).padStart(2, "0")}. ${item.title}`} data-wiki-page={item.title} onClick={() => void loadWikiPage(item.title, undefined, true, item.slug || "")} style={{ "--depth": Math.min(item.depth, 3) } as React.CSSProperties} key={`${item.id}-${item.title}-${index}`}><span>{`${item.id.replace(/\.+$/, "") || String(index + 1).padStart(2, "0")}.`}</span><strong>{item.title}</strong></button>) : <>
            {documentText ? <button type="button" className="is-active" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} style={{ "--depth": 0 } as React.CSSProperties}><span>01.</span><strong>README</strong></button> : null}
            {filteredHeadings.slice(0, 40).map((heading, index) => <button type="button" onClick={() => openHeading(heading.id)} style={{ "--depth": Math.max(0, heading.depth - 1) } as React.CSSProperties} key={`${heading.id}-${index}`}><span>{`${String(index + 2).padStart(2, "0")}.`}</span><strong>{heading.title}</strong></button>)}
          </>}
          {docQuery && !(wikiItems.length ? filteredWikiItems.length : filteredHeadings.length) ? <p className="agent-nav-search-empty">没有匹配的章节</p> : null}
        </nav>
        <div className="agent-nav-repo-card"><span>仓库</span><strong>{repo}</strong><small>已连接仓库源码与文档</small><div><span><Star /> <b>{resolvedMeta ? formatAgentCount(resolvedMeta.stars) : "—"}</b></span><span>{resolvedMeta?.language || "—"}</span></div></div>
      </aside>

      <section className="agent-wiki-main" aria-label="知识库正文">
        {status || wikiLoading ? <div className="agent-reader-status" role="status"><span className="agent-pulse" />{status || `正在读取“${currentWikiPage}”…`}</div> : null}
        {repositoryError ? <div className="agent-reader-status" data-kind="error" role="status"><Network />{repositoryError}</div> : null}
        {documentText ? <AgentMarkdown className="agent-wiki-article prose astro-markdown" content={documentText} repo={repo} refName={resolvedMeta?.defaultBranch || "HEAD"} wikiItems={wikiItems} onOpenWiki={(title) => void loadWikiPage(title, undefined, true, wikiPageSlug(title))} onOpenFile={(path) => void openFile(path)} /> : wikiLoading ? <article className="agent-wiki-article prose"><div className="agent-article-skeleton" aria-label="正在读取文档"><span /><span /><span /><span /><span /><span /></div></article> : wikiError ? <div className="agent-wiki-error" role="alert"><BookOpen /><h2>ZRead 文档暂时不可用</h2><p>{wikiError}</p><div className="agent-wiki-error-actions"><button type="button" onClick={() => void loadWikiPage(currentWikiPage, undefined, true, wikiPageSlug(currentWikiPage))}>重新读取</button><button type="button" onClick={() => setAtlasOpen(true)}>浏览仓库源码</button></div></div> : status ? <article className="agent-wiki-article prose"><div className="agent-article-skeleton" aria-label="正在读取文档"><span /><span /><span /><span /><span /><span /></div></article> : <div className="agent-wiki-error"><BookOpen /><h2>ZRead 文档暂未读取</h2><p>正文仅使用 ZRead，仓库文件树与源码仍可正常浏览。</p><div className="agent-wiki-error-actions"><button type="button" onClick={() => void loadWikiPage(currentWikiPage, undefined, true, wikiPageSlug(currentWikiPage))}>重新读取</button><button type="button" onClick={() => setAtlasOpen(true)}>浏览仓库源码</button></div></div>}
      </section>

      <aside className="agent-page-toc" aria-label="本页目录"><div className="agent-page-toc-inner"><nav data-page-toc aria-label="本页章节"><AgentPageToc headings={headings} /></nav></div></aside>
    </div>

    <button className="agent-atlas-scrim" onClick={() => setAtlasOpen(false)} type="button" tabIndex={-1} aria-hidden={!atlasOpen} aria-label="关闭仓库地图" />
    <div id="agent-atlas" className="agent-atlas" ref={atlasRef} role="dialog" aria-modal="true" aria-label="仓库地图" tabIndex={-1} aria-hidden={!atlasOpen} style={{ "--agent-atlas-width": `${atlasWidth}px` } as React.CSSProperties}>
      <div className="agent-atlas-resize" onPointerDown={beginResize} onPointerMove={resize} onPointerUp={finishResize} onPointerCancel={finishResize} onDoubleClick={() => setAtlasWidth(Math.min(1120, window.innerWidth * .72))} role="slider" aria-label="调整仓库地图宽度" aria-orientation="horizontal" aria-valuemin={680} aria-valuemax={1600} aria-valuenow={Math.round(atlasWidth)} tabIndex={0}><span aria-hidden="true" /></div>
      <header className="agent-atlas-head"><div className="agent-atlas-title"><AgentSourceIcon name="i-ri-git-repository-line" /><div><strong>{repo}</strong><small><span>{resolvedMeta?.defaultBranch || "HEAD"}</span><i>·</i><span>{resolvedMeta ? formatRepositoryDate(resolvedMeta.updatedAt) : "读取中"}</span></small></div></div><div><a href={`https://github.com/${repo}`} target="_blank" rel="noopener">GitHub<AgentSourceIcon name="i-ri-arrow-right-up-line" /></a><button type="button" onClick={() => setAtlasOpen(false)} aria-label="关闭仓库地图"><AgentSourceIcon name="i-ri-close-line" /></button></div></header>
      <div className="agent-atlas-tabs" role="tablist" aria-label="仓库地图视图">{(["overview", "docs", "files"] as AtlasTab[]).map((tab) => { const icon = tab === "overview" ? "i-ri-node-tree" : tab === "docs" ? "i-ri-book-2-line" : "i-ri-file-code-line"; const label = tab === "overview" ? "概览" : tab === "docs" ? "文档" : "文件"; return <button type="button" role="tab" className={atlasTab === tab ? "is-active" : ""} aria-selected={atlasTab === tab} onClick={() => setAtlasTab(tab)} key={tab}><AgentSourceIcon name={icon} />{label}</button>; })}</div>
      <div className="agent-atlas-body">
        <section role="tabpanel" data-atlas-panel="overview" hidden={atlasTab !== "overview"}>
          <div className="agent-atlas-intro"><div><h2>先建立边界，再沿入口阅读关键流程</h2><p>{tree.length ? `当前索引覆盖 ${fileCount.toLocaleString("zh-CN")} 个文件、${directoryCount.toLocaleString("zh-CN")} 个目录与 ${topBoundaries} 个顶层边界。` : "正在核对仓库结构与模块边界…"}</p></div>{entryFiles[0] ? <button type="button" onClick={() => void openFile(entryFiles[0].path)}>开始阅读<ArrowRight /></button> : null}</div>
          <div className="agent-overview-facts">{[["星标", resolvedMeta ? formatAgentCount(resolvedMeta.stars) : "—"], ["派生", resolvedMeta ? formatAgentCount(resolvedMeta.forks) : "—"], ["关注", resolvedMeta ? formatAgentCount(resolvedMeta.watchers) : "—"], ["主要语言", resolvedMeta?.language || "未标注"], ["许可证", resolvedMeta?.license || "未声明"], ["默认分支", resolvedMeta?.defaultBranch || "—"], ["最近更新", resolvedMeta ? formatRepositoryDate(resolvedMeta.updatedAt) : "—"], ["仓库状态", resolvedMeta?.archived ? "已归档" : "活跃维护"]].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
          <div className="agent-overview-topics">{resolvedMeta?.topics.map((topic) => <a href={`https://github.com/topics/${encodeURIComponent(topic)}`} target="_blank" rel="noreferrer" key={topic}>{topic}</a>)}</div>
          <section className="agent-map-section"><header><div><span className="agent-diagram-eyebrow">依赖关系</span><h3>项目依赖总览</h3><p>从 workspace 与 package.json 重建模块之间的真实依赖关系</p></div><small>{manifestStatus}</small></header>{manifestNodes.length ? atlasOpen && atlasTab === "overview" ? <AgentManifestArchify repo={repo} nodes={manifestNodes} onOpen={(path) => void openFile(path)} /> : null : <div className="agent-repo-map"><div className="agent-graph-empty"><Network /><strong>{tree.length && manifestStatus.startsWith("没有") ? "没有检测到 package.json" : "正在分析 package.json"}</strong><p>{tree.length && manifestStatus.startsWith("没有") ? "当前仓库可能使用其他包管理格式，文件浏览器仍可正常使用。" : "清单就绪后会在这里生成完整依赖图。"}</p></div></div>}</section>
          <section className="agent-map-section"><header><div><span>阅读路径</span><h3>建议从这里开始读</h3></div><small>按结构重要度排序</small></header><div className="agent-start-files">{entryFiles.map((file, index) => <button type="button" onClick={() => void openFile(file.path)} key={file.path}><span>{String(index + 1).padStart(2, "0")}</span><strong>{file.path}</strong><ArrowRight /></button>)}</div></section>
        </section>

        <section role="tabpanel" data-atlas-panel="docs" hidden={atlasTab !== "docs"}><div className="agent-atlas-section-head"><h2>代码库文档</h2><p>这里展示仓库中的 README、贡献指南与架构文档。选择后会切换到文件视图并直接回显内容。</p><small>{docs.length ? `${docs.length} 份文档` : "正在整理文档…"}</small></div><div className="agent-atlas-docs">{docs.slice(0, 100).map((file, index) => <button type="button" onClick={() => void openFile(file.path)} key={file.path}><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{file.path.split("/").pop()}</strong><small>{file.path}</small></div><ArrowRight /></button>)}</div></section>

        <section role="tabpanel" data-atlas-panel="files" hidden={atlasTab !== "files"}><div className="agent-files-shell"><aside className="agent-file-browser"><div className="agent-file-browser-head"><div><strong>文件浏览器</strong><small>{fileCount ? `${fileCount} 个文件` : "读取中"}</small></div></div><label className="agent-file-search"><Search /><input type="search" value={fileQuery} onChange={(event) => setFileQuery(event.target.value)} placeholder="搜索文件路径" aria-label="搜索文件路径" /><kbd>/</kbd></label><RepositoryFileTree items={tree} query={fileQuery} activePath={fileState.path} onOpen={(path) => void openFile(path)} /></aside><article className="agent-file-viewer"><header><div>{fileState.path ? (() => { const Icon = fileGlyph(fileState.path); return <Icon />; })() : <Code2 />}<strong>{fileState.path || "选择一个文件"}</strong></div>{fileState.path && resolvedMeta ? <a href={`https://github.com/${repo}/blob/${encodeURIComponent(fileState.ref || resolvedMeta.defaultBranch)}/${encodePath(fileState.path)}`} target="_blank" rel="noreferrer">查看源文件<ArrowUpRight /></a> : null}</header><div className="agent-file-content">{fileState.loading ? <div className="agent-file-empty"><span className="agent-pulse" /><h3>正在读取文件</h3><p>{fileState.path}</p></div> : fileState.error ? <div className="agent-file-empty"><FileCode2 /><h3>暂时无法读取文件</h3><p>{fileState.error}</p></div> : fileState.path && isImage(fileState.path) ? <div className="agent-file-image"><img src={fileState.text} alt={fileState.path} /></div> : fileState.path && isMarkdown(fileState.path) ? <AgentMarkdown className="agent-file-markdown prose astro-markdown" content={fileState.text} repo={repo} refName={fileState.ref || resolvedMeta?.defaultBranch || "HEAD"} sourcePath={fileState.path} wikiItems={wikiItems} onOpenWiki={(title) => void loadWikiPage(title, undefined, true, wikiPageSlug(title))} onOpenFile={(path) => void openFile(path)} /> : fileState.path ? <div className="agent-code-fallback"><div><span>{repositoryLanguage(fileState.path)}</span><button type="button" onClick={() => void navigator.clipboard.writeText(fileState.text)}><Copy />复制</button></div><pre><code>{fileState.text}</code></pre></div> : <div className="agent-file-empty"><FileCode2 /><h3>选择文件开始阅读</h3><p>源码、Markdown 和图片都会留在博客内打开。</p></div>}</div></article></div></section>
      </div>
    </div>
    <button className="agent-mobile-scrim" onClick={() => setMobileNavOpen(false)} type="button" tabIndex={-1} aria-hidden={!mobileNavOpen} aria-label="关闭目录" />
  </div>;
}
