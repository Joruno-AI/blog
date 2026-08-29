"use client";

import Link from "next/link";
import { ArrowRight, ArrowUpRight, Medal, Search, ShieldCheck, Star } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { AgentAvatar } from "@/components/site/agent-avatar";
import { AgentSkillCard } from "@/components/site/agent-skill-card";
import scenesData from "@/public/agent/scenes.json";
import {
  AGENT_CATEGORIES,
  AGENT_CATEGORY_LABELS,
  formatAgentCount,
  type AgentIndexItem,
  type AgentSkill,
} from "@/lib/agent/skills";

type IndexPayload = { generatedAt?: string; items?: AgentIndexItem[] };

export function AgentOverview({ selected }: { selected: AgentSkill[] }) {
  const [index, setIndex] = useState<AgentIndexItem[]>(selected);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [boardCategory, setBoardCategory] = useState("all");
  const [boardSort, setBoardSort] = useState<"s" | "q">("s");
  const [loading, setLoading] = useState(true);
  const enrich = useMemo(() => new Map(selected.map((skill) => [skill.f, skill])), [selected]);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/agent/full-index.json", { signal: controller.signal })
      .then((response) => response.ok ? response.json() as Promise<IndexPayload> : Promise.reject(new Error("index request failed")))
      .then((payload) => {
        if (Array.isArray(payload.items) && payload.items.length) setIndex(payload.items);
        setGeneratedAt(payload.generatedAt ?? null);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const ranked = useMemo(() => [...index].sort((a, b) => b.s - a.s), [index]);
  const featured = ranked[0];
  const totalStars = index.reduce((sum, skill) => sum + skill.s, 0);
  const safeCount = index.filter((skill) => skill.g === "safe").length;
  const average = index.length ? Math.round(index.reduce((sum, skill) => sum + skill.q, 0) / index.length * 10) / 10 : 0;
  const premiumCount = index.filter((skill) => skill.q >= 80).length;
  const categories = AGENT_CATEGORIES.map((category) => {
    const items = ranked.filter((skill) => skill.c === category);
    return { key: category, label: AGENT_CATEGORY_LABELS[category], count: items.length, items: items.slice(0, 3) };
  });
  const focal = [...categories].sort((a, b) => b.count - a.count)[0]?.key;
  const board = index
    .filter((item) => boardCategory === "all" || item.c === boardCategory)
    .sort((a, b) => boardSort === "s" ? b.s - a.s : b.q - a.q || b.s - a.s)
    .slice(0, 7);
  const curated = [...index].filter((skill) => skill.g === "safe").sort((a, b) => b.q - a.q || b.s - a.s).slice(0, 6);
  const updateLabel = generatedAt ? new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(generatedAt)) : "读取中";

  return (
    <>
      <section className="skills-hero">
        <div className="skills-hero-main">
          <p className="skills-eyebrow">Agent 能力索引 <small>更新于 {updateLabel}</small></p>
          <h1>找到真正值得装进<br />Agent 的能力</h1>
          <p className="skills-hero-copy">从 {index.length.toLocaleString("zh-CN")} 个开源 Skill、MCP Server 与 Agent 工具中搜索、筛选、比较，并直接在博客内阅读源码与文档。</p>
          <div className="skills-search-shell">
            <form className="skills-hero-search" action="/agent/all" method="get">
              <Search aria-hidden="true" /><input type="search" name="q" autoComplete="off" placeholder="搜索项目、作者或用途，例如 openclaw" aria-label="搜索 Agent 能力" /><kbd>/</kbd><button type="submit">开始搜索</button>
            </form>
          </div>
          <div className="skills-quick-search"><span>常用入口</span>{[["Claude Code", "claude code"], ["浏览器自动化", "browser automation"], ["代码审查", "code review"], ["MCP 数据库", "database"]].map(([label, query]) => <Link href={`/agent/all?q=${encodeURIComponent(query)}`} key={label}>{label}</Link>)}</div>
        </div>
        <aside className="skills-hero-pulse" aria-label="Skills 索引状态">
          <div className="skills-pulse-head"><div><strong>索引状态</strong></div><span className="skills-live"><i />{loading ? "同步中" : "已同步"}</span></div>
          <div className="skills-pulse-score"><span>覆盖项目</span><strong>{index.length.toLocaleString("zh-CN")}</strong><small>本地索引，无需跳转搜索</small></div>
          <div className="skills-pulse-bars">{categories.map((category) => <Link href={`/agent/all?cat=${category.key}`} data-focal={category.key === focal || undefined} key={category.key}><span>{category.label}</span><i aria-hidden="true"><b style={{ width: `${index.length ? category.count / index.length * 100 : 0}%` }} /></i><strong>{formatAgentCount(category.count)}</strong></Link>)}</div>
        </aside>
      </section>

      <section className="skills-stats">
        {[
          ["全量项目", index.length.toLocaleString("zh-CN"), "完整索引"],
          ["累计 Stars", formatAgentCount(totalStars), "社区热度"],
          ["安全评级通过", `${index.length ? Math.round(safeCount / index.length * 100) : 0}%`, `${safeCount.toLocaleString("zh-CN")} 项`],
          ["平均质量分", String(average), `${premiumCount} 个 S 级`],
        ].map(([label, value, note]) => <div className="skills-stat" key={label}><div><span className="skills-stat-value">{value}</span><span className="skills-stat-label">{label}</span></div><small>{note}</small></div>)}
      </section>

      {featured ? <section className="skills-discovery">
        <Link className="skills-feature-lead" href={`/agent/${featured.f}`}>
          <div className="skills-feature-noise" aria-hidden="true" /><div className="skills-feature-topline"><span>编辑推荐 · 社区热度第一</span><ArrowUpRight /></div>
          <div className="skills-feature-identity"><AgentAvatar author={featured.a} size={112} /><div><span>{featured.a}</span><h2>{featured.n}</h2></div></div>
          <p>{featured.d}</p><div className="skills-feature-metrics"><span><Star />{formatAgentCount(featured.s)} Stars</span><span><Medal />{featured.q} 质量分</span><span><ShieldCheck />安全状态：{featured.g === "safe" ? "通过" : "谨慎"}</span></div>
        </Link>
        <div className="skills-board">
          <div className="skills-board-head"><div><h2>实时榜单</h2></div><div className="skills-board-controls"><select aria-label="榜单分类" value={boardCategory} onChange={(event) => setBoardCategory(event.target.value)}><option value="all">全部分类</option>{AGENT_CATEGORIES.map((category) => <option value={category} key={category}>{AGENT_CATEGORY_LABELS[category]}</option>)}</select><div className="skills-sort" role="group" aria-label="榜单排序"><button className={boardSort === "s" ? "is-active" : ""} onClick={() => setBoardSort("s")} type="button">Stars</button><button className={boardSort === "q" ? "is-active" : ""} onClick={() => setBoardSort("q")} type="button">质量</button></div></div></div>
          <ol className="skills-board-list">{board.map((item, index) => <li key={item.f}><span className="skills-board-rank">{String(index + 1).padStart(2, "0")}</span><Link href={`/agent/${item.f}`}><strong>{item.n}</strong><small>{item.a}</small></Link><i className={item.g === "safe" ? "is-safe" : ""} /><span className="skills-board-value">{formatAgentCount(boardSort === "s" ? item.s : item.q)}</span></li>)}</ol>
          <Link className="skills-board-more" href="/agent/all">浏览完整目录 <ArrowRight /></Link>
        </div>
      </section> : null}

      <section className="skills-section"><div className="skills-section-head"><div><h2>按工具类型开始</h2></div><p>先选生态，再看其中真正活跃的项目</p></div><div className="skills-category-grid">{categories.filter((category) => category.count > 0).map((category) => <article className="skills-category-card" key={category.key}><div className="skills-category-title"><span className="skills-category-symbol" aria-hidden="true">{category.label.slice(0, 1)}</span><div><h3>{category.label}</h3><p>{category.count.toLocaleString("zh-CN")} 个项目</p></div><Link href={`/agent/all?cat=${category.key}`} aria-label={`查看全部 ${category.label}`}><ArrowRight /></Link></div><ol>{category.items.map((skill, index) => <li key={skill.f}><span>{String(index + 1).padStart(2, "0")}</span><Link href={`/agent/${skill.f}`}>{skill.n}</Link><small>{formatAgentCount(skill.s)}</small></li>)}</ol></article>)}</div></section>

      <section className="skills-section"><div className="skills-section-head"><div><h2>高质量精选</h2></div><Link className="skills-section-more" href="/agent/all?sort=q&safe=1">查看全部 <ArrowRight /></Link></div><div className="skills-grid">{curated.map((skill) => <AgentSkillCard item={skill} enrich={enrich.get(skill.f)} key={skill.f} />)}</div></section>

      <section className="skills-scenes"><div className="skills-section-head"><div><h2>按场景找工具</h2></div><Link className="skills-section-more" href="/agent/scenes">全部场景 <ArrowRight /></Link></div><div className="skills-scene-chips">{scenesData.scenes.slice(0, 16).map((scene, index) => <Link href={`/agent/scenes/${scene.slug}`} key={scene.slug}><span>{String(index + 1).padStart(2, "0")}</span>{scene.title}<ArrowUpRight /></Link>)}</div></section>
    </>
  );
}
