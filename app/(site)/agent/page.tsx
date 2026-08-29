import { SectionPage } from "@/components/site/section-page";

export const dynamic = "force-dynamic";

export default function AgentPage() {
  return (
    <SectionPage
      kicker="AI Workspace"
      title="Agent"
      description="围绕内容、研究与产品交付构建的智能工作流和可调用工具。"
      types={["tool", "collection"]}
      empty="Agent 工作流正在内测。"
    />
  );
}
