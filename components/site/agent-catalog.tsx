"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, Check, ChevronLeft, ChevronRight, Copy, Download, LayoutGrid, List, RotateCcw, Scale, Search, ShieldCheck, Star, X } from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";

import { AgentAvatar } from "@/components/site/agent-avatar";
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
    <div className="ska-card-meta"><span><Star />{formatAgentCount(item.s)}</span>{enrich?.installs ? <span><Download />{formatAgentCount(enrich.installs)}</span> : null}<span className="ska-card-cat">{AGENT_CATEGORY_LABELS[item.c] ?? item.c}</span></div>
    <div className="ska-card-foot"><button className={`ska-card-compare ${selected ? "is-active" : ""}`} type="button" onClick={onCompare} aria-pressed={selected}><Scale />对比</button>{installable ? <button className={`ska-card-install ${copied ? "is-copied" : ""}`} type="button" onClick={() => void copy()}>{copied ? <Check /> : <Copy />}{copied ? "已复制" : "复制安装命令"}</button> : <Link className="ska-card-read" href={`/agent/${item.f}`}><BookOpen />站内阅读</Link>}<Link className="ska-card-more" href={`/agent/${item.f}`} aria-label={`查看 ${item.n}`}><ArrowRight /></Link></div>
  </article>;
}

function pageNumbers(current: number, total: number) {
  const values = new Set([1, total, current - 2, current - 1, current, current + 1, current + 2]);
  return [...values].filter((value) => value >= 1 && value <= total).sort((a, b) => a - b);
}

