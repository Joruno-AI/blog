import type { Metadata } from "next";

import { AgentAbout } from "@/components/site/agent-about";
import { AgentPageShell } from "@/components/site/agent-page-shell";
import { legacyMetadata } from "@/lib/parity/legacy-metadata";

export const metadata: Metadata = legacyMetadata({
  title: "方法论 - Agent 能力目录",
  description: "Agent 能力目录的数据来源、质量分、安全等级、更新管道与局限",
  path: "/agent/about/",
  image: "/og-images/agent/about.png",
});

export default function Page() {
  return <AgentPageShell active="overview" title="方法与边界" subtitle="数据从哪里来、分数怎么看、哪些结论仍需你亲自判断"><AgentAbout /></AgentPageShell>;
}
