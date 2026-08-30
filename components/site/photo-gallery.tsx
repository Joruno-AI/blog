"use client";

import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  calculateMasonryLayout,
  PHOTO_LAYOUT_STORAGE_KEY,
  type MasonryStrategy,
  type PhotoItem,
  type PhotoLayout,
} from "@/lib/parity/photos";
import { PhotoImageViewer } from "@/components/site/photo-image-viewer";

type PhotoGalleryProps = {
  hash: string;
  gap?: number;
  minPhotoWidth?: number;
  maxPhotoWidth?: number;
  batchSize?: number;
  layout?: PhotoLayout;
  masonryStrategy?: MasonryStrategy;
};

type PhotoFigureStyle = CSSProperties & {
  "--photo-top"?: string;
  "--photo-left"?: string;
  "--photo-width"?: string;
  "--photo-height"?: string;
  "--photo-placeholder": string;
};

function PhotoLayoutIcon({ type }: { type: PhotoLayout }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        fill="currentColor"
        d={type === "masonry"
          ? "M22 20a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h18a1 1 0 0 1 1 1zm-11-5H4v4h7zm9-4h-7v8h7zm-9-6H4v8h7zm9 0h-7v4h7z"
          : "M4 10h4v4H4zm0 9v-3h4v3zm6 0v-3h4v3zm6 0v-3h4v3zm0-5v-4h4v4zm0-6V5h4v3zm-2-3v3h-4V5zm0 5v4h-4v-4zM4 8V5h4v3zM3 3a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1z"}
      />
    </svg>
  );
}

function readStoredLayout() {
  try {
    const value = window.localStorage.getItem(PHOTO_LAYOUT_STORAGE_KEY);
    return value === "masonry" || value === "square" ? value : null;
  } catch {
    return null;
  }
}

function storeLayout(layout: PhotoLayout) {
  try {
    window.localStorage.setItem(PHOTO_LAYOUT_STORAGE_KEY, layout);
  } catch {
    // Storage can be disabled by browser privacy settings. The in-memory
    // selection still works for the current page, so persistence is optional.
  }
}

