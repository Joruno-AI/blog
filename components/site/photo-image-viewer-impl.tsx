"use client";

import { useEffect, useRef } from "react";

import type { PhotoImageViewerProps } from "@/components/site/photo-image-viewer";

function lockScroll() {
  const body = document.body;
  const scrollbarWidth = window.innerWidth - body.clientWidth;
  if (scrollbarWidth > 0 && !document.getElementById("bg-rose")) {
    body.style.paddingRight = `${scrollbarWidth}px`;
  }
  body.style.overflow = "hidden";
}

function unlockScroll() {
  document.body.style.removeProperty("overflow");
  document.body.style.removeProperty("padding-right");
}

export function PhotoImageViewer({ containerRef }: PhotoImageViewerProps) {
  const viewerHostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const viewerHost = viewerHostRef.current;
    if (!container || !viewerHost) return;

    let cancelled = false;
    let scrollLocked = false;
    let observer: MutationObserver | null = null;
    let viewer: import("viewerjs").default | null = null;
    let lastViewedImage: HTMLImageElement | null = null;

    void import("viewerjs").then(({ default: Viewer }) => {
      if (cancelled) return;

      const initializeOrUpdate = () => {
        if (viewer) {
          viewer.update();
          return;
        }
        if (!container.querySelector("img")) return;

        viewer = new Viewer(container, {
          button: false,
          navbar: 2,
          title: [
            2,
            (image: HTMLImageElement) => {
              const fileName = image.src.split("/").pop()?.split(/[?#]/)[0];
              return image.alt && image.alt !== fileName ? image.alt : "";
            },
          ],
          toolbar: false,
          container: viewerHost,
          initialCoverage: 1,
          transition: false,
          zIndexInline: 300,
          url: "data-origin",
          filter: (image: HTMLImageElement) =>
            !image.classList.contains("no-zoom")
            && image.parentNode?.nodeName !== "A"
            && image.parentNode?.parentNode?.nodeName !== "A",
          show: () => {
            lockScroll();
            scrollLocked = true;
          },
          viewed: (event: CustomEvent) => {
            const detail = event.detail as { originalImage?: HTMLImageElement };
            lastViewedImage = detail.originalImage ?? null;
          },
          hidden: () => {
            if (scrollLocked) {
              unlockScroll();
              scrollLocked = false;
            }
            if (!lastViewedImage) return;

            const image = lastViewedImage;
            const parent = image.parentNode;
            if (parent?.nodeName === "FIGURE") {
              requestAnimationFrame(() => (parent as HTMLElement).focus());
            }
            requestAnimationFrame(() => image.focus());
            lastViewedImage = null;
          },
        });
      };

      initializeOrUpdate();
      observer = new MutationObserver(initializeOrUpdate);
      observer.observe(container, { childList: true });
    });

    return () => {
      cancelled = true;
      observer?.disconnect();
      viewer?.destroy();
      if (scrollLocked) unlockScroll();
    };
  }, [containerRef]);

  return <div className="photo-image-viewer-host" ref={viewerHostRef} />;
}
