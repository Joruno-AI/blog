import type { Metadata } from "next";

import { AgentTrendingIsland } from "@/components/site/agent-aggregate-islands";
import { AgentPageShell } from "@/components/site/agent-page-shell";
import { agentTrendingInitial } from "@/lib/agent/ssr-projections";
import { legacyMetadata } from "@/lib/parity/legacy-metadata";

export const metadata: Metadata = legacyMetadata({ title: "趋势 - Agent 能力目录", description: "Agent Skills 与 MCP 工具趋势：最近更新、新收录与 Star 增速", path: "/agent/trending/", image: "/og-images/agent/trending.png" });

export default function Page() {
  return <AgentPageShell active="trending" title="趋势" subtitle="最近更新、新面孔与 Star 增速"><AgentTrendingIsland initial={agentTrendingInitial()} /></AgentPageShell>;
}
