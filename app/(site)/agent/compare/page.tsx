import { AgentCompareTool } from "@/components/site/agent-compare-tool";
import { AgentPageShell } from "@/components/site/agent-page-shell";

type Props = { searchParams: Promise<{ repos?: string }> };
export default async function Page({ searchParams }: Props) {
  const requested = ((await searchParams).repos ?? "").split(",").map((item) => item.trim()).filter(Boolean).slice(0, 3);
  return <AgentPageShell active="overview" title="项目对比" subtitle="从社区信号、活跃度与使用边界中选择更合适的工具"><AgentCompareTool requested={requested} /></AgentPageShell>;
}
