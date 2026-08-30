"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";

import { AgentAvatar } from "@/components/site/agent-avatar";
import {
  loadAgentFullIndex,
  loadAgentSelectedIndex,
  selectedAgentSkill,
} from "@/components/site/agent-browser-data";
import { AgentCategoryIcon } from "@/components/site/agent-category-icon";
import { AgentSelect } from "@/components/site/agent-select";
import { AgentSourceIcon } from "@/components/site/agent-source-icon";
import {
  AGENT_CATEGORIES,
  AGENT_CATEGORY_LABELS,
  INSTALLABLE_AGENT_CATEGORIES,
  agentCatalogScore,
  agentDescription,
  agentInstallCommand,
  agentQualityBand,
  formatAgentCount,
  type AgentIndexItem,
  type AgentSkill,
} from "@/lib/agent/skills";
import type { AgentCatalogInitial } from "@/lib/agent/ssr-projections";

const PAGE_SIZE = 48;
type CatalogState = { category: string; quality: string; sort: string; query: string; safe: boolean; page: number; view: "card" | "table" };

function CatalogCard({ item, enrich, selected, onCompare }: { item: AgentIndexItem; enrich?: AgentSkill; selected: boolean; onCompare: () => void }) {
  const [copied, setCopied] = useState(false);
  const band = agentQualityBand(item.q);
  const installable = INSTALLABLE_AGENT_CATEGORIES.has(item.c);
  const copy = async () => {
    await navigator.clipboard.writeText(agentInstallCommand(item.f));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };
  return <article className="ska-card">
    <div className="ska-card-topline"><span className="ska-quality"><b>{band}</b><small>{item.q}</small></span><span className={`ska-grade is-${item.g}`}><i />{item.g === "safe" ? "安全" : item.g === "caution" ? "谨慎" : "未评级"}</span></div>
    <div className="ska-card-head"><AgentAvatar className="ska-card-avatar" author={item.a} size={80} /><div className="ska-card-titles"><Link className="ska-card-name" href={`/agent/${item.f}`}>{item.n}</Link><span className="ska-card-author">{item.a}</span></div></div>
    <p className="ska-card-desc">{agentDescription(item, enrich)}</p>
    <div className="ska-card-meta"><span><AgentSourceIcon name="i-ri-star-line" />{formatAgentCount(item.s)}</span>{enrich?.installs ? <span><AgentSourceIcon name="i-ri-download-2-line" />{formatAgentCount(enrich.installs)}</span> : null}<span className="ska-card-cat">{AGENT_CATEGORY_LABELS[item.c] ?? item.c}</span></div>
    <div className="ska-card-foot"><button className={`ska-card-compare ${selected ? "is-active" : ""}`} type="button" onClick={onCompare} aria-pressed={selected}><AgentSourceIcon name="i-ri-scales-3-line" />对比</button>{installable ? <button className={`ska-card-install ${copied ? "is-copied" : ""}`} type="button" onClick={() => void copy()}><AgentSourceIcon name={copied ? "i-ri-check-line" : "i-ri-file-copy-line"} />{copied ? "已复制" : "复制安装命令"}</button> : <Link className="ska-card-read" href={`/agent/${item.f}`}><AgentSourceIcon name="i-ri-book-open-line" />站内阅读</Link>}<Link className="ska-card-more" href={`/agent/${item.f}`} aria-label={`查看 ${item.n}`}><AgentSourceIcon name="i-ri-arrow-right-line" /></Link></div>
  </article>;
}

function pageNumbers(current: number, total: number) {
  const values = new Set([1, total, current - 2, current - 1, current, current + 1, current + 2]);
  return [...values].filter((value) => value >= 1 && value <= total).sort((a, b) => a - b);
}

function catalogState(initial: Partial<CatalogState> = {}): CatalogState {
  return {
    category: initial.category || "all",
    quality: initial.quality || "all",
    sort: initial.sort || "score",
    query: initial.query || "",
    safe: Boolean(initial.safe),
    page: Math.max(1, initial.page || 1),
    view: initial.view === "table" ? "table" : "card",
  };
}

function catalogStateFromLocation() {
  const params = new URLSearchParams(window.location.search);
  return catalogState({
    category: params.get("cat") || undefined,
    quality: params.get("quality") || undefined,
    sort: params.get("sort") || undefined,
    query: params.get("q") || undefined,
    safe: params.get("safe") === "1",
    page: Number(params.get("page")) || 1,
    view: params.get("view") === "table" ? "table" : "card",
  });
}

