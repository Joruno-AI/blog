import type { Metadata } from "next";

import { AgentMastersIsland } from "@/components/site/agent-aggregate-islands";
import { AgentPageShell } from "@/components/site/agent-page-shell";
import { agentMastersInitial } from "@/lib/agent/ssr-projections";
import { legacyMetadata } from "@/lib/parity/legacy-metadata";

export const metadata: Metadata = legacyMetadata({ title: "创作者 - Agent 能力目录", description: "按作者聚合的 Agent Skills 创作者排行榜", path: "/agent/masters/", image: "/og-images/agent/masters.png" });

export default function Page() {
  return <AgentPageShell active="masters" title="创作者" subtitle="按作者聚合的创作者排行榜 (Top 50)"><AgentMastersIsland initial={agentMastersInitial()} /></AgentPageShell>;
}
