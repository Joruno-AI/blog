import type { Metadata } from "next";

import { PageStructuredData } from "@/components/site/page-structured-data";
import { LegacyPageFooter } from "@/components/site/legacy-page-footer";
import { ViewportRevealGuard } from "@/components/site/home-reveal-controller";
import { ProjectDirectory } from "@/components/site/project-directory";
import { legacyMetadata } from "@/lib/parity/legacy-metadata";
import { getPublicContentSnapshot, snapshotPublishedResources } from "@/lib/parity/public-content-snapshot";
import "@/app/projects-streams-parity.css";

const description = "Joruno 的产品实践、开源项目与开发工具作品集。";

export const metadata: Metadata = legacyMetadata({
  title: "项目",
  description,
  path: "/projects/",
  image: "/og-images/projects.png",
});

export const dynamic = "force-static";

export default function ProjectsPage() {
  const resources = snapshotPublishedResources(getPublicContentSnapshot().projects);

  return (
    <>
      <PageStructuredData path="/projects/" title="项目" description={description} />
      <ViewportRevealGuard
        rootSelector=".astro-site"
        targetSelector=".projects-parity-page .project-group.slide-enter, .projects-parity-page + footer.slide-enter, .astro-site > footer.site-footer.slide-enter"
      />
      <div className="projects-parity-page astro-section-index astro-section-projects">
        <header className="prose projects-parity-header">
          <h1>项目</h1>
          <p>做过的产品、开源工具，以及仍在持续打磨的想法</p>
        </header>
        <div className="projects-parity-content">
          <ProjectDirectory resources={resources} />
        </div>
      </div>
      <LegacyPageFooter />
    </>
  );
}
