import type { Metadata } from "next";

import { AgentAnalyzerTool } from "@/components/site/agent-analyzer-tool";
import { AgentPageShell } from "@/components/site/agent-page-shell";
import { legacyMetadata } from "@/lib/parity/legacy-metadata";

export const metadata: Metadata = legacyMetadata({
  title: "仓库分析器 - Agent 能力目录",
  description: "输入 GitHub 仓库地址，获取结构风险、可维护性与信任分析",
  path: "/agent/analyzer/",
  image: "/og-images/agent/analyzer.png",
});

export default function Page() {
  return <AgentPageShell active="overview" title="仓库分析器" subtitle="在安装前先检查结构风险、活跃度与文档完整度"><AgentAnalyzerTool /></AgentPageShell>;
}
