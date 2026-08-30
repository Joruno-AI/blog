"use client";

import { useEffect, useMemo, useState } from "react";

import {
  loadAgentFullIndex,
  loadAgentSelectedIndex,
  selectedAgentSkill,
} from "@/components/site/agent-browser-data";
import { AgentSkillCard } from "@/components/site/agent-skill-card";
import type { AgentSkill } from "@/lib/agent/skills";
import type { AgentTrendingInitial } from "@/lib/agent/ssr-projections";

function daysAgo(iso: string, now = Date.now()) {
  const days = Math.floor((now - new Date(iso).getTime()) / 86_400_000);
  return days <= 0 ? "今天" : days < 30 ? `${days} 天前` : days < 365 ? `${Math.floor(days / 30)} 个月前` : `${Math.floor(days / 365)} 年前`;
}

export function AgentTrending({ initial }: { initial?: AgentTrendingInitial }) {
  const [skills, setSkills] = useState<AgentSkill[]>([]);
  const [loading, setLoading] = useState(!initial);
  const [indexReady, setIndexReady] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([
      loadAgentFullIndex(),
      loadAgentSelectedIndex().catch(() => []),
    ]).then(([full, selected]) => {
      if (!active) return;
      const byRepository = new Map(full.items.map((item) => [item.f, item]));
      setSkills(selected.flatMap((metadata) => {
        const item = byRepository.get(metadata.f);
        return item ? [selectedAgentSkill(item, metadata)] : [];
      }));
      setIndexReady(true);
    }).catch(() => undefined).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const view = useMemo(() => {
    if (!indexReady && initial) {
      const snapshotTime = new Date(initial.generatedAt).getTime();
      return {
        hasGithubMeta: Boolean(initial.recent.length || initial.newItems.length),
        languages: initial.languages,
        maximum: initial.languages[0]?.[1] ?? 1,
        sections: [
          { title: "最近更新", hint: "按仓库最近提交时间排序", items: initial.recent, meta: (skill: AgentSkill) => daysAgo(skill.pushedAt!, snapshotTime) },
          { title: "新面孔", hint: "按仓库创建时间排序", items: initial.newItems, meta: (skill: AgentSkill) => `创建于 ${daysAgo(skill.createdAt!, snapshotTime)}` },
          { title: "Star 增速", hint: "与上一次数据快照对比", items: initial.delta, meta: (skill: AgentSkill) => `+${skill.starsDelta} stars` },
        ],
      };
    }
    const hasGithubMeta = skills.some((skill) => skill.pushedAt);
    const sections = [
      { title: "最近更新", hint: "按仓库最近提交时间排序", items: skills.filter((skill) => skill.pushedAt).sort((a, b) => String(b.pushedAt).localeCompare(String(a.pushedAt))).slice(0, 18), meta: (skill: AgentSkill) => daysAgo(skill.pushedAt!) },
      { title: "新面孔", hint: "按仓库创建时间排序", items: skills.filter((skill) => skill.createdAt).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(0, 18), meta: (skill: AgentSkill) => `创建于 ${daysAgo(skill.createdAt!)}` },
      { title: "Star 增速", hint: "与上一次数据快照对比", items: skills.filter((skill) => (skill.starsDelta ?? 0) > 0).sort((a, b) => (b.starsDelta ?? 0) - (a.starsDelta ?? 0)).slice(0, 18), meta: (skill: AgentSkill) => `+${skill.starsDelta} stars` },
    ];
    const languages = Object.entries(skills.reduce<Record<string, number>>((result, skill) => {
      if (skill.language) result[skill.language] = (result[skill.language] ?? 0) + 1;
      return result;
    }, {})).sort((a, b) => b[1] - a[1]).slice(0, 12);
    return { hasGithubMeta, languages, maximum: languages[0]?.[1] ?? 1, sections };
  }, [indexReady, initial, skills]);

  if (loading) return <div className="agent-loading" role="status"><span><i />正在读取趋势索引…</span></div>;

  return <>
    {!view.hasGithubMeta ? <p className="trend-empty slide-enter">仓库动态数据暂未同步，运行一次 pnpm sync:skills 后即可展示。</p> : null}
    {view.sections.map((section, index) => section.items.length ? <section className="trend-section slide-enter" style={{ "--enter-stage": index } as React.CSSProperties} key={section.title}><div className="trend-section-head"><h2 className="trend-section-title">{section.title}</h2><span className="trend-section-hint">{section.hint}</span></div><div className="trend-grid">{section.items.map((skill) => <AgentSkillCard item={skill} enrich={skill} hasDetail metaText={section.meta(skill)} key={skill.f} />)}</div></section> : section.title === "Star 增速" && view.hasGithubMeta ? <section className="trend-section slide-enter" key={section.title}><div className="trend-section-head"><h2 className="trend-section-title">{section.title}</h2></div><p className="trend-empty">增速数据需要至少两次数据快照对比，随每次数据同步逐步积累。</p></section> : null)}
    {view.languages.length ? <section className="trend-section slide-enter"><div className="trend-section-head"><h2 className="trend-section-title">语言分布</h2><span className="trend-section-hint">精选项目的主要实现语言</span></div><div className="trend-langs">{view.languages.map(([language, count], index) => <div className="trend-lang-row" data-focal={index === 0 ? "true" : undefined} key={language}><span className="trend-lang-name">{language}</span><span className="trend-lang-bar" aria-hidden="true"><i style={{ width: `${count / view.maximum * 100}%` }} /></span><span className="trend-lang-count">{count}</span></div>)}</div></section> : null}
  </>;
}
