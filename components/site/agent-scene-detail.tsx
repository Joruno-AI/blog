"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  loadAgentFullIndex,
  loadAgentSelectedIndex,
  selectedAgentSkill,
} from "@/components/site/agent-browser-data";
import { AgentSkillCard } from "@/components/site/agent-skill-card";
import { AgentSourceIcon } from "@/components/site/agent-source-icon";
import type { AgentIndexItem, AgentSkill } from "@/lib/agent/skills";
import type { AgentSceneDetailInitial } from "@/lib/agent/ssr-projections";

export function AgentSceneDetail({ keywords, groupLabel, initial }: { keywords: string[]; groupLabel: string; initial?: AgentSceneDetailInitial }) {
  const [items, setItems] = useState<AgentIndexItem[]>(() => initial?.items ?? []);
  const [enrich, setEnrich] = useState<Map<string, AgentSkill>>(() => new Map(initial?.enrich.map((item) => [item.f, item])));
  const [loading, setLoading] = useState(!initial);
  useEffect(() => {
    let active = true;
    Promise.all([loadAgentFullIndex(), loadAgentSelectedIndex().catch(() => [])])
      .then(([full, selected]) => {
        if (!active) return;
        const byRepository = new Map(full.items.map((item) => [item.f, item]));
        setItems(full.items);
        setEnrich(new Map(selected.flatMap((metadata) => {
          const item = byRepository.get(metadata.f);
          return item ? [[metadata.f, selectedAgentSkill(item, metadata)] as const] : [];
        })));
      })
      .catch(() => undefined)
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const normalizedKeywords = useMemo(() => keywords.map((keyword) => keyword.toLowerCase()), [keywords]);
  const matched = useMemo(() => items
    .filter((item) => {
      const haystack = `${item.n} ${item.d}`.toLowerCase();
      return normalizedKeywords.some((keyword) => haystack.includes(keyword));
    })
    .sort((a, b) => b.s - a.s)
    .slice(0, 30), [items, normalizedKeywords]);
  if (loading) return <div className="agent-loading" role="status"><span><i />正在读取场景项目…</span></div>;
  return <>
    <p className="scene-detail-meta slide-enter"><Link href="/agent/scenes/"><AgentSourceIcon name="i-ri-arrow-left-line" />全部场景</Link><span>·</span><span>{groupLabel}</span><span>·</span><span>按 Star 数展示前 {matched.length} 个匹配项目</span></p>
    <div className="scene-detail-grid slide-enter">{matched.map((item) => { const detail = enrich.get(item.f); return <AgentSkillCard item={item} enrich={detail} hasDetail={Boolean(detail)} key={item.f} />; })}</div>
    {!matched.length ? <p className="scene-detail-empty">该场景暂无匹配项目。</p> : null}
  </>;
}
