import { AgentAbout } from "@/components/site/agent-about";
import { AgentPageShell } from "@/components/site/agent-page-shell";

export default function Page() {
  return <AgentPageShell active="overview" title="方法与边界" subtitle="数据从哪里来、分数怎么看、哪些结论仍需你亲自判断"><AgentAbout /></AgentPageShell>;
}
