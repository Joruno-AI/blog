"use client";

import Link from "next/link";
import { BookOpen, Check, Copy, Download, Medal, Star } from "lucide-react";
import { useState } from "react";

import { AgentAvatar } from "@/components/site/agent-avatar";
import {
  INSTALLABLE_AGENT_CATEGORIES,
  agentDescription,
  agentInstallCommand,
  formatAgentCount,
  type AgentIndexItem,
  type AgentSkill,
} from "@/lib/agent/skills";

export function AgentSkillCard({ item, enrich, metaText, hasDetail = true }: {
  item: AgentIndexItem;
  enrich?: AgentSkill;
  metaText?: string;
  hasDetail?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const installable = INSTALLABLE_AGENT_CATEGORIES.has(item.c);
  const command = agentInstallCommand(item.f);
  const copy = async () => {
    await navigator.clipboard.writeText(command);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };
  return (
    <article className="skm-card">
      <div className="skm-head">
        <AgentAvatar className="skm-avatar" author={item.a} size={64} />
        <div className="skm-titles"><Link className="skm-name" href={`/agent/${item.f}`}>{item.n}</Link><span className="skm-author">{item.a}</span></div>
        <span className="skm-grade">{item.g === "safe" ? "安全" : item.g === "caution" ? "谨慎" : "未评级"}</span>
      </div>
      <p className="skm-desc">{agentDescription(item, enrich)}</p>
      <div className="skm-meta">
        <span title={`${item.s} stars`}><Star />{formatAgentCount(item.s)}</span>
        {enrich?.installs ? <span title={`安装量 ${enrich.installs}`}><Download />{formatAgentCount(enrich.installs)}</span> : null}
        <span title={`质量分 ${item.q}`}><Medal />{item.q}</span>
        {metaText ? <span className="skm-extra">{metaText}</span> : null}
      </div>
      <div className="skm-foot">
        {installable ? <button className={`skm-install ${copied ? "is-copied" : ""}`} type="button" onClick={() => void copy()} title="复制安装命令"><code>{command}</code>{copied ? <Check /> : <Copy />}</button> : <Link className="skm-repo" href={`/agent/${item.f}`}><BookOpen />站内阅读</Link>}
        {hasDetail ? <Link className="skm-more" href={`/agent/${item.f}`}>详情 <span aria-hidden="true">→</span></Link> : null}
      </div>
    </article>
  );
}