export function PhotoGallery({
  hash,
  gap = 16,
  minPhotoWidth = 240,
  maxPhotoWidth = 1000,
  batchSize = 15,
  layout: initialLayout = "masonry",
  masonryStrategy = "sequential",
}: PhotoGalleryProps) {
  const rootRef = useRef<HTMLElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const visibleCountRef = useRef(0);
  const itemCountRef = useRef(0);
  const loadingBatchRef = useRef(false);

  const [items, setItems] = useState<PhotoItem[]>([]);
  const [layout, setLayout] = useState<PhotoLayout>(initialLayout);
  const [visibleCount, setVisibleCount] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const [isFetching, setIsFetching] = useState(true);
  const [fetchFailed, setFetchFailed] = useState(false);

  visibleCountRef.current = visibleCount;
  itemCountRef.current = items.length;

  useEffect(() => {
    const storedLayout = readStoredLayout();
    if (storedLayout) {
      setLayout(storedLayout);
    } else {
      storeLayout(initialLayout);
    }
  }, [initialLayout]);

  useEffect(() => {
    const controller = new AbortController();
    setIsFetching(true);
    setFetchFailed(false);

    void fetch(`/photos/photos.${hash}.json`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Photo endpoint returned HTTP ${response.status}`);
        return response.json() as Promise<[string, PhotoItem[]]>;
      })
      .then(([version, data]) => {
        if (version !== hash || !Array.isArray(data)) throw new Error("Invalid photo endpoint payload");
        setItems(data);
        const initialCount = Math.min(batchSize, data.length);
        visibleCountRef.current = initialCount;
        itemCountRef.current = data.length;
        setVisibleCount(initialCount);
        setIsFetching(false);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        console.error(error);
        setFetchFailed(true);
        setIsFetching(false);
      });

    return () => controller.abort();
  }, [batchSize, hash]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    let timeout: ReturnType<typeof setTimeout> | null = null;
    const measure = () => setContainerWidth(root.offsetWidth);
    measure();

    const observer = new ResizeObserver(() => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(measure, 100);
    });
    observer.observe(root);

    return () => {
      observer.disconnect();
      if (timeout) clearTimeout(timeout);
    };
  }, []);

  const loadNextBatchIfNeeded = useCallback(() => {
    if (loadingBatchRef.current || visibleCountRef.current >= itemCountRef.current) return;

    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const isNearBottom =
      document.documentElement.scrollHeight - (scrollTop + window.innerHeight)
      <= window.innerHeight * 0.6;
    if (!isNearBottom) return;

    loadingBatchRef.current = true;
    const nextCount = Math.min(visibleCountRef.current + batchSize, itemCountRef.current);
    visibleCountRef.current = nextCount;
    setVisibleCount(nextCount);
    loadingBatchRef.current = false;
  }, [batchSize]);

  useEffect(() => {
    const onScroll = () => {
      if (animationFrameRef.current !== null) return;
      animationFrameRef.current = requestAnimationFrame(() => {
        loadNextBatchIfNeeded();
        animationFrameRef.current = null;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    if (items.length) onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    };
  }, [items.length, loadNextBatchIfNeeded]);

  const visibleItems = useMemo(() => items.slice(0, visibleCount), [items, visibleCount]);
  const masonry = useMemo(
    () => containerWidth > 0
      ? calculateMasonryLayout(visibleItems, containerWidth, {
          gap,
          minPhotoWidth,
          maxPhotoWidth,
          strategy: masonryStrategy,
        })
      : { columns: 1, columnWidth: 0, height: 0, positions: [] },
    [containerWidth, gap, masonryStrategy, maxPhotoWidth, minPhotoWidth, visibleItems]
  );

  const toggleLayout = () => {
    const nextLayout = layout === "masonry" ? "square" : "masonry";
    const initialCount = Math.min(batchSize, items.length);
    setLayout(nextLayout);
    visibleCountRef.current = initialCount;
    setVisibleCount(initialCount);
    storeLayout(nextLayout);
  };

  const openFocusedImage = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.defaultPrevented || event.key !== "Enter") return;
    event.preventDefault();
    event.currentTarget.querySelector("img")?.click();
  };

  return (
    <div className="astro-photo-view-shell">
      <section
        aria-busy={isFetching}
        aria-label="Photo gallery"
        className="photo-view"
        data-batch-size={batchSize}
        data-gap={gap}
        data-hash={hash}
        data-layout={layout}
        data-masonry-strategy={layout === "masonry" ? masonryStrategy : undefined}
        data-max-photo-width={maxPhotoWidth}
        data-min-photo-width={minPhotoWidth}
        ref={rootRef}
        style={layout === "masonry" ? { height: `${masonry.height}px` } : undefined}
      >
        <div
          className="photo-container"
          ref={containerRef}
          style={layout === "square"
            ? {
                "--min-photo-width": `${minPhotoWidth}px`,
                "--photo-gap": `${gap}px`,
              } as CSSProperties
            : undefined}
        >
          {visibleItems.map((item, index) => {
            const position = masonry.positions[index];
            const style: PhotoFigureStyle = {
              "--photo-placeholder": `url(${item.placeholder})`,
            };
            if (layout === "masonry" && position) {
              style["--photo-top"] = `${position.top}px`;
              style["--photo-left"] = `${position.left}px`;
              style["--photo-width"] = `${position.width}px`;
              style["--photo-height"] = `${position.height}px`;
            }

            return (
              <figure
                aria-label="Open viewer"
                className="photo-figure"
                data-aspect-ratio={item.aspectRatio}
                data-photo-index={index}
                key={item.uuid}
                onKeyDown={openFocusedImage}
                role="button"
                style={style}
                tabIndex={0}
              >
                {/* The Astro gallery needs the native image load event and
                    masonry dimensions without Next Image wrapper markup. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt={item.desc}
                  data-origin={item.src}
                  onLoad={(event) => event.currentTarget.style.setProperty("--photo-opacity", "1")}
                  src={item.thumbnail}
                />
                {item.desc ? <figcaption aria-hidden="true">{item.desc}</figcaption> : null}
              </figure>
            );
          })}
        </div>
        <button
          aria-label="Layout toggle"
          className="photo-layout-toggle"
          onClick={toggleLayout}
          title="Layout toggle"
          type="button"
        >
          <span className="icon-masonry"><PhotoLayoutIcon type="masonry" /></span>
          <span className="icon-grid"><PhotoLayoutIcon type="square" /></span>
        </button>
      </section>

      {isFetching ? (
        <div aria-label="Loading photos" className="photo-loader" role="status">
          <i /><i /><i />
        </div>
      ) : null}
      {fetchFailed ? <p className="photo-load-error" role="alert">Unable to load photos.</p> : null}
      <PhotoImageViewer containerRef={containerRef} />
    </div>
  );
}
