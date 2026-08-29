import { ProjectDirectory } from "@/components/site/project-directory";
import { getPublishedResourcesByTypes } from "@/modules/resources/application/queries";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const resources = await getPublishedResourcesByTypes({ types: ["project", "tool"], limit: 100 });

  return (
    <div className="site-shell listing-page astro-section-index astro-section-projects">
      <header className="prose standard-header text-center">
        <h1>项目</h1>
        <p className="subtitle">做过的产品、开源工具，以及仍在持续打磨的想法</p>
      </header>
      <ProjectDirectory resources={resources} />
    </div>
  );
}
