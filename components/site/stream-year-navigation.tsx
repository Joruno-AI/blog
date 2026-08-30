"use client";

import { useEffect, useRef, useState } from "react";

import { StreamMenuIcon, StreamPanelIcon } from "@/components/site/projects-streams-icons";

function YearLinks({
  years,
  activeYear,
  onNavigate,
}: {
  years: readonly string[];
  activeYear: string;
  onNavigate: (year: string) => void;
}) {
  return (
    <ul>
      {years.map((year) => (
        <li key={year}>
          <a
            href={`#${year}`}
            aria-label={`Scroll to ${year}`}
            aria-current={activeYear === year ? "true" : undefined}
            onClick={(event) => {
              const heading = document.getElementById(year);
              if (!heading) return;
              event.preventDefault();
              onNavigate(year);
              heading.scrollIntoView({
                block: "start",
                behavior: "auto",
              });
              window.history.replaceState(window.history.state, "", `#${encodeURIComponent(year)}`);
            }}
          >
            {year}
          </a>
        </li>
      ))}
    </ul>
  );
}

export function StreamYearNavigation({ years }: { years: readonly string[] }) {
  const [activeYear, setActiveYear] = useState(years[0] ?? "");
  const [panelOpen, setPanelOpen] = useState(false);
  const openButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const headings = years
      .map((year) => document.getElementById(year))
      .filter((heading): heading is HTMLElement => Boolean(heading));
    if (!headings.length || !("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.length) return;
        const latest = entries.reduce((left, right) => right.time > left.time ? right : left);
        const currentIndex = headings.indexOf(latest.target as HTMLElement);
        const target = latest.boundingClientRect.top > window.innerHeight / 4
          ? headings[currentIndex - 1]
          : headings[currentIndex];
        if (target) setActiveYear(target.id);
      },
      { root: null, rootMargin: "0% 0% -75% 0%", threshold: 0 },
    );

    headings.forEach((heading) => observer.observe(heading));
    return () => observer.disconnect();
  }, [years]);

  useEffect(() => {
    if (!panelOpen) return;
    const firstLink = panelRef.current?.querySelector<HTMLAnchorElement>("a[href^='#']");
    firstLink?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setPanelOpen(false);
      openButtonRef.current?.focus();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [panelOpen]);

  const navigate = (year: string) => {
    setActiveYear(year);
    setPanelOpen(false);
  };

  return (
    <>
      <aside
        id="desktop-aside"
        className="streams-toc-desktop"
        data-position="left"
      >
        <button
          type="button"
          aria-label="Table of contents"
          title="Table of contents"
        >
          <StreamMenuIcon />
        </button>
        <nav id="toc-sidebar" aria-label="Table of contents">
          <a href="#skip-toc" className="stream-skip-toc">Skip toc</a>
          <YearLinks years={years} activeYear={activeYear} onNavigate={navigate} />
          <div id="skip-toc" hidden />
        </nav>
      </aside>

      <div id="mobile-control" className="streams-toc-mobile">
        <button
          ref={openButtonRef}
          id="toc-open-button"
          className="floating-tool-button"
          type="button"
          aria-label="展开文章目录"
          title="展开文章目录"
          aria-expanded={panelOpen}
          aria-controls="toc-panel"
          onClick={() => setPanelOpen(true)}
        >
          <StreamPanelIcon />
        </button>
        <button
          className="stream-toc-backdrop"
          type="button"
          aria-label="关闭目录"
          hidden={!panelOpen}
          onClick={() => {
            setPanelOpen(false);
            openButtonRef.current?.focus();
          }}
        />
        <div
          ref={panelRef}
          id="toc-panel"
          className="stream-toc-panel"
          role="dialog"
          aria-modal="true"
          aria-label="Table of Contents"
          hidden={!panelOpen}
          aria-hidden={!panelOpen}
          inert={!panelOpen}
        >
          <div className="stream-toc-panel__title">Table of Contents</div>
          <nav aria-label="Table of contents">
            <YearLinks years={years} activeYear={activeYear} onNavigate={navigate} />
          </nav>
        </div>
      </div>
    </>
  );
}
