import type { Metadata } from "next";

import { AgentOverviewIsland } from "@/components/site/agent-aggregate-islands";
import { AgentPageShell } from "@/components/site/agent-page-shell";
import { agentOverviewInitial } from "@/lib/agent/ssr-projections";
import { legacyMetadata } from "@/lib/parity/legacy-metadata";

export const metadata: Metadata = legacyMetadata({
  title: "Agent 工具精选",
  description: "精选 Claude Skills、Codex Skills、MCP Servers 与 Agent 工具，按使用场景理解能力边界与适用方式",
  path: "/agent/",
  image: "/og-images/agent.png",
});

export default function AgentPage() {
  return <AgentPageShell active="overview" title="Agent 工具精选" subtitle="从真实工作流出发，发现值得使用的 Skills、MCP 与 Agent 工具"><AgentOverviewIsland initial={agentOverviewInitial()} /></AgentPageShell>;
}
