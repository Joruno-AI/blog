"use client";

import Link from "next/link";
import { useState } from "react";

import { AgentAvatar } from "@/components/site/agent-avatar";
import { AgentSourceIcon } from "@/components/site/agent-source-icon";
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
        <div className="skm-titles"><Link className="skm-name" href={`/agent/${item.f}/`}>{item.n}</Link><span className="skm-author">{item.a}</span></div>
        <span className="skm-grade">{item.g === "safe" ? "安全" : item.g === "caution" ? "谨慎" : "未评级"}</span>
      </div>
      <p className="skm-desc">{agentDescription(item, enrich)}</p>
      <div className="skm-meta">
        <span title={`${item.s} stars`}><AgentSourceIcon name="i-ri-star-line" />{formatAgentCount(item.s)}</span>
        {enrich?.installs ? <span title={`安装量 ${enrich.installs}`}><AgentSourceIcon name="i-ri-download-2-line" />{formatAgentCount(enrich.installs)}</span> : null}
        <span title={`质量分 ${item.q}`}><AgentSourceIcon name="i-ri-medal-line" />{item.q}</span>
        {metaText ? <span className="skm-extra">{metaText}</span> : null}
      </div>
      <div className="skm-foot">
        {installable ? <button className={`skm-install ${copied ? "is-copied" : ""}`} type="button" onClick={() => void copy()} title="复制安装命令"><code>{command}</code><AgentSourceIcon name={copied ? "i-ri-check-line" : "i-ri-file-copy-line"} /></button> : <Link className="skm-repo" href={`/agent/${item.f}/`}><AgentSourceIcon name="i-ri-book-open-line" />站内阅读</Link>}
        {hasDetail ? <Link className="skm-more" href={`/agent/${item.f}/`}>详情 <AgentSourceIcon name="i-ri-arrow-right-line" /></Link> : null}
      </div>
    </article>
  );
}
