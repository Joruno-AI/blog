"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import scenesData from "@/public/agent/scenes.json";
import type { AgentIndexItem } from "@/lib/agent/skills";

function matches(item: AgentIndexItem, keywords: string[]) {
  const haystack = `${item.n} ${item.d}`.toLowerCase();
  return keywords.some((keyword) => haystack.includes(keyword.toLowerCase()));
}

export function AgentScenes({ initialItems }: { initialItems: AgentIndexItem[] }) {
  const [items, setItems] = useState(initialItems);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/agent/full-index.json", { signal: controller.signal }).then((response) => response.json() as Promise<{ items?: AgentIndexItem[] }>).then((payload) => { if (Array.isArray(payload.items)) setItems(payload.items); }).catch(() => undefined);
    return () => controller.abort();
  }, []);
  const counts = useMemo(() => Object.fromEntries(scenesData.scenes.map((scene) => [scene.slug, items.filter((item) => matches(item, scene.keywords)).length])), [items]);
  return <>{scenesData.groups.map((group, groupIndex) => {
    const scenes = scenesData.scenes.filter((scene) => scene.group === group.key);
    return <section className="scene-group" key={group.key}><div className="scene-group-head"><div><span>{String(groupIndex + 1).padStart(2, "0")} / {String(scenesData.groups.length).padStart(2, "0")}</span><h2 className="scene-group-title">{group.label}</h2></div><small>{scenes.length} 个场景</small></div><div className="scene-grid">{scenes.map((scene, index) => <Link className="scene-card" href={`/agent/scenes/${scene.slug}`} key={scene.slug}><span className="scene-card-index">{String(index + 1).padStart(2, "0")}</span><span className="scene-card-title">{scene.title}</span><span className="scene-card-desc">{scene.desc}</span><span className="scene-card-count">{(counts[scene.slug] ?? 0).toLocaleString("zh-CN")} 个项目 ↗</span></Link>)}</div></section>;
  })}</>;
}
