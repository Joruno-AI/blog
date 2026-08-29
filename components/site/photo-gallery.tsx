"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight, Grid2X2, LayoutPanelTop, X } from "lucide-react";
import type { SyntheticEvent } from "react";
import { useEffect, useRef, useState } from "react";

export type GalleryPhoto = {
  id: string;
  title: string;
  description: string | null;
  url: string;
  width: number | null;
  height: number | null;
};

type Layout = "masonry" | "square";

export function PhotoGallery({ photos }: { photos: GalleryPhoto[] }) {
  const [layout, setLayout] = useState<Layout>("masonry");
  const [visibleCount, setVisibleCount] = useState(15);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const loaderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem("photo-layout");
    if (saved === "masonry" || saved === "square") setLayout(saved);
  }, []);

  useEffect(() => {
    const loader = loaderRef.current;
    if (!loader || visibleCount >= photos.length) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisibleCount((count) => Math.min(count + 15, photos.length));
      },
      { rootMargin: "60% 0px" },
    );
    observer.observe(loader);
    return () => observer.disconnect();
  }, [photos.length, visibleCount]);

  useEffect(() => {
    if (activeIndex === null) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveIndex(null);
      if (event.key === "ArrowLeft") setActiveIndex((index) => index === null ? null : (index - 1 + photos.length) % photos.length);
      if (event.key === "ArrowRight") setActiveIndex((index) => index === null ? null : (index + 1) % photos.length);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [activeIndex, photos.length]);

  function switchLayout() {
    const next = layout === "masonry" ? "square" : "masonry";
    setLayout(next);
    window.localStorage.setItem("photo-layout", next);
  }

  function closeViewer(event?: SyntheticEvent) {
    event?.preventDefault();
    event?.stopPropagation();
    setActiveIndex(null);
  }

  const activePhoto = activeIndex === null ? null : photos[activeIndex];

  return (
    <>
      <section className={`photo-gallery photo-gallery--${layout}`} aria-label="照片列表">
        {photos.slice(0, visibleCount).map((photo, index) => {
          const ratio = photo.width && photo.height ? photo.width / photo.height : 4 / 3;
          return (
            <figure className="photo-figure" key={photo.id} style={{ aspectRatio: layout === "square" ? "1" : ratio }}>
              <button onClick={() => setActiveIndex(index)} type="button" aria-label={`查看${photo.title}`}>
                <Image
                  src={photo.url}
                  alt={photo.description || photo.title}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 980px) 50vw, 33vw"
                  priority={index < 6}
                />
                {photo.description || photo.title ? <figcaption>{photo.description || photo.title}</figcaption> : null}
              </button>
            </figure>
          );
        })}
      </section>
      <div className="photo-loader-sentinel" ref={loaderRef} aria-hidden="true" />
      <button
        className="photo-layout-toggle"
        onClick={switchLayout}
        title="Layout toggle"
        type="button"
        aria-label={layout === "masonry" ? "切换为方形网格" : "切换为瀑布流"}
      >
        {layout === "masonry" ? <Grid2X2 aria-hidden="true" /> : <LayoutPanelTop aria-hidden="true" />}
      </button>
      {activePhoto && activeIndex !== null ? (
        <div className="photo-viewer" role="dialog" aria-modal="true" aria-label={activePhoto.title}>
          <button className="photo-viewer__backdrop" onClick={closeViewer} type="button" aria-label="关闭图片预览" />
          <div className="photo-viewer__image">
            <Image src={activePhoto.url} alt={activePhoto.description || activePhoto.title} fill sizes="100vw" priority />
          </div>
          <div className="photo-viewer__caption">
            <strong>{activePhoto.title}</strong>
            {activePhoto.description ? <span>{activePhoto.description}</span> : null}
            <small>{activeIndex + 1} / {photos.length}</small>
          </div>
          <button className="photo-viewer__close" onClick={closeViewer} type="button" aria-label="关闭">
            <X aria-hidden="true" />
          </button>
          {photos.length > 1 ? (
            <>
              <button className="photo-viewer__previous" onClick={() => setActiveIndex((activeIndex - 1 + photos.length) % photos.length)} type="button" aria-label="上一张">
                <ChevronLeft aria-hidden="true" />
              </button>
              <button className="photo-viewer__next" onClick={() => setActiveIndex((activeIndex + 1) % photos.length)} type="button" aria-label="下一张">
                <ChevronRight aria-hidden="true" />
              </button>
            </>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
