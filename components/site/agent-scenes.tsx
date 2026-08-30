"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { loadAgentFullIndex } from "@/components/site/agent-browser-data";
import { AgentSourceIcon } from "@/components/site/agent-source-icon";
import scenesData from "@/lib/parity/data/agent-scenes.json";
import type { AgentIndexItem } from "@/lib/agent/skills";

const sceneMatchers = scenesData.scenes.map((scene) => ({
  slug: scene.slug,
  keywords: scene.keywords.map((keyword) => keyword.toLowerCase()),
}));

export function AgentScenes({ initialCounts = {} }: { initialCounts?: Record<string, number> }) {
  const [items, setItems] = useState<AgentIndexItem[]>([]);
  useEffect(() => {
    let active = true;
    loadAgentFullIndex().then((payload) => { if (active) setItems(payload.items); }).catch(() => undefined);
    return () => { active = false; };
  }, []);
  const counts = useMemo(() => {
    if (!items.length) return initialCounts;
    const result = Object.fromEntries(sceneMatchers.map((scene) => [scene.slug, 0])) as Record<string, number>;
    for (const item of items) {
      const haystack = `${item.n} ${item.d}`.toLowerCase();
      for (const scene of sceneMatchers) {
        if (scene.keywords.some((keyword) => haystack.includes(keyword))) result[scene.slug] += 1;
      }
    }
    return result;
  }, [initialCounts, items]);
  return <>{scenesData.groups.map((group, groupIndex) => {
    const scenes = scenesData.scenes.filter((scene) => scene.group === group.key);
    return <section className="scene-group slide-enter" style={{ "--enter-stage": groupIndex } as React.CSSProperties} key={group.key}><div className="scene-group-head"><div><span>{String(groupIndex + 1).padStart(2, "0")} / {String(scenesData.groups.length).padStart(2, "0")}</span><h2 className="scene-group-title">{group.label}</h2></div><small>{scenes.length} 个场景</small></div><div className="scene-grid">{scenes.map((scene, index) => <Link className="scene-card" href={`/agent/scenes/${scene.slug}`} key={scene.slug}><span className="scene-card-index">{String(index + 1).padStart(2, "0")}</span><span className="scene-card-title">{scene.title}</span><span className="scene-card-desc">{scene.desc}</span><span className="scene-card-count">{`${(counts[scene.slug] ?? 0).toLocaleString("zh-CN")} 个项目`}<AgentSourceIcon name="i-ri-arrow-right-up-line" /></span></Link>)}</div></section>;
  })}</>;
}
