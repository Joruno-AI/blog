"use client";

import { useEffect, useMemo, useState } from "react";

import { AgentSkillCard } from "@/components/site/agent-skill-card";
import type { AgentIndexItem, AgentSkill } from "@/lib/agent/skills";

export function AgentSceneDetail({ keywords, selected }: { keywords: string[]; selected: AgentSkill[] }) {
  const [items, setItems] = useState<AgentIndexItem[]>(selected);
  const enrich = useMemo(() => new Map(selected.map((skill) => [skill.f, skill])), [selected]);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/agent/full-index.json", { signal: controller.signal }).then((response) => response.json() as Promise<{ items?: AgentIndexItem[] }>).then((payload) => { if (Array.isArray(payload.items)) setItems(payload.items); }).catch(() => undefined);
    return () => controller.abort();
  }, []);
  const matched = items.filter((item) => keywords.some((keyword) => `${item.n} ${item.d}`.toLowerCase().includes(keyword.toLowerCase()))).sort((a, b) => b.q - a.q || b.s - a.s).slice(0, 96);
  return <><p className="agent-index-note">共匹配 {matched.length.toLocaleString("zh-CN")} 个高相关项目</p><div className="skills-grid">{matched.map((item) => <AgentSkillCard item={item} enrich={enrich.get(item.f)} key={item.f} />)}</div></>;
}
