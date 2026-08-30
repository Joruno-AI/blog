"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

import { AgentKnowledgeReader } from "@/components/site/agent-knowledge-reader";

function AgentIndexLoading({ label = "正在读取 Agent 索引…" }: { label?: string }) {
  return <div className="agent-loading" role="status"><span><i />{label}</span></div>;
}

export const AgentOverviewIsland = dynamic(
  () => import("@/components/site/agent-overview").then((module) => module.AgentOverview),
  { loading: () => <AgentIndexLoading /> },
);

export const AgentCatalogIsland = dynamic(
  () => import("@/components/site/agent-catalog").then((module) => module.AgentCatalog),
  { loading: () => <AgentIndexLoading label="正在读取项目库…" /> },
);

export const AgentScenesIsland = dynamic(
  () => import("@/components/site/agent-scenes").then((module) => module.AgentScenes),
  { loading: () => <AgentIndexLoading label="正在读取场景索引…" /> },
);

export const AgentSceneDetailIsland = dynamic(
  () => import("@/components/site/agent-scene-detail").then((module) => module.AgentSceneDetail),
  { loading: () => <AgentIndexLoading label="正在读取场景项目…" /> },
);

export const AgentTrendingIsland = dynamic(
  () => import("@/components/site/agent-trending").then((module) => module.AgentTrending),
  { loading: () => <AgentIndexLoading label="正在读取趋势索引…" /> },
);

export const AgentMastersIsland = dynamic(
  () => import("@/components/site/agent-masters").then((module) => module.AgentMasters),
  { loading: () => <AgentIndexLoading label="正在读取创作者索引…" /> },
);

const BrowserAgentCompareTool = dynamic(
  () => import("@/components/site/agent-compare-tool").then((module) => module.AgentCompareTool),
  { loading: () => <AgentIndexLoading label="正在读取对比工具…" /> },
);

export function AgentCompareFromQuery() {
  const [requested, setRequested] = useState<string[]>([]);
  useEffect(() => {
    setRequested((new URL(window.location.href).searchParams.get("repos") ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 3));
  }, []);
  return <BrowserAgentCompareTool requested={requested} />;
}

export function AgentRepositoryFromQuery() {
  const [repo, setRepo] = useState<string>();
  useEffect(() => {
    setRepo(new URL(window.location.href).searchParams.get("repo") || undefined);
  }, []);
  return <AgentKnowledgeReader repo={repo} />;
}
