import type { CSSProperties } from "react";

import { ProjectAnchorNav } from "@/components/site/project-anchor-nav";
import { ProjectGlyph } from "@/components/site/projects-streams-icons";
import {
  groupAstroProjects,
  projectAnchorId,
  projectLinkKind,
  restoreAstroProjects,
} from "@/lib/parity/projects-streams";
import type { PublishedResource } from "@/modules/resources/infrastructure/resource-repository";

export function ProjectDirectory({ resources }: { resources: PublishedResource[] }) {
  const groups = groupAstroProjects(restoreAstroProjects(resources));
  const anchors = groups.map(({ category }) => ({
    id: projectAnchorId(category),
    label: category,
  }));

  return (
    <div className="project-directory-layout has-anchor-nav">
      <ProjectAnchorNav anchors={anchors} />
      <div className="project-directory-groups">
        {groups.map(({ category, items }, sectionIndex) => (
          <div
            className="project-group slide-enter"
            style={{ "--enter-stage": sectionIndex } as CSSProperties}
            key={category}
          >
            <div
              className="toc-heading project-section-heading"
              id={projectAnchorId(category)}
            >
              <span className="project-section-label">
                <strong>{category}</strong>
                <i aria-hidden="true" />
              </span>
            </div>
            <div className="project-items-grid">
              {items.map((item) => (
                <a
                  className="project-item-link"
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`${item.id} - ${item.desc}`}
                  aria-label={`${item.id} - ${item.desc}`}
                  key={item.id}
                >
                  <ProjectGlyph name={item.icon} />
                  <span className="project-item-body">
                    <span className="project-item-head">
                      <span className="project-item-title">{item.id}</span>
                      <span className="project-item-kind">{projectLinkKind(item.link)}</span>
                    </span>
                    <span className="project-item-desc">{` ${item.desc}`}</span>
                  </span>
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
