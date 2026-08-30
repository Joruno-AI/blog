"use client";

import { useRef, type MouseEvent, type ReactNode } from "react";

import { MarkdownImageViewer } from "@/components/site/markdown-image-viewer";

async function copyText(text: string) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.append(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) await navigator.clipboard.writeText(text);
}

/**
 * Adds the two browser-only enhancements that Astro attached to rendered
 * Markdown: ViewerJS for article images and Expressive Code's copy action.
 * The actual Markdown tree remains a server-rendered child, so Shiki and the
 * Unified pipeline never enter the browser bundle.
 */
export function AstroMarkdownEnhancer({
  children,
  className,
  revisionKey,
}: {
  children: ReactNode;
  className: string;
  revisionKey: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);

  const handleClick = async (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const button = target.closest<HTMLButtonElement>(".expressive-code .copy button[data-code]");
    if (!button || !rootRef.current?.contains(button)) return;

    try {
      await copyText((button.dataset.code ?? "").replaceAll("\u007f", "\n"));
      const feedback = button.parentElement?.querySelector<HTMLElement>(".feedback");
      if (feedback) {
        feedback.textContent = button.dataset.copied || "Copied!";
        feedback.classList.add("show");
        window.setTimeout(() => feedback.classList.remove("show"), 1200);
      }
    } catch {
      // Keep the code block usable even when clipboard access is unavailable.
    }
  };

  return (
    <div ref={rootRef} className={className} onClick={handleClick}>
      <MarkdownImageViewer content={revisionKey} rootRef={rootRef} selector="img" />
      {children}
    </div>
  );
}
