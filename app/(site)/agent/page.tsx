import type { Metadata } from "next";

import { AgentOverview } from "@/components/site/agent-overview";
import { AgentPageShell } from "@/components/site/agent-page-shell";
import { getSelectedAgentSkills } from "@/lib/agent/queries";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Agent 工具精选", description: "精选 Claude Skills、Codex Skills、MCP Servers 与 Agent 工具" };

export default async function AgentPage() {
  const selected = await getSelectedAgentSkills();
  return <AgentPageShell active="overview" title="Agent 工具精选" subtitle="从真实工作流出发，发现值得使用的 Skills、MCP 与 Agent 工具"><AgentOverview selected={selected} /></AgentPageShell>;
}
