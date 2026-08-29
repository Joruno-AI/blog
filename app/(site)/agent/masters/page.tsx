import Link from "next/link";

import { AgentAvatar } from "@/components/site/agent-avatar";
import { AgentPageShell } from "@/components/site/agent-page-shell";
import { getSelectedAgentSkills } from "@/lib/agent/queries";
import { formatAgentCount } from "@/lib/agent/skills";

export const dynamic = "force-dynamic";

export default async function Page() {
  const skills = await getSelectedAgentSkills();
  const grouped = new Map<string, typeof skills>();
  for (const skill of skills) grouped.set(skill.a, [...(grouped.get(skill.a) ?? []), skill]);
  const masters = [...grouped].map(([author, repos]) => { const sorted = [...repos].sort((a, b) => b.s - a.s); return { author, repos: sorted, repoCount: repos.length, totalStars: repos.reduce((sum, item) => sum + item.s, 0), totalInstalls: repos.reduce((sum, item) => sum + (item.installs ?? 0), 0), avgQuality: Math.round(repos.reduce((sum, item) => sum + item.q, 0) / repos.length * 10) / 10 }; }).sort((a, b) => b.totalStars - a.totalStars).slice(0, 50);
  return <AgentPageShell active="masters" title="创作者" subtitle="按作者聚合的创作者排行榜 (Top 50)"><section className="masters-podium" aria-label="前三名创作者">{masters.slice(0, 3).map((master, index) => <article className={`masters-podium-card is-${index + 1}`} key={master.author}><span>{String(index + 1).padStart(2, "0")}</span><AgentAvatar author={master.author} size={144} /><Link href={`/agent/all?q=${encodeURIComponent(master.author)}`}>{master.author}</Link><p>{master.repoCount} 个项目 · 平均质量 {master.avgQuality}</p><div><span>累计 Stars</span><strong>{formatAgentCount(master.totalStars)}</strong></div></article>)}</section><ol className="masters-list">{masters.slice(3).map((master, index) => <li className="masters-row" key={master.author}><span>{index + 4}</span><AgentAvatar className="masters-avatar" author={master.author} size={96} /><div className="masters-info"><Link className="masters-name" href={`/agent/all?q=${encodeURIComponent(master.author)}`}>{master.author}</Link><span className="masters-repos">{master.repos.slice(0, 3).map((repo) => repo.n).join(" · ")}</span></div><div className="masters-metrics"><span>{master.repoCount} 个项目</span><span>{formatAgentCount(master.totalStars)} Stars</span>{master.totalInstalls ? <span>{formatAgentCount(master.totalInstalls)} 安装</span> : null}<span>{master.avgQuality} 质量</span></div></li>)}</ol></AgentPageShell>;
}
