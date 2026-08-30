"use client";

import dynamic from "next/dynamic";
import type { RefObject } from "react";

export type PhotoImageViewerProps = {
  containerRef: RefObject<HTMLDivElement | null>;
};

const BrowserPhotoImageViewer = dynamic(
  () => import("@/components/site/photo-image-viewer-impl").then((module) => module.PhotoImageViewer),
  { ssr: false },
);

// Photos are rendered before this browser enhancement loads. ViewerJS remains
// lazy and fully functional without becoming part of the Worker server trace.
export function PhotoImageViewer(props: PhotoImageViewerProps) {
  return <BrowserPhotoImageViewer {...props} />;
}
