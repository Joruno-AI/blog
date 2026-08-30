import type { Metadata } from "next";

import { AgentCatalogIsland } from "@/components/site/agent-aggregate-islands";
import { AgentPageShell } from "@/components/site/agent-page-shell";
import { agentCatalogInitial } from "@/lib/agent/ssr-projections";
import { legacyMetadata } from "@/lib/parity/legacy-metadata";

export const metadata: Metadata = legacyMetadata({
  title: "Agent 项目库",
  description: "浏览全部收录的 Agent Skills、MCP Servers 与工具，支持搜索、筛选、比较和站内阅读",
  path: "/agent/all/",
  image: "/og-images/agent/all.png",
});

export default function Page() {
  return <AgentPageShell active="all" title="Agent 项目库" subtitle="28,868 个开源项目，可搜索、筛选与站内比较"><AgentCatalogIsland projection={agentCatalogInitial()} /></AgentPageShell>;
}
