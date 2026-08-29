"use client";

import Link from "next/link";
import { ArrowLeft, ExternalLink, Github, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";

import { AgentAvatar } from "@/components/site/agent-avatar";
import { AGENT_CATEGORY_LABELS, formatAgentCount, type AgentIndexItem } from "@/lib/agent/skills";

export function AgentIndexDetail({ repo }: { repo: string }) {
  const [item, setItem] = useState<AgentIndexItem | null | undefined>();
  useEffect(() => {
    const controller = new AbortController();
    fetch("/agent/full-index.json", { signal: controller.signal })
      .then((response) => response.json() as Promise<{ items?: AgentIndexItem[] }>)
      .then((payload) => setItem(payload.items?.find((entry) => entry.f.toLowerCase() === repo.toLowerCase()) ?? null))
      .catch(() => setItem(null));
    return () => controller.abort();
  }, [repo]);
  if (item === undefined) return <main className="agent-knowledge-page"><div className="agent-loading"><span><LoaderCircle />正在读取项目索引…</span></div></main>;
  if (item === null) return <main className="agent-knowledge-page"><div className="agent-empty-readme"><h1>项目未收录</h1><Link href="/agent/all">返回项目库</Link></div></main>;
  return <main className="agent-knowledge-page">
    <header className="agent-knowledge-head"><div className="agent-knowledge-brand"><Link className="agent-back" href="/agent/all" aria-label="返回项目库"><ArrowLeft /></Link><AgentAvatar author={item.a} size={96} /><div><p>{item.a}<i> / </i></p><h1>{item.n}</h1></div><span className="agent-source-state"><i />全量索引</span></div><div className="agent-knowledge-actions"><a href={`https://github.com/${item.f}`} target="_blank" rel="noreferrer"><Github /><span>GitHub</span></a></div></header>
    <section className="agent-index-detail-body"><p className="skills-eyebrow">AGENT PROJECT INDEX</p><h2>{item.n}</h2><p>{item.d || "暂无描述"}</p><div className="agent-skill-summary"><div><span>Stars</span><strong>{formatAgentCount(item.s)}</strong></div><div><span>质量分</span><strong>{item.q}</strong></div><div><span>安全评级</span><strong>{item.g === "safe" ? "通过" : item.g === "caution" ? "谨慎" : "未评级"}</strong></div><div><span>分类</span><strong>{AGENT_CATEGORY_LABELS[item.c] ?? item.c}</strong></div></div><a className="agent-index-github" href={`https://github.com/${item.f}`} target="_blank" rel="noreferrer">在 GitHub 阅读源码与文档 <ExternalLink /></a></section>
  </main>;
}
