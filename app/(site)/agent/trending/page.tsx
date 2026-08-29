import { AgentPageShell } from "@/components/site/agent-page-shell";
import { AgentSkillCard } from "@/components/site/agent-skill-card";
import { getSelectedAgentSkills } from "@/lib/agent/queries";

export const dynamic = "force-dynamic";
const daysAgo = (iso: string) => { const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000); return days <= 0 ? "今天" : days < 30 ? `${days} 天前` : days < 365 ? `${Math.floor(days / 30)} 个月前` : `${Math.floor(days / 365)} 年前`; };

export default async function Page() {
  const skills = await getSelectedAgentSkills();
  const sections = [
    { title: "最近更新", hint: "按仓库最近提交时间排序", items: skills.filter((skill) => skill.pushedAt).sort((a, b) => String(b.pushedAt).localeCompare(String(a.pushedAt))).slice(0, 18), meta: (skill: typeof skills[number]) => daysAgo(skill.pushedAt!) },
    { title: "新面孔", hint: "按仓库创建时间排序", items: skills.filter((skill) => skill.createdAt).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(0, 18), meta: (skill: typeof skills[number]) => `创建于 ${daysAgo(skill.createdAt!)}` },
    { title: "Star 增速", hint: "与上一次数据快照对比", items: skills.filter((skill) => (skill.starsDelta ?? 0) > 0).sort((a, b) => (b.starsDelta ?? 0) - (a.starsDelta ?? 0)).slice(0, 18), meta: (skill: typeof skills[number]) => `+${skill.starsDelta} stars` },
  ];
  const languages = Object.entries(skills.reduce<Record<string, number>>((result, skill) => { if (skill.language) result[skill.language] = (result[skill.language] ?? 0) + 1; return result; }, {})).sort((a, b) => b[1] - a[1]).slice(0, 12);
  const max = languages[0]?.[1] ?? 1;
  return <AgentPageShell active="trending" title="趋势" subtitle="最近更新、新面孔与 Star 增速">{sections.map((section) => section.items.length ? <section className="trend-section" key={section.title}><div className="trend-section-head"><h2 className="trend-section-title">{section.title}</h2><span className="trend-section-hint">{section.hint}</span></div><div className="trend-grid">{section.items.map((skill) => <AgentSkillCard item={skill} enrich={skill} metaText={section.meta(skill)} key={skill.f} />)}</div></section> : null)}{languages.length ? <section className="trend-section"><div className="trend-section-head"><h2 className="trend-section-title">语言分布</h2><span className="trend-section-hint">精选项目的主要实现语言</span></div><div className="trend-langs">{languages.map(([language, count]) => <div className="trend-lang-row" key={language}><span>{language}</span><span className="trend-lang-bar"><i style={{ width: `${count / max * 100}%` }} /></span><span>{count}</span></div>)}</div></section> : null}</AgentPageShell>;
}
