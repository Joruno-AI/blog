import type { Metadata } from "next";

import { AgentCompareFromQuery } from "@/components/site/agent-aggregate-islands";
import { AgentPageShell } from "@/components/site/agent-page-shell";
import { legacyMetadata } from "@/lib/parity/legacy-metadata";

export const metadata: Metadata = legacyMetadata({
  title: "项目对比 - Agent 能力目录",
  description: "将 2–3 个 Agent 项目的社区热度、活跃度、许可证与技术栈放在一个页面中比较",
  path: "/agent/compare/",
  image: "/og-images/agent/compare.png",
});

export default function Page() {
  return <AgentPageShell active="overview" title="项目对比" subtitle="从社区信号、活跃度与使用边界中选择更合适的工具"><AgentCompareFromQuery /></AgentPageShell>;
}
