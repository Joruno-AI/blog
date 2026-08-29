import { SectionPage } from "@/components/site/section-page";

export const dynamic = "force-dynamic";

export default function ProjectsPage() {
  return (
    <SectionPage
      kicker="Build Log"
      title="项目"
      description="做过的产品、开源工具，以及仍在持续打磨的想法"
      types={["project", "tool"]}
      empty="No content available for display."
    />
  );
}
