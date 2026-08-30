"use client";

import { PanelRightOpen } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import { SiteIcon } from "@/components/site/site-icon";
import type { ArticleHeading } from "@/lib/parity/blog-reader";

type TocNode = ArticleHeading & { children: TocNode[] };

function buildTocTree(headings: ArticleHeading[]) {
  const roots: TocNode[] = [];
  for (const heading of headings) {
    const node: TocNode = { ...heading, children: [] };
    if (heading.depth === 3 && roots.length) roots.at(-1)?.children.push(node);
    else roots.push(node);
  }
  return roots;
}

function TocTree({
  nodes,
  activeId,
  onNavigate,
}: {
  nodes: TocNode[];
  activeId: string | null;
  onNavigate?: () => void;
}) {
  return (
    <ul>
      {nodes.map((heading, index) => (
        <li key={`${heading.id}-${index}`}>
          <a
            href={`#${heading.id}`}
            aria-label={`Scroll to ${heading.text}`}
            aria-current={activeId === heading.id ? "true" : undefined}
            onClick={onNavigate}
          >
            {heading.text}
          </a>
          {heading.children.length ? (
            <TocTree nodes={heading.children} activeId={activeId} onNavigate={onNavigate} />
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export function BlogArticleToc({
  headings,
  desktopPosition = "right",
  context = "blog",
  desktopAfter,
}: {
  headings: ArticleHeading[];
  desktopPosition?: "left" | "right";
  context?: string | null;
  desktopAfter?: ReactNode;
}) {
  const headingKey = useMemo(
    () => headings.map((heading) => `${heading.depth}:${heading.id}`).join("\u0000"),
    [headings],
  );
  const tree = useMemo(() => buildTocTree(headings), [headings]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const desktopListRef = useRef<HTMLElement>(null);
  const mobilePanelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const elements = headings
      .map((heading) => document.getElementById(heading.id))
      .filter((element): element is HTMLElement => Boolean(element));
    if (!elements.length) return;

    const observer = new IntersectionObserver((entries) => {
      const latest = entries.reduce(
        (current, entry) => (entry.time > current.time ? entry : current),
        entries[0],
      );
      const index = elements.indexOf(latest.target as HTMLElement);
      const targetIndex = latest.boundingClientRect.top > window.innerHeight / 4 ? index - 1 : index;
      const target = targetIndex >= 0 ? elements[targetIndex] : null;
      setActiveId(target?.id ?? null);
    }, { root: null, rootMargin: "0% 0% -75% 0%", threshold: 0 });

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
    // headingKey tracks the serializable heading identity without re-running on an equivalent array.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headingKey]);

  useEffect(() => {
    if (!activeId) return;
    const escaped = CSS.escape(activeId);
    for (const container of [desktopListRef.current, mobilePanelRef.current]) {
      const link = container?.querySelector<HTMLElement>(`a[href="#${escaped}"]`);
      if (!container || !link || link.getClientRects().length === 0) continue;
      const linkRect = link.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const targetTop = container.scrollTop + linkRect.top - containerRect.top
        - (container.clientHeight - linkRect.height) / 2;
      container.scrollTo({ top: Math.max(0, targetTop), behavior: "smooth" });
    }
  }, [activeId]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setOpen(false);
      window.setTimeout(() => triggerRef.current?.focus(), 0);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  function close(restoreFocus = false) {
    setOpen(false);
    if (restoreFocus) window.setTimeout(() => triggerRef.current?.focus(), 0);
  }

  return (
    <>
      <aside
        id="desktop-aside"
        className="article-toc article-toc-desktop"
        aria-label="文章目录"
        data-context={context}
        data-position={desktopPosition}
      >
        <button type="button" className="article-toc-heading" aria-label="Table of contents" title="Table of contents">
          <SiteIcon name="menu-2-fill" />
        </button>
        <div className="article-toc-controller">
          <nav ref={desktopListRef} className="article-toc-nav" aria-label="Table of contents">
            <a className="article-toc-skip" href="#skip-toc">Skip toc</a>
            <TocTree nodes={tree} activeId={activeId} />
            <span id="skip-toc" hidden />
          </nav>
        </div>
      </aside>

      {desktopAfter}

      <button
        ref={triggerRef}
        id="toc-open-button"
        type="button"
        className="blog-toc-trigger floating-tool-button"
        aria-label="展开文章目录"
        title="展开文章目录"
        aria-expanded={open}
        aria-controls="blog-mobile-toc"
        onClick={() => setOpen(true)}
      >
        <PanelRightOpen aria-hidden="true" />
      </button>

      <div
        ref={drawerRef}
        className={`blog-toc-drawer${open ? " open" : ""}`}
        aria-hidden={!open}
        inert={!open}
      >
        <button type="button" className="blog-toc-overlay" aria-label="关闭文章目录" onClick={() => close(true)} />
        <nav
          ref={mobilePanelRef}
          id="blog-mobile-toc"
          className="blog-toc-panel"
          role="dialog"
          aria-modal="true"
          aria-label="文章目录"
        >
          <div className="blog-toc-panel-title">Table of Contents</div>
          <TocTree nodes={tree} activeId={activeId} onNavigate={() => close()} />
        </nav>
      </div>
    </>
  );
}
