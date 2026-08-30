"use client";

import { useEffect } from "react";

import type { MarkdownImageViewerProps } from "@/components/site/markdown-image-viewer";

export function MarkdownImageViewer({
  content,
  rootRef,
  selector = "img[data-viewer-image]",
}: MarkdownImageViewerProps) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root || !root.querySelector(selector)) return;

    let disposed = false;
    let viewer: { destroy: () => void } | undefined;
    void import("viewerjs").then(({ default: Viewer }) => {
      if (disposed || !root.isConnected) return;
      viewer = new Viewer(root, {
        button: false,
        container: root,
        filter(image: HTMLImageElement) {
          return !image.classList.contains("no-zoom") && image.closest("a") === null;
        },
        initialCoverage: 1,
        url(image: HTMLImageElement) {
          return image.dataset.original || image.currentSrc || image.src;
        },
        title: false,
        toolbar: false,
        navbar: false,
        transition: false,
      });
    });

    return () => {
      disposed = true;
      viewer?.destroy();
    };
  }, [content, rootRef, selector]);

  return null;
}
