"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef } from "react";

import { galleryCover, type PublicMusicAlbum } from "@/lib/parity/music";

type AlbumGalleryProps = {
  activeAlbumId: string | null;
  albums: PublicMusicAlbum[];
  visible: boolean;
  onOpen: (album: PublicMusicAlbum, sourceRect: DOMRect) => void;
};

export function MusicAlbumGallery({ activeAlbumId, albums, visible, onOpen }: AlbumGalleryProps) {
  const rootRef = useRef<HTMLElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const bandRef = useRef<HTMLDivElement>(null);
  const onOpenRef = useRef(onOpen);
  onOpenRef.current = onOpen;

  useEffect(() => {
    const root = rootRef.current;
    const viewport = viewportRef.current;
    const band = bandRef.current;
    if (!root || !viewport || !band || !albums.length) return;

    let cycleWidth = 0;
    let offset = 0;
    let velocity = 0;
    let dragging = false;
    let lastX = 0;
    let dragTravel = 0;
    let pressedCell: HTMLElement | null = null;
    let lastInteraction = performance.now();
    let frame = 0;
    let lastFrame = 0;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const measure = () => {
      const firstCopy = band.querySelector<HTMLElement>('.corridor-cell[data-copy="0"]');
      const middleCopy = band.querySelector<HTMLElement>('.corridor-cell[data-copy="1"]');
      cycleWidth = firstCopy && middleCopy
        ? middleCopy.offsetLeft - firstCopy.offsetLeft
        : band.scrollWidth / 3;
      if (cycleWidth) offset = ((offset % cycleWidth) + cycleWidth) % cycleWidth;
    };

    const tick = (time: number) => {
      frame = requestAnimationFrame(tick);
      if (!visible || document.hidden || !cycleWidth) return;
      const interval = window.innerWidth <= 767 ? 1000 / 24 : 1000 / 30;
      if (lastFrame && time - lastFrame < interval) return;
      const scale = Math.min(2.5, (lastFrame ? time - lastFrame : interval) / (1000 / 60));
      lastFrame = time;
      if (!dragging) {
        offset += velocity * scale;
        velocity *= Math.pow(0.94, scale);
        if (Math.abs(velocity) < 0.02) velocity = 0;
        if (!reduceMotion.matches && velocity === 0 && performance.now() - lastInteraction > 3000) {
          offset += 0.3 * scale;
        }
      }
      offset = ((offset % cycleWidth) + cycleWidth) % cycleWidth;
      band.style.transform = `translate3d(${-(cycleWidth + offset)}px, 0, 0)`;
    };

    const openPressedCell = (cell: HTMLElement | null) => {
      if (!cell) return;
      const album = albums.find((item) => item.id === cell.dataset.albumId);
      if (!album) return;
      const cover = cell.querySelector<HTMLElement>(".cell-cover") ?? cell;
      onOpenRef.current(album, cover.getBoundingClientRect());
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      dragging = true;
      dragTravel = 0;
      pressedCell = (event.target as Element | null)?.closest<HTMLElement>(".corridor-cell") ?? null;
      lastX = event.clientX;
      velocity = 0;
      lastInteraction = performance.now();
      viewport.classList.add("dragging");
      viewport.setPointerCapture(event.pointerId);
    };
    const onPointerMove = (event: PointerEvent) => {
      if (!dragging) return;
      const difference = event.clientX - lastX;
      lastX = event.clientX;
      dragTravel += Math.abs(difference);
      offset -= difference;
      velocity = -difference;
      lastInteraction = performance.now();
    };
    const finishPointer = (event: PointerEvent, activate: boolean) => {
      const cell = pressedCell;
      const shouldOpen = activate && dragTravel <= 6;
      dragging = false;
      pressedCell = null;
      viewport.classList.remove("dragging");
      if (viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId);
      if (shouldOpen) openPressedCell(cell);
    };
    const onPointerUp = (event: PointerEvent) => finishPointer(event, true);
    const onPointerCancel = (event: PointerEvent) => finishPointer(event, false);
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      velocity += delta * 0.08;
      lastInteraction = performance.now();
    };

    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(viewport);
    resizeObserver.observe(band);
    viewport.addEventListener("pointerdown", onPointerDown);
    viewport.addEventListener("pointermove", onPointerMove);
    viewport.addEventListener("pointerup", onPointerUp);
    viewport.addEventListener("pointercancel", onPointerCancel);
    viewport.addEventListener("wheel", onWheel, { passive: false });
    measure();
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      viewport.removeEventListener("pointerdown", onPointerDown);
      viewport.removeEventListener("pointermove", onPointerMove);
      viewport.removeEventListener("pointerup", onPointerUp);
      viewport.removeEventListener("pointercancel", onPointerCancel);
      viewport.removeEventListener("wheel", onWheel);
    };
  }, [albums, visible]);

  return (
    <section aria-label="专辑长廊" className="album-gallery" id="album-gallery" ref={rootRef}>
      <div className="corridor-viewport" id="corridor-viewport" ref={viewportRef}>
        <div className="corridor-plane">
          <div className="corridor-band" id="corridor-band" ref={bandRef}>
            {[0, 1, 2].flatMap((copy) => albums.map((album) => (
              <button
                aria-hidden={copy !== 1 || undefined}
                className={`corridor-cell${activeAlbumId === album.id ? " is-active" : ""}`}
                data-album-id={album.id}
                data-copy={copy}
                key={`${copy}-${album.id}`}
                onClick={(event) => {
                  if (event.detail !== 0 || copy !== 1) return;
                  const cover = event.currentTarget.querySelector<HTMLElement>(".cell-cover")
                    ?? event.currentTarget;
                  onOpenRef.current(album, cover.getBoundingClientRect());
                }}
                tabIndex={copy === 1 ? 0 : -1}
                type="button"
              >
                <img
                  alt={album.name}
                  className="cell-cover"
                  decoding="async"
                  draggable={false}
                  loading="lazy"
                  src={galleryCover(album.cover)}
                />
                <span className="cell-name">{album.name} · {album.artist}</span>
              </button>
            )))}
          </div>
        </div>
      </div>
    </section>
  );
}
