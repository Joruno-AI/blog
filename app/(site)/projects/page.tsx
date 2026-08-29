import { SectionPage } from "@/components/site/section-page";

export const dynamic = "force-dynamic";

export default function ProjectsPage() {
  return (
    <SectionPage
      kicker="Build Log"
      title="项目"
      description="真实交付的产品、工具和实验。每个项目都会保留判断、过程与结果。"
      types={["project", "tool"]}
      empty="项目条目正在迁入统一资源库。"
    />
  );
}
