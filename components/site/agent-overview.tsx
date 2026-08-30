"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { AgentCategoryIcon, agentCategoryIconName } from "@/components/site/agent-category-icon";
import {
  loadAgentFullIndex,
  loadAgentSelectedIndex,
  selectedAgentSkill,
} from "@/components/site/agent-browser-data";
import { AgentSkillCard } from "@/components/site/agent-skill-card";
import { AgentSelect } from "@/components/site/agent-select";
import { AgentSourceIcon } from "@/components/site/agent-source-icon";
import scenesData from "@/lib/parity/data/agent-scenes.json";
import {
  AGENT_CATEGORIES,
  AGENT_CATEGORY_LABELS,
  formatAgentCount,
  type AgentIndexItem,
  type AgentSkill,
} from "@/lib/agent/skills";
import type { AgentOverviewInitial } from "@/lib/agent/ssr-projections";

function overviewSeed(initial?: AgentOverviewInitial) {
  if (!initial) return [];
  const items = [
    ...(initial.featured ? [initial.featured] : []),
    ...initial.board,
    ...initial.categories.flatMap((category) => category.items),
    ...initial.curated,
  ];
  return [...new Map(items.map((item) => [item.f, item])).values()];
}

export function AgentOverview({ initial }: { initial?: AgentOverviewInitial }) {
  const allPath = "/agent/all/";
  const [index, setIndex] = useState<AgentIndexItem[]>(() => overviewSeed(initial));
  const [enrich, setEnrich] = useState<Map<string, AgentSkill>>(() => new Map(initial?.enrich.map((item) => [item.f, item])));
  const generatedAt = initial?.generatedAt ?? null;
  const [indexReady, setIndexReady] = useState(false);
  const [boardCategory, setBoardCategory] = useState("all");
  const [boardSort, setBoardSort] = useState<"s" | "q">("s");
  const [loading, setLoading] = useState(!initial);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    Promise.all([loadAgentFullIndex(), loadAgentSelectedIndex().catch(() => [])])
      .then(([payload, selected]) => {
        if (!active) return;
        setIndex(payload.items);
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
    const keydown = (event: KeyboardEvent) => {
      const active = document.activeElement;
      if (event.key !== "/" || active?.tagName === "INPUT" || active?.tagName === "TEXTAREA" || active?.getAttribute("contenteditable") === "true") return;
      event.preventDefault();
      event.stopPropagation();
      searchRef.current?.focus();
    };
    document.addEventListener("keydown", keydown, true);
    return () => document.removeEventListener("keydown", keydown, true);
  }, []);

  const summary = useMemo(() => {
    if (!indexReady && initial) {
      return {
        count: initial.count,
        ranked: initial.board,
        totalStars: initial.totalStars,
        safeCount: initial.safeCount,
        average: initial.average,
        premiumCount: initial.premiumCount,
        categories: initial.categories,
        focal: initial.categories.reduce((largest, category) => category.count > (largest?.count ?? -1) ? category : largest, initial.categories[0])?.key,
        curated: initial.curated,
        featured: initial.featured,
      };
    }
    const ranked = [...index].sort((a, b) => b.s - a.s);
    const categoryItems = new Map<string, AgentIndexItem[]>();
    let totalStars = 0;
    let totalQuality = 0;
    let safeCount = 0;
    let premiumCount = 0;
    for (const item of index) {
      totalStars += item.s;
      totalQuality += item.q;
      if (item.g === "safe") safeCount += 1;
      if (item.q >= 80) premiumCount += 1;
    }
    for (const item of ranked) {
      const category = categoryItems.get(item.c) ?? [];
      category.push(item);
      categoryItems.set(item.c, category);
    }
    const categories = AGENT_CATEGORIES.map((category) => {
      const items = categoryItems.get(category) ?? [];
      return { key: category, label: AGENT_CATEGORY_LABELS[category], count: items.length, items: items.slice(0, 3) };
    });
    return {
      count: index.length,
      ranked,
      totalStars,
      safeCount,
      average: index.length ? Math.round(totalQuality / index.length * 10) / 10 : 0,
      premiumCount,
      categories,
      focal: categories.reduce((largest, category) => category.count > (largest?.count ?? -1) ? category : largest, categories[0])?.key,
      curated: index.filter((item) => item.g === "safe").sort((a, b) => b.q - a.q || b.s - a.s).slice(0, 6),
      featured: ranked[0] ?? null,
    };
  }, [index, indexReady, initial]);
  const { average, categories, count, curated, featured, focal, premiumCount, safeCount, totalStars } = summary;
  const board = useMemo(() => index
    .filter((item) => boardCategory === "all" || item.c === boardCategory)
    .sort((a, b) => boardSort === "s" ? b.s - a.s : b.q - a.q || b.s - a.s)
    .slice(0, 7), [boardCategory, boardSort, index]);
  const updateLabel = generatedAt ? new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(generatedAt)) : "读取中";

  return (
    <>
      <section className="skills-hero">
        <div className="skills-hero-main">
          <p className="skills-eyebrow">Agent 能力索引<small>{`更新于 ${updateLabel}`}</small></p>
          <h1>找到真正值得装进<br />Agent 的能力</h1>
          <p className="skills-hero-copy">从 {count.toLocaleString("zh-CN")} 个开源 Skill、MCP Server 与 Agent 工具中搜索、筛选、比较，并直接在博客内阅读源码与文档。</p>
          <div className="skills-search-shell">
            <form className="skills-hero-search" action={allPath} method="get">
              <AgentSourceIcon name="i-ri-search-line" /><input ref={searchRef} type="search" name="q" autoComplete="off" placeholder="搜索项目、作者或用途，例如 openclaw" aria-label="搜索 Agent 能力" /><kbd>/</kbd><button type="submit">开始搜索</button>
            </form>
          </div>
          <div className="skills-quick-search"><span>常用入口</span>{[["Claude Code", "claude code"], ["浏览器自动化", "browser automation"], ["代码审查", "code review"], ["MCP 数据库", "database"]].map(([label, query]) => <Link href={`${allPath}?q=${encodeURIComponent(query)}`} key={label}>{label}</Link>)}</div>
        </div>
        <aside className="skills-hero-pulse" aria-label="Skills 索引状态">
          <div className="skills-pulse-head"><div><strong>索引状态</strong></div><span className="skills-live"><i />{loading ? "同步中" : "已同步"}</span></div>
          <div className="skills-pulse-score"><span>覆盖项目</span><strong>{count.toLocaleString("zh-CN")}</strong><small>本地索引，无需跳转搜索</small></div>
          <div className="skills-pulse-bars">{categories.map((category) => <Link href={`${allPath}?cat=${category.key}`} data-focal={category.key === focal || undefined} key={category.key}><span>{category.label}</span><i aria-hidden="true"><b style={{ width: `${count ? category.count / count * 100 : 0}%` }} /></i><strong>{formatAgentCount(category.count)}</strong></Link>)}</div>
        </aside>
      </section>

      <section className="skills-stats">
        {[
          ["全量项目", count.toLocaleString("zh-CN"), "完整索引"],
          ["累计 Stars", formatAgentCount(totalStars), "社区热度"],
          ["安全评级通过", `${count ? Math.round(safeCount / count * 100) : 0}%`, `${safeCount.toLocaleString("zh-CN")} 项`],
          ["平均质量分", String(average), `${premiumCount} 个 S 级`],
        ].map(([label, value, note]) => <div className="skills-stat" key={label}><div><span className="skills-stat-value">{value}</span><span className="skills-stat-label">{label}</span></div><small>{note}</small></div>)}
      </section>

      {featured ? <section className="skills-discovery">
        <Link className="skills-feature-lead" href={`/agent/${featured.f}/`}>
          <div className="skills-feature-noise" aria-hidden="true" /><div className="skills-feature-topline"><span>编辑推荐 · 社区热度第一</span><AgentSourceIcon name="i-ri-arrow-right-up-line" /></div>
          <div className="skills-feature-identity"><Image src={`https://github.com/${encodeURIComponent(featured.a)}.png?size=112`} alt={featured.a} width={112} height={112} sizes="112px" loading="lazy" unoptimized /><div><span>{featured.a}</span><h2>{featured.n}</h2></div></div>
          <p>{featured.d}</p><div className="skills-feature-metrics"><span><AgentSourceIcon name="i-ri-star-line" />{formatAgentCount(featured.s)} Stars</span><span><AgentSourceIcon name="i-ri-medal-line" />{featured.q} 质量分</span><span><AgentSourceIcon name="i-ri-shield-check-line" />{`安全状态：${featured.g === "safe" ? "通过" : "谨慎"}`}</span></div>
        </Link>
        <div className="skills-board">
          <div className="skills-board-head"><div><h2>实时榜单</h2></div><div className="skills-board-controls"><AgentSelect className="skills-board-select" ariaLabel="榜单分类" value={boardCategory} onValueChange={setBoardCategory} options={[{ value: "all", label: "全部分类", icon: "i-ri-apps-2-line" }, ...AGENT_CATEGORIES.map((category) => ({ value: category, label: AGENT_CATEGORY_LABELS[category], icon: agentCategoryIconName(category) }))]} /><div className="skills-sort" role="group" aria-label="榜单排序"><button className={boardSort === "s" ? "is-active" : ""} onClick={() => setBoardSort("s")} type="button">Stars</button><button className={boardSort === "q" ? "is-active" : ""} onClick={() => setBoardSort("q")} type="button">质量</button></div></div></div>
          <ol className="skills-board-list">{board.map((item, index) => <li key={item.f}><span className="skills-board-rank">{String(index + 1).padStart(2, "0")}</span><Link href={`/agent/${item.f}/`}><strong>{item.n}</strong><small>{item.a}</small></Link><i className={item.g === "safe" ? "is-safe" : ""} /><span className="skills-board-value">{formatAgentCount(boardSort === "s" ? item.s : item.q)}</span></li>)}</ol>
          <Link className="skills-board-more" href={allPath}>浏览完整目录 <AgentSourceIcon name="i-ri-arrow-right-line" /></Link>
        </div>
      </section> : null}

      <section className="skills-section"><div className="skills-section-head"><div><h2>按工具类型开始</h2></div><p>先选生态，再看其中真正活跃的项目</p></div><div className="skills-category-grid">{categories.filter((category) => category.count > 0).map((category) => <article className="skills-category-card" key={category.key}><div className="skills-category-title"><AgentCategoryIcon category={category.key} size="lg" /><div><h3>{category.label}</h3><p>{category.count.toLocaleString("zh-CN")} 个项目</p></div><Link href={`${allPath}?cat=${category.key}`} aria-label={`查看全部 ${category.label}`}><AgentSourceIcon name="i-ri-arrow-right-line" /></Link></div><ol>{category.items.map((skill, index) => <li key={skill.f}><span>{String(index + 1).padStart(2, "0")}</span><Link href={`/agent/${skill.f}/`}>{skill.n}</Link><small>{formatAgentCount(skill.s)}</small></li>)}</ol></article>)}</div></section>

      <section className="skills-section"><div className="skills-section-head"><div><h2>高质量精选</h2></div><Link className="skills-section-more" href={`${allPath}?sort=q&safe=1`}>查看全部 <AgentSourceIcon name="i-ri-arrow-right-line" /></Link></div><div className="skills-grid">{curated.map((skill) => <AgentSkillCard item={skill} enrich={enrich.get(skill.f)} key={skill.f} />)}</div></section>

      <section className="skills-scenes"><div className="skills-section-head"><div><h2>按场景找工具</h2></div><Link className="skills-section-more" href="/agent/scenes/">全部 {scenesData.scenes.length} 个场景 <AgentSourceIcon name="i-ri-arrow-right-line" /></Link></div><div className="skills-scene-chips">{scenesData.scenes.slice(0, 16).map((scene, index) => <Link className="skills-scene-link" href={`/agent/scenes/${scene.slug}/`} key={scene.slug}><span className="skills-scene-index">{String(index + 1).padStart(2, "0")}</span><strong>{scene.title}</strong><AgentSourceIcon name="i-ri-arrow-right-up-line" /><small>{scene.desc}</small></Link>)}</div></section>
    </>
  );
}
