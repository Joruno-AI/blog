"use client";

import { useEffect, useRef, type MouseEvent, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";

import { ArchifyRuntimeMermaid } from "@/components/site/archify-runtime-mermaid";
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

  useEffect(() => {
    const container = rootRef.current;
    if (!container) return;

    const mounts: Array<{ block: HTMLElement; host: HTMLElement; root: Root }> = [];
    const blocks = new Set<HTMLElement>();
    container.querySelectorAll<HTMLElement>(
      '.expressive-code pre[data-language="mermaid"], pre[data-language="mermaid"], pre > code.language-mermaid',
    ).forEach((marker) => {
      const block = marker.closest<HTMLElement>(".expressive-code")
        ?? marker.closest<HTMLElement>("pre");
      if (!block || blocks.has(block) || block.dataset.archifyHydrated === "true") return;
      const pre = marker.matches("pre") ? marker : marker.closest<HTMLElement>("pre");
      const encoded = block.querySelector<HTMLButtonElement>(".copy button[data-code]")?.dataset.code;
      const source = encoded?.replaceAll("\u007f", "\n")
        ?? pre?.querySelector("code")?.textContent
        ?? pre?.textContent
        ?? "";
      if (!source.trim()) return;

      const title = block.querySelector<HTMLElement>(".header .title")?.textContent?.trim() || "内容关系图";
      const host = document.createElement("div");
      host.className = "blog-archify-host";
      block.before(host);
      block.hidden = true;
      block.dataset.archifyHydrated = "true";
      const root = createRoot(host);
      root.render(<ArchifyRuntimeMermaid source={source} repository="Joruno-AI/blog" title={title} />);
      blocks.add(block);
      mounts.push({ block, host, root });
    });

    return () => {
      mounts.forEach(({ block, host, root }) => {
        root.unmount();
        host.remove();
        block.hidden = false;
        delete block.dataset.archifyHydrated;
      });
    };
  }, [revisionKey]);

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
