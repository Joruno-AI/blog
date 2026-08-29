import { AgentPageShell } from "@/components/site/agent-page-shell";
import { AgentRepositoryGateway } from "@/components/site/agent-repository-gateway";

export default function Page() {
  return <AgentPageShell active="overview" title="知识库" subtitle="阅读 Agent 仓库文档与源码入口"><AgentRepositoryGateway /></AgentPageShell>;
}
