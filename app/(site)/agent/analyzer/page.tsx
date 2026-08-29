import { AgentAnalyzerTool } from "@/components/site/agent-analyzer-tool";
import { AgentPageShell } from "@/components/site/agent-page-shell";

export default function Page() {
  return <AgentPageShell active="overview" title="仓库分析器" subtitle="在安装前先检查结构风险、活跃度与文档完整度"><AgentAnalyzerTool /></AgentPageShell>;
}
