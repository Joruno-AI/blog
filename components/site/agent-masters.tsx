"use client";

/* eslint-disable @next/next/no-img-element -- production Agent masters use direct lazy GitHub images. */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  loadAgentFullIndex,
  loadAgentSelectedIndex,
  selectedAgentSkill,
} from "@/components/site/agent-browser-data";
import { AgentSourceIcon } from "@/components/site/agent-source-icon";
import { formatAgentCount, type AgentSkill } from "@/lib/agent/skills";
import type { AgentMasterInitial } from "@/lib/agent/ssr-projections";

export function AgentMasters({ initial }: { initial?: AgentMasterInitial[] }) {
  const [skills, setSkills] = useState<AgentSkill[]>([]);
  const [loading, setLoading] = useState(!initial);
  const [indexReady, setIndexReady] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([loadAgentFullIndex(), loadAgentSelectedIndex().catch(() => [])])
      .then(([full, selected]) => {
        if (!active) return;
        const byRepository = new Map(full.items.map((item) => [item.f, item]));
        setSkills(selected.flatMap((metadata) => {
          const item = byRepository.get(metadata.f);
          return item ? [selectedAgentSkill(item, metadata)] : [];
        }));
        setIndexReady(true);
      })
      .catch(() => undefined)
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const masters = useMemo(() => {
    if (!indexReady && initial) return initial;
    const grouped = new Map<string, AgentSkill[]>();
    for (const skill of skills) {
      const repositories = grouped.get(skill.a);
      if (repositories) repositories.push(skill);
      else grouped.set(skill.a, [skill]);
    }
    return [...grouped].map(([author, repositories]) => {
      const repos = [...repositories].sort((a, b) => b.s - a.s);
      return {
        author,
        repos,
        repoCount: repos.length,
        totalStars: repos.reduce((sum, item) => sum + item.s, 0),
        totalInstalls: repos.reduce((sum, item) => sum + (item.installs ?? 0), 0),
        avgQuality: Math.round(repos.reduce((sum, item) => sum + item.q, 0) / repos.length * 10) / 10,
      };
    }).sort((a, b) => b.totalStars - a.totalStars).slice(0, 50);
  }, [indexReady, initial, skills]);

  if (loading) return <div className="agent-loading" role="status"><span><i />正在读取创作者索引…</span></div>;

  return <>
    <section className="masters-podium slide-enter" aria-label="前三名创作者">{masters.slice(0, 3).map((master, index) => <article className={`masters-podium-card is-${index + 1}`} key={master.author}><span className="masters-podium-rank">{String(index + 1).padStart(2, "0")}</span><img className="masters-podium-avatar" src={`https://github.com/${master.author}.png?size=144`} alt={master.author} loading="lazy" decoding="async" /><Link className="site-link no-underline" href={`/agent/all/?q=${encodeURIComponent(master.author)}`}>{master.author}</Link><p>{master.repoCount} 个项目 · 平均质量 {master.avgQuality}</p><div><span>累计 Stars</span><strong>{formatAgentCount(master.totalStars)}</strong></div></article>)}</section>
    <ol className="masters-list slide-enter">{masters.slice(3).map((master, index) => <li className="masters-row" key={master.author}><span className="masters-rank">{index + 4}</span><img className="masters-avatar" src={`https://github.com/${master.author}.png?size=96`} alt={master.author} loading="lazy" decoding="async" /><div className="masters-info"><Link className="site-link no-underline masters-name" href={`/agent/all/?q=${encodeURIComponent(master.author)}`}>{master.author}</Link><span className="masters-repos">{master.repos.slice(0, 3).map((repo, repoIndex) => <span key={repo.f}>{repoIndex > 0 ? " · " : ""}<Link className="site-link no-underline" href={`/agent/${repo.f}/`}>{repo.n}</Link></span>)}</span></div><div className="masters-metrics"><span title="收录作品数"><AgentSourceIcon name="i-ri-archive-line" />{master.repoCount}</span><span title="总 Star 数"><AgentSourceIcon name="i-ri-star-line" />{formatAgentCount(master.totalStars)}</span>{master.totalInstalls ? <span title="总安装量"><AgentSourceIcon name="i-ri-download-2-line" />{formatAgentCount(master.totalInstalls)}</span> : null}<span title="平均质量分"><AgentSourceIcon name="i-ri-medal-line" />{master.avgQuality}</span></div></li>)}</ol>
  </>;
}
