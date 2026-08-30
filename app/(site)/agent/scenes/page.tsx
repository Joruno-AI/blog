import type { Metadata } from "next";

import { AgentScenesIsland } from "@/components/site/agent-aggregate-islands";
import { AgentPageShell } from "@/components/site/agent-page-shell";
import { agentSceneCountsInitial } from "@/lib/agent/ssr-projections";
import { legacyMetadata } from "@/lib/parity/legacy-metadata";

export const metadata: Metadata = legacyMetadata({
  title: "场景导航 - Agent 能力目录",
  description: "按使用场景浏览 Agent Skills 与 MCP 工具：数据库、浏览器自动化、内容创作等",
  path: "/agent/scenes/",
  image: "/og-images/agent/scenes.png",
});

export default function Page() {
  return <AgentPageShell active="scenes" title="场景导航" subtitle="56 个场景，按需找到合适的工具"><AgentScenesIsland initialCounts={agentSceneCountsInitial()} /></AgentPageShell>;
}
