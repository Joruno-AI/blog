"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { SiteIcon } from "@/components/site/site-icon";

type CopyStatus = "Copied" | "Copy failed" | null;

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return;
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.append(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    textarea.remove();
    if (!copied) throw new Error("Clipboard access denied");
  }
}

export function ArticleActions({ markdown, url, title }: { markdown: string; url: string; title: string }) {
  const [copyStatus, setCopyStatus] = useState<CopyStatus>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [immersive, setImmersive] = useState(false);
  const [immersiveBusy, setImmersiveBusy] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const feedbackTimerRef = useRef<number | undefined>(undefined);
  const prompt = useMemo(
    () => encodeURIComponent(`请阅读这篇文章并帮我总结要点：《${title}》\n${url}`),
    [title, url],
  );

  useEffect(() => {
    const closeWhenOutside = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("click", closeWhenOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("click", closeWhenOutside);
      document.removeEventListener("keydown", closeOnEscape);
      window.clearTimeout(feedbackTimerRef.current);
      document.documentElement.removeAttribute("data-immersive");
    };
  }, []);

  async function handleCopy() {
    window.clearTimeout(feedbackTimerRef.current);
    try {
      await copyText(markdown);
      setCopyStatus("Copied");
    } catch {
      setCopyStatus("Copy failed");
    }
    feedbackTimerRef.current = window.setTimeout(() => setCopyStatus(null), 1600);
  }

  async function setImmersiveMode(on: boolean, allowMotion: boolean) {
    if (immersiveBusy) return;
    const panelSelector =
      "blog-catalog .category-sidebar, #desktop-aside, .reader-course-panel, .reader-toc-panel, .reader-catalog-desktop, .article-toc-desktop";
    const surfaceSelector =
      "geektime-reader .reader-main, .blog-reader-main > header.prose, .blog-reader-main > article.prose, #main > header.prose, #main > article.prose";
    const visibleElements = (selector: string) =>
      Array.from(document.querySelectorAll<HTMLElement>(selector)).filter(
        (element) => getComputedStyle(element).display !== "none",
      );
    const reduceMotion =
      !allowMotion || window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    for (const element of document.querySelectorAll<HTMLElement>(`${panelSelector}, ${surfaceSelector}`)) {
      element.getAnimations().forEach((animation) => animation.cancel());
    }

    const panels = visibleElements(panelSelector);
    const surfaces = visibleElements(surfaceSelector);
    const surfaceRects = new Map(
      surfaces.map((surface) => [surface, surface.getBoundingClientRect()]),
    );

    setImmersiveBusy(true);
    try {
      if (on && !reduceMotion) {
        const exits = panels.map((panel) => {
          const direction = panel.getBoundingClientRect().left < window.innerWidth / 2 ? -6 : 6;
          return panel.animate(
            [
              { opacity: 1, transform: "translate3d(0, 0, 0)" },
              { opacity: 0, transform: `translate3d(${direction}px, 0, 0)` },
            ],
            {
              duration: 80,
              easing: "cubic-bezier(0.23, 1, 0.32, 1)",
              fill: "forwards",
            },
          );
        });
        await Promise.all(exits.map((animation) => animation.finished.catch(() => undefined)));
      }

      document.documentElement.toggleAttribute("data-immersive", on);
      setImmersive(on);
      panels.forEach((panel) => panel.getAnimations().forEach((animation) => animation.cancel()));

      if (!reduceMotion) {
        surfaceRects.forEach((before, surface) => {
          const after = surface.getBoundingClientRect();
          if (after.width === 0 || before.width === 0) return;
          const offsetX = before.left - after.left;
          const scaleX = before.width / after.width;
          const geometryChanged = Math.abs(offsetX) > 0.5 || Math.abs(1 - scaleX) > 0.005;
          surface.animate(
            geometryChanged
              ? [
                  {
                    opacity: 0.86,
                    transform: `translate3d(${offsetX}px, 0, 0) scaleX(${scaleX})`,
                    transformOrigin: "top left",
                  },
                  {
                    opacity: 1,
                    transform: "translate3d(0, 0, 0) scaleX(1)",
                    transformOrigin: "top left",
                  },
                ]
              : [{ opacity: 0.86 }, { opacity: 1 }],
            { duration: 220, easing: "cubic-bezier(0.23, 1, 0.32, 1)" },
          );
        });

        if (!on) {
          visibleElements(panelSelector).forEach((panel) => {
            const direction = panel.getBoundingClientRect().left < window.innerWidth / 2 ? -6 : 6;
            panel.animate(
              [
                { opacity: 0, transform: `translate3d(${direction}px, 0, 0)` },
                { opacity: 1, transform: "translate3d(0, 0, 0)" },
              ],
              { duration: 180, easing: "cubic-bezier(0.23, 1, 0.32, 1)" },
            );
          });
        }
      }
    } finally {
      setImmersiveBusy(false);
    }
  }

  return (
    <div
      ref={rootRef}
      className="post-actions"
      data-post-actions
      data-markdown={markdown}
      data-url={url}
      data-title={title}
      aria-label="文章操作"
    >
      <button type="button" className="post-action" data-copy-md onClick={handleCopy}>
        <SiteIcon name="file-copy-line" />
        <span>复制</span>
        <span
          className="copy-tooltip"
          data-copy-tooltip
          data-visible={copyStatus ? "" : undefined}
          role="status"
          aria-live="polite"
        >
          {copyStatus}
        </span>
      </button>

      <div className="post-action-menu" data-open-menu data-open={menuOpen ? "" : undefined}>
        <button
          type="button"
          className="post-action"
          aria-haspopup="true"
          aria-expanded={menuOpen}
          data-open-trigger
          onClick={(event) => {
            event.stopPropagation();
            setMenuOpen((open) => !open);
          }}
        >
          <SiteIcon name="robot-2-line" />
          <span>用 AI 打开</span>
          <SiteIcon name="arrow-down-s-line" className="post-action-caret" />
        </button>

        <div className="post-action-dropdown" data-open-dropdown hidden={!menuOpen}>
          <a
            className="post-action-item"
            data-ai="chatgpt"
            href={`https://chatgpt.com/?q=${prompt}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setMenuOpen(false)}
          >
            <SiteIcon name="openai-fill" />
            <span>ChatGPT</span>
            <SiteIcon name="external-link-line" className="post-action-ext" />
          </a>
          <a
            className="post-action-item"
            data-ai="claude"
            href={`https://claude.ai/new?q=${prompt}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setMenuOpen(false)}
          >
            <SiteIcon name="claude-fill" />
            <span>Claude</span>
            <SiteIcon name="external-link-line" className="post-action-ext" />
          </a>
        </div>
      </div>

      <button
        type="button"
        className="post-action post-action-immersive"
        data-immersive-toggle
        aria-pressed={immersive}
        title="切换沉浸阅读（更宽的正文）"
        disabled={immersiveBusy}
        onClick={(event) => void setImmersiveMode(!immersive, event.detail > 0)}
      >
        <SiteIcon name={immersive ? "fullscreen-exit-line" : "fullscreen-line"} />
        <span data-immersive-label>{immersive ? "默认宽度" : "沉浸阅读"}</span>
      </button>
    </div>
  );
}