export function AgentCatalog({ selected, initial }: { selected: AgentSkill[]; initial: Partial<CatalogState> }) {
  const [items, setItems] = useState<AgentIndexItem[]>(selected);
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<CatalogState>({ category: initial.category || "all", quality: initial.quality || "all", sort: initial.sort || "score", query: initial.query || "", safe: Boolean(initial.safe), page: Math.max(1, initial.page || 1), view: initial.view === "table" ? "table" : "card" });
  const [compared, setCompared] = useState<string[]>([]);
  const dialog = useRef<HTMLDialogElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const enrich = useMemo(() => new Map(selected.map((skill) => [skill.f, skill])), [selected]);
  const deferredQuery = useDeferredValue(state.query);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/agent/full-index.json", { signal: controller.signal }).then((response) => response.json() as Promise<{ items?: AgentIndexItem[] }>).then((payload) => { if (Array.isArray(payload.items)) setItems(payload.items); }).catch(() => undefined).finally(() => setLoading(false));
    return () => controller.abort();
  }, []);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "/" && document.activeElement?.tagName !== "INPUT") { event.preventDefault(); searchRef.current?.focus(); } };
    document.addEventListener("keydown", onKey); return () => document.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => {
    const params = new URLSearchParams();
    if (state.category !== "all") params.set("cat", state.category);
    if (state.quality !== "all") params.set("quality", state.quality);
    if (state.sort !== "score") params.set("sort", state.sort);
    if (state.query) params.set("q", state.query);
    if (state.safe) params.set("safe", "1");
    if (state.page > 1) params.set("page", String(state.page));
    if (state.view !== "card") params.set("view", state.view);
    window.history.replaceState(null, "", `/agent/all${params.size ? `?${params}` : ""}`);
    localStorage.setItem("skills-catalog-view", state.view);
  }, [state]);

  const categoryCounts = useMemo(() => Object.fromEntries(AGENT_CATEGORIES.map((category) => [category, items.filter((item) => item.c === category).length])), [items]);
  const qualityCounts = useMemo(() => Object.fromEntries(["S", "A", "B", "C"].map((band) => [band, items.filter((item) => agentQualityBand(item.q) === band).length])), [items]);
  const filtered = useMemo(() => {
    const query = deferredQuery.trim().toLowerCase();
    return items.filter((item) => state.category === "all" || item.c === state.category)
      .filter((item) => state.quality === "all" || agentQualityBand(item.q) === state.quality)
      .filter((item) => !state.safe || item.g === "safe")
      .filter((item) => !query || `${item.n} ${item.a} ${item.d} ${enrich.get(item.f)?.keywords ?? ""}`.toLowerCase().includes(query))
      .sort((a, b) => state.sort === "q" ? b.q - a.q || b.s - a.s : state.sort === "s" ? b.s - a.s : state.sort === "n" ? a.n.localeCompare(b.n) : agentCatalogScore(b) - agentCatalogScore(a));
  }, [deferredQuery, enrich, items, state.category, state.quality, state.safe, state.sort]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(state.page, totalPages);
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const update = (patch: Partial<CatalogState>) => setState((value) => ({ ...value, ...patch, page: "page" in patch ? patch.page ?? 1 : 1 }));
  const toggleCompare = (id: string) => setCompared((current) => current.includes(id) ? current.filter((item) => item !== id) : current.length < 3 ? [...current, id] : current);
  const comparedItems = compared.map((id) => items.find((item) => item.f === id)).filter((item): item is AgentIndexItem => Boolean(item));
  const reset = () => setState({ category: "all", quality: "all", sort: "score", query: "", safe: false, page: 1, view: "card" });

  return <div className="ska-shell">
    <aside className="ska-filters" aria-label="技能筛选器">
      <div className="ska-filter-head"><div><span>FILTERS</span><strong>缩小范围</strong></div><button type="button" onClick={reset}><RotateCcw />重置</button></div>
      <section className="ska-filter-group"><h2>工具类型</h2><div className="ska-filter-list"><button className={state.category === "all" ? "is-active" : ""} type="button" onClick={() => update({ category: "all" })}><span>全部项目</span><small>{items.length.toLocaleString("zh-CN")}</small></button>{AGENT_CATEGORIES.map((category) => <button className={state.category === category ? "is-active" : ""} type="button" onClick={() => update({ category })} key={category}><span>{AGENT_CATEGORY_LABELS[category]}</span><small>{(categoryCounts[category] ?? 0).toLocaleString("zh-CN")}</small></button>)}</div></section>
      <section className="ska-filter-group"><h2>质量等级</h2><div className="ska-quality-list">{(["S", "A", "B", "C"] as const).map((band) => <button className={state.quality === band ? "is-active" : ""} type="button" onClick={() => update({ quality: state.quality === band ? "all" : band })} key={band}><b>{band}</b><span>{band === "S" ? "80+" : band === "A" ? "65–79" : band === "B" ? "50–64" : "<50"}</span><small>{qualityCounts[band]}</small></button>)}</div></section>
      <label className="ska-safe"><span><ShieldCheck />仅看安全评级通过</span><input type="checkbox" checked={state.safe} onChange={(event) => update({ safe: event.target.checked })} /></label>
      <p className="ska-filter-note">所有项目详情、README 与源码浏览均优先在本站完成。</p>
    </aside>
    <section className="ska-results" aria-label="技能搜索结果">
      <div className="ska-toolbar"><label className="ska-search"><Search /><input ref={searchRef} type="search" value={state.query} onChange={(event) => update({ query: event.target.value })} placeholder="搜索名称、作者或用途" aria-label="搜索全部项目" /><kbd>/</kbd></label><div className="ska-sort-select"><span>排序</span><select value={state.sort} onChange={(event) => update({ sort: event.target.value })} aria-label="排序方式"><option value="score">综合推荐</option><option value="s">Stars</option><option value="q">质量分</option><option value="n">名称</option></select></div><div className="ska-view"><button className={state.view === "card" ? "is-active" : ""} type="button" onClick={() => update({ view: "card" })} aria-label="卡片视图"><LayoutGrid /></button><button className={state.view === "table" ? "is-active" : ""} type="button" onClick={() => update({ view: "table" })} aria-label="列表视图"><List /></button></div></div>
      <div className="ska-results-head"><p className="ska-summary" aria-live="polite">{loading ? "正在读取全量索引…" : `找到 ${filtered.length.toLocaleString("zh-CN")} 个项目 · 第 ${page}/${totalPages} 页`}</p><p className="ska-selection-note">最多选择 3 个项目进行比较</p></div>
      {state.view === "card" ? <div className="ska-grid">{visible.map((item) => <CatalogCard item={item} enrich={enrich.get(item.f)} selected={compared.includes(item.f)} onCompare={() => toggleCompare(item.f)} key={item.f} />)}</div> : <div className="ska-table-wrap"><table className="ska-table"><thead><tr><th>项目</th><th>类型</th><th>Stars</th><th>质量</th><th>安全</th><th>操作</th></tr></thead><tbody>{visible.map((item) => <tr key={item.f}><td><Link href={`/agent/${item.f}`}><AgentAvatar className="ska-table-avatar" author={item.a} size={64} /><span><strong>{item.n}</strong><small>{item.a}</small></span></Link></td><td>{AGENT_CATEGORY_LABELS[item.c] ?? item.c}</td><td>{formatAgentCount(item.s)}</td><td><span className="ska-table-quality"><b>{agentQualityBand(item.q)}</b>{item.q}</span></td><td>{item.g === "safe" ? "通过" : "需确认"}</td><td><button className={`ska-card-compare ${compared.includes(item.f) ? "is-active" : ""}`} onClick={() => toggleCompare(item.f)} type="button"><Scale />对比</button><Link className="ska-table-open" href={`/agent/${item.f}`}>打开</Link></td></tr>)}</tbody></table></div>}
      <nav className="ska-pager" aria-label="分页"><button type="button" disabled={page <= 1} onClick={() => update({ page: page - 1 })} aria-label="上一页"><ChevronLeft /></button>{pageNumbers(page, totalPages).map((value, index, pages) => <span key={value}>{index > 0 && value - pages[index - 1] > 1 ? <span className="ska-ellipsis">…</span> : null}<button className={value === page ? "is-current" : ""} type="button" onClick={() => update({ page: value })}>{value}</button></span>)}<button type="button" disabled={page >= totalPages} onClick={() => update({ page: page + 1 })} aria-label="下一页"><ChevronRight /></button></nav>
    </section>
    <div className="ska-compare-tray" hidden={!compared.length}><div><span>COMPARE</span><strong>已选择 {compared.length}/3</strong></div><div className="ska-compare-items">{comparedItems.map((item) => <button type="button" onClick={() => toggleCompare(item.f)} key={item.f}>{item.n}<X /></button>)}</div><button className="ska-compare-clear" type="button" onClick={() => setCompared([])}>清空</button><button className="ska-compare-open" type="button" disabled={compared.length < 2} onClick={() => dialog.current?.showModal()}>开始比较</button></div>
    <dialog className="ska-compare-dialog" ref={dialog}><div className="ska-compare-dialog-head"><div><span>PROJECT COMPARISON</span><h2>项目对比</h2></div><button type="button" onClick={() => dialog.current?.close()} aria-label="关闭对比"><X /></button></div><div className="ska-compare-content"><table><thead><tr><th>指标</th>{comparedItems.map((item) => <th key={item.f}>{item.n}</th>)}</tr></thead><tbody>{[["作者", (item: AgentIndexItem) => item.a], ["类型", (item: AgentIndexItem) => AGENT_CATEGORY_LABELS[item.c] ?? item.c], ["Stars", (item: AgentIndexItem) => item.s.toLocaleString("zh-CN")], ["质量分", (item: AgentIndexItem) => `${agentQualityBand(item.q)} · ${item.q}`], ["安全评级", (item: AgentIndexItem) => item.g === "safe" ? "通过" : "需确认"], ["描述", (item: AgentIndexItem) => agentDescription(item, enrich.get(item.f))]].map(([label, value]) => <tr key={String(label)}><td>{String(label)}</td>{comparedItems.map((item) => <td key={item.f}>{(value as (item: AgentIndexItem) => string)(item)}</td>)}</tr>)}</tbody></table></div></dialog>
  </div>;
}