export function AgentCatalog({ initial = {}, projection }: { initial?: Partial<CatalogState>; projection?: AgentCatalogInitial }) {
  const [items, setItems] = useState<AgentIndexItem[]>(() => projection?.items ?? []);
  const [enrich, setEnrich] = useState<Map<string, AgentSkill>>(() => new Map(projection?.enrich.map((item) => [item.f, item])));
  const [loading, setLoading] = useState(!projection);
  const [indexReady, setIndexReady] = useState(false);
  const [state, setState] = useState<CatalogState>(() => catalogState(initial));
  const [urlStateReady, setUrlStateReady] = useState(() => Object.keys(initial).length > 0);
  const [mounted, setMounted] = useState(false);
  const [compared, setCompared] = useState<string[]>([]);
  const dialog = useRef<HTMLDialogElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const deferredQuery = useDeferredValue(state.query);

  useEffect(() => {
    setMounted(true);
  }, []);
  useEffect(() => {
    let active = true;
    Promise.all([loadAgentFullIndex(), loadAgentSelectedIndex().catch(() => [])])
      .then(([payload, selected]) => {
        if (!active) return;
        setItems(payload.items);
        setIndexReady(true);
        const byRepository = new Map(payload.items.map((item) => [item.f, item]));
        setEnrich(new Map(selected.flatMap((metadata) => {
          const item = byRepository.get(metadata.f);
          return item ? [[metadata.f, selectedAgentSkill(item, metadata)] as const] : [];
        })));
      })
      .catch(() => undefined)
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!urlStateReady) {
      setState(catalogStateFromLocation());
      setUrlStateReady(true);
    }
  }, [urlStateReady]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const active = document.activeElement;
      if (event.key === "/" && active?.tagName !== "INPUT" && active?.tagName !== "TEXTAREA" && active?.getAttribute("contenteditable") !== "true") {
        event.preventDefault();
        event.stopPropagation();
        searchRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, []);
  useEffect(() => {
    if (!urlStateReady) return;
    const params = new URLSearchParams();
    if (state.category !== "all") params.set("cat", state.category);
    if (state.quality !== "all") params.set("quality", state.quality);
    if (state.sort !== "score") params.set("sort", state.sort);
    if (state.query) params.set("q", state.query);
    if (state.safe) params.set("safe", "1");
    if (state.page > 1) params.set("page", String(state.page));
    if (state.view !== "card") params.set("view", state.view);
    window.history.replaceState(null, "", `/agent/all${params.size ? `?${params}` : ""}`);
    try { localStorage.setItem("skills-catalog-view", state.view); } catch { /* storage is optional */ }
  }, [state, urlStateReady]);

  const inventory = useMemo(() => {
    const query = deferredQuery.trim().toLowerCase();
    const categoryCounts: Record<string, number> = Object.fromEntries(AGENT_CATEGORIES.map((category) => [category, 0]));
    const qualityCounts: Record<string, number> = { S: 0, A: 0, B: 0, C: 0 };
    const filtered: AgentIndexItem[] = [];
    for (const item of items) {
      categoryCounts[item.c] = (categoryCounts[item.c] ?? 0) + 1;
      const band = agentQualityBand(item.q);
      qualityCounts[band] = (qualityCounts[band] ?? 0) + 1;
      if (state.category !== "all" && item.c !== state.category) continue;
      if (state.quality !== "all" && band !== state.quality) continue;
      if (state.safe && item.g !== "safe") continue;
      if (query && !`${item.n} ${item.a} ${item.d} ${enrich.get(item.f)?.keywords ?? ""}`.toLowerCase().includes(query)) continue;
      filtered.push(item);
    }
    filtered.sort((a, b) => state.sort === "q" ? b.q - a.q || b.s - a.s : state.sort === "s" ? b.s - a.s : state.sort === "n" ? a.n.localeCompare(b.n) : agentCatalogScore(b) - agentCatalogScore(a));
    return {
      categoryCounts: !indexReady && projection ? projection.categoryCounts : categoryCounts,
      filtered,
      qualityCounts: !indexReady && projection ? projection.qualityCounts : qualityCounts,
    };
  }, [deferredQuery, enrich, indexReady, items, projection, state.category, state.quality, state.safe, state.sort]);
  const { categoryCounts, filtered, qualityCounts } = inventory;
  const projectionIsUnfiltered = !indexReady && Boolean(projection) && state.category === "all" && state.quality === "all" && !state.safe && !deferredQuery.trim();
  const resultCount = projectionIsUnfiltered ? projection!.totalCount : filtered.length;
  const totalPages = Math.max(1, Math.ceil(resultCount / PAGE_SIZE));
  const page = Math.min(state.page, totalPages);
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const update = (patch: Partial<CatalogState>) => setState((value) => ({ ...value, ...patch, page: "page" in patch ? patch.page ?? 1 : 1 }));
  const toggleCompare = (id: string) => setCompared((current) => current.includes(id) ? current.filter((item) => item !== id) : current.length < 3 ? [...current, id] : current);
  const comparedItems = compared.map((id) => items.find((item) => item.f === id)).filter((item): item is AgentIndexItem => Boolean(item));
  const reset = () => setState({ category: "all", quality: "all", sort: "score", query: "", safe: false, page: 1, view: "card" });

  return <div className="ska-shell">
    <aside className="ska-filters" aria-label="技能筛选器">
      <div className="ska-filter-head"><div><span>FILTERS</span><strong>缩小范围</strong></div><button type="button" onClick={reset}><AgentSourceIcon name="i-ri-refresh-line" />重置</button></div>
      <section className="ska-filter-group"><h2>工具类型</h2><div className="ska-filter-list"><button className={state.category === "all" ? "is-active" : ""} type="button" onClick={() => update({ category: "all" })}><span>全部项目</span><small>{(!indexReady && projection ? projection.totalCount : items.length).toLocaleString("zh-CN")}</small></button>{AGENT_CATEGORIES.map((category) => <button className={state.category === category ? "is-active" : ""} type="button" onClick={() => update({ category })} key={category}><AgentCategoryIcon category={category} size="sm" /><span>{AGENT_CATEGORY_LABELS[category]}</span><small>{(categoryCounts[category] ?? 0).toLocaleString("zh-CN")}</small></button>)}</div></section>
      <section className="ska-filter-group"><h2>质量等级</h2><div className="ska-quality-list">{(["S", "A", "B", "C"] as const).map((band) => <button className={state.quality === band ? "is-active" : ""} type="button" onClick={() => update({ quality: state.quality === band ? "all" : band })} key={band}><b>{band}</b><span>{band === "S" ? "80+" : band === "A" ? "65–79" : band === "B" ? "50–64" : "<50"}</span><small>{qualityCounts[band].toLocaleString("zh-CN")}</small></button>)}</div></section>
      <label className="ska-safe"><span><AgentSourceIcon name="i-ri-shield-check-line" />仅看安全评级通过</span><input type="checkbox" checked={state.safe} onChange={(event) => update({ safe: event.target.checked })} /></label>
      <p className="ska-filter-note">所有项目详情、README 与源码浏览均优先在本站完成。</p>
    </aside>
    <section className="ska-results" aria-label="技能搜索结果">
      <div className="ska-toolbar"><label className="ska-search"><AgentSourceIcon name="i-ri-search-line" /><input ref={searchRef} type="search" value={state.query} onChange={(event) => update({ query: event.target.value })} placeholder="搜索名称、作者或用途" aria-label="搜索全部项目" /><kbd>/</kbd></label><div className="ska-sort-select"><span>排序</span><AgentSelect className="ska-sort-control" ariaLabel="排序方式" value={state.sort} onValueChange={(sort) => update({ sort })} options={[{ value: "score", label: "综合推荐", icon: "i-ri-sparkling-line" }, { value: "s", label: "Stars", icon: "i-ri-star-line" }, { value: "q", label: "质量分", icon: "i-ri-medal-line" }, { value: "n", label: "名称", icon: "i-ri-sort-alphabet-asc" }]} /></div><div className="ska-view"><button className={state.view === "card" ? "is-active" : ""} type="button" onClick={() => update({ view: "card" })} aria-label="卡片视图"><AgentSourceIcon name="i-ri-layout-grid-line" /></button><button className={state.view === "table" ? "is-active" : ""} type="button" onClick={() => update({ view: "table" })} aria-label="列表视图"><AgentSourceIcon name="i-ri-list-unordered" /></button></div></div>
      <div className="ska-results-head"><p className="ska-summary" aria-live="polite">{loading ? "正在读取全量索引…" : `找到 ${resultCount.toLocaleString("zh-CN")} 个项目 · 第 ${page}/${totalPages} 页`}</p><p className="ska-selection-note">最多选择 3 个项目进行比较</p></div>
      {state.view === "card" ? <div className="ska-grid">{visible.map((item) => <CatalogCard item={item} enrich={enrich.get(item.f)} selected={compared.includes(item.f)} onCompare={() => toggleCompare(item.f)} key={item.f} />)}</div> : <div className="ska-table-wrap"><table className="ska-table"><thead><tr><th>项目</th><th>类型</th><th>Stars</th><th>质量</th><th>安全</th><th>操作</th></tr></thead><tbody>{visible.map((item) => <tr key={item.f}><td><Link href={`/agent/${item.f}`}><AgentAvatar className="ska-table-avatar" author={item.a} size={64} /><span><strong>{item.n}</strong><small>{item.a}</small></span></Link></td><td>{AGENT_CATEGORY_LABELS[item.c] ?? item.c}</td><td>{formatAgentCount(item.s)}</td><td><span className="ska-table-quality"><b>{agentQualityBand(item.q)}</b>{item.q}</span></td><td>{item.g === "safe" ? "通过" : "需确认"}</td><td><button className={`ska-card-compare ${compared.includes(item.f) ? "is-active" : ""}`} onClick={() => toggleCompare(item.f)} type="button"><AgentSourceIcon name="i-ri-scales-3-line" />对比</button><Link className="ska-table-open" href={`/agent/${item.f}`}>打开</Link></td></tr>)}</tbody></table></div>}
      <nav className="ska-pager" aria-label="分页">{mounted ? <><button type="button" disabled={page <= 1} onClick={() => update({ page: page - 1 })} aria-label="上一页"><AgentSourceIcon name="i-ri-arrow-left-s-line" /></button>{pageNumbers(page, totalPages).map((value, index, pages) => <span key={value}>{index > 0 && value - pages[index - 1] > 1 ? <span className="ska-ellipsis">…</span> : null}<button className={value === page ? "is-current" : ""} type="button" onClick={() => update({ page: value })}>{value}</button></span>)}<button type="button" disabled={page >= totalPages} onClick={() => update({ page: page + 1 })} aria-label="下一页"><AgentSourceIcon name="i-ri-arrow-right-s-line" /></button></> : null}</nav>
    </section>
    <div className="ska-compare-tray" hidden={!compared.length}><div><span>COMPARE</span><strong>{`已选择 ${compared.length}/3`}</strong></div><div className="ska-compare-items">{comparedItems.map((item) => <button type="button" onClick={() => toggleCompare(item.f)} key={item.f}>{item.n}<AgentSourceIcon name="i-ri-close-line" /></button>)}</div><button className="ska-compare-clear" type="button" onClick={() => setCompared([])}>清空</button><button className="ska-compare-open" type="button" disabled={compared.length < 2} onClick={() => dialog.current?.showModal()}>开始比较</button></div>
    <dialog className="ska-compare-dialog" ref={dialog}><div className="ska-compare-dialog-head"><div><span>PROJECT COMPARISON</span><h2>项目对比</h2></div><button type="button" onClick={() => dialog.current?.close()} aria-label="关闭对比"><AgentSourceIcon name="i-ri-close-line" /></button></div><div className="ska-compare-content">{comparedItems.length ? <table><thead><tr><th>指标</th>{comparedItems.map((item) => <th key={item.f}>{item.n}</th>)}</tr></thead><tbody>{[["作者", (item: AgentIndexItem) => item.a], ["类型", (item: AgentIndexItem) => AGENT_CATEGORY_LABELS[item.c] ?? item.c], ["Stars", (item: AgentIndexItem) => item.s.toLocaleString("zh-CN")], ["质量分", (item: AgentIndexItem) => `${agentQualityBand(item.q)} · ${item.q}`], ["安全评级", (item: AgentIndexItem) => item.g === "safe" ? "通过" : "需确认"], ["描述", (item: AgentIndexItem) => agentDescription(item, enrich.get(item.f))]].map(([label, value]) => <tr key={String(label)}><td>{String(label)}</td>{comparedItems.map((item) => <td key={item.f}>{(value as (item: AgentIndexItem) => string)(item)}</td>)}</tr>)}</tbody></table> : null}</div></dialog>
  </div>;
}
