"use client";

import dynamic from "next/dynamic";
import type { RefObject } from "react";

export type MarkdownImageViewerProps = {
  content: string;
  rootRef: RefObject<HTMLDivElement | null>;
  selector?: string;
};

const BrowserMarkdownImageViewer = dynamic(
  () => import("@/components/site/markdown-image-viewer-impl").then((module) => module.MarkdownImageViewer),
  { ssr: false },
);

// ViewerJS only enhances the already server-rendered Markdown DOM. Keeping the
// enhancer behind a no-SSR boundary preserves the article markup while moving
// the browser-only viewer implementation out of the Worker handler.
export function MarkdownImageViewer(props: MarkdownImageViewerProps) {
  return <BrowserMarkdownImageViewer {...props} />;
}
