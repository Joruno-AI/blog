"use client";

import { useEffect, useState } from "react";

import { ProjectBookmarkIcon } from "@/components/site/projects-streams-icons";

export type ProjectAnchor = {
  id: string;
  label: string;
};

export function ProjectAnchorNav({ anchors }: { anchors: readonly ProjectAnchor[] }) {
  const [activeId, setActiveId] = useState(anchors[0]?.id ?? "");

  useEffect(() => {
    const headings = anchors
      .map(({ id }) => document.getElementById(id))
      .filter((heading): heading is HTMLElement => Boolean(heading));
    if (!headings.length || !("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (left, right) =>
              Math.abs(left.boundingClientRect.top) - Math.abs(right.boundingClientRect.top),
          );
        const active = visible[0]?.target;
        if (active instanceof HTMLElement) setActiveId(active.id);
      },
      { rootMargin: "-18% 0px -72% 0px", threshold: [0, 1] },
    );

    headings.forEach((heading) => observer.observe(heading));
    return () => observer.disconnect();
  }, [anchors]);

  return (
    <div className="project-anchor-nav">
      <div className="project-anchor-nav__head">
        <ProjectBookmarkIcon />
        <strong>项目分类</strong>
      </div>
      <nav aria-label="项目分类导航">
        {anchors.map(({ id, label }, index) => (
          <a
            href={`#${id}`}
            data-project-anchor={id}
            aria-current={activeId === id ? "location" : undefined}
            key={id}
            onClick={(event) => {
              const heading = document.getElementById(id);
              if (!heading) return;
              event.preventDefault();
              setActiveId(id);
              heading.scrollIntoView({
                block: "start",
                behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
                  ? "auto"
                  : "smooth",
              });
              window.history.replaceState(window.history.state, "", `#${encodeURIComponent(id)}`);
            }}
          >
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{label}</strong>
          </a>
        ))}
      </nav>
    </div>
  );
}
