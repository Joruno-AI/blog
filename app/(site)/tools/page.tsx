import { SectionPage } from "@/components/site/section-page";

export const dynamic = "force-dynamic";

export default function ToolsPage() {
  return (
    <SectionPage
      kicker="Useful Software"
      title="工具"
      description="把反复出现的问题做成可以直接使用的软件与工作流。"
      types={["tool"]}
      empty="工具正在制作中。"
    />
  );
}
