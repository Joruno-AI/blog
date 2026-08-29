"use client";

import Link from "next/link";
import { ArrowLeft, Check, Copy, ExternalLink, Github, Star, Terminal } from "lucide-react";
import { useMemo, useState } from "react";

import { AgentAvatar } from "@/components/site/agent-avatar";
import { MarkdownContent } from "@/components/site/markdown-content";
import { headingId } from "@/lib/parity/blog-reader";
import { AGENT_CATEGORY_LABELS, INSTALLABLE_AGENT_CATEGORIES, agentInstallCommand, formatAgentCount, type AgentSkill } from "@/lib/agent/skills";

export function AgentKnowledgePage({ skill }: { skill: AgentSkill }) {
  const [copied, setCopied] = useState(false);
  const installable = INSTALLABLE_AGENT_CATEGORIES.has(skill.c);
  const command = installable ? agentInstallCommand(skill.f) : `git clone https://github.com/${skill.f}.git`;
  const headings = useMemo(() => skill.content.split("\n").flatMap((line) => {
    const match = line.match(/^(#{2,3})\s+(.+)$/);
    return match ? [{ depth: match[1].length, label: match[2].replace(/[*_`[\]]/g, ""), id: headingId(match[2]) }] : [];
  }), [skill.content]);
  const copy = async () => {
    await navigator.clipboard.writeText(command);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };
  return <main className="agent-knowledge-page">
    <header className="agent-knowledge-head">
      <div className="agent-knowledge-brand"><Link className="agent-back" href="/agent" aria-label="返回 Agent 目录"><ArrowLeft /></Link><AgentAvatar author={skill.a} size={96} /><div><p>{skill.a}<i> / </i></p><h1>{skill.n}</h1></div><span className="agent-source-state"><i />已同步</span></div>
      <div className="agent-knowledge-actions"><button type="button" onClick={() => void copy()}>{copied ? <Check /> : <Terminal />}<span>{copied ? "已复制" : installable ? "安装" : "克隆"}</span></button><a href={`https://github.com/${skill.f}`} target="_blank" rel="noreferrer" aria-label="在 GitHub 查看"><Github /></a></div>
    </header>
    <div className="agent-reader-shell">
      <aside className="agent-wiki-nav" aria-label="知识库目录">
        <label className="agent-nav-search"><Copy /><input value="README" readOnly aria-label="当前文档" /></label>
        <nav className="agent-nav-section"><strong>文档</strong><a href="#readme">README</a>{headings.slice(0, 8).map((heading) => <a href={`#${heading.id}`} key={`${heading.depth}-${heading.id}`}>{heading.label}</a>)}</nav>
        <div className="agent-nav-repo-card"><span>仓库</span><strong>{skill.f}</strong><small>{skill.descZh || skill.d}</small><div><span><Star /> {formatAgentCount(skill.s)}</span><span>{skill.language || "未知"}</span></div></div>
      </aside>
      <section className="agent-wiki-main" aria-label="知识库正文">
        <div className="agent-skill-summary"><div><span>质量分</span><strong>{skill.q}</strong></div><div><span>安全评级</span><strong>{skill.g === "safe" ? "通过" : skill.g === "caution" ? "谨慎" : "未评级"}</strong></div><div><span>分类</span><strong>{AGENT_CATEGORY_LABELS[skill.c] ?? skill.c}</strong></div><div><span>安装量</span><strong>{skill.installs ? formatAgentCount(skill.installs) : "—"}</strong></div></div>
        <div id="readme">{skill.content ? <MarkdownContent className="agent-wiki-article prose astro-markdown" content={skill.content} /> : <div className="agent-empty-readme"><h2>README 暂未收录</h2><p>可前往 GitHub 阅读仓库文档。</p><a href={`https://github.com/${skill.f}`} target="_blank" rel="noreferrer">GitHub <ExternalLink /></a></div>}</div>
      </section>
      <aside className="agent-page-toc" aria-label="本页目录"><nav><strong>本页章节</strong>{headings.slice(0, 14).map((heading) => <a href={`#${heading.id}`} style={{ paddingLeft: heading.depth === 3 ? ".65rem" : 0 }} key={`${heading.depth}-${heading.id}`}>{heading.label}</a>)}</nav></aside>
    </div>
  </main>;
}
