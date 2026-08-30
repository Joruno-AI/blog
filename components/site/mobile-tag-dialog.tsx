"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { SiteIcon } from "@/components/site/site-icon";

const FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "a[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

type MobileTagDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  triggerClassName: string;
  dialogClassName: string;
  backdropClassName: string;
  panelClassName: string;
  children: ReactNode;
};

/**
 * Renders the legacy mobile tag control at the site-shell level. Fixed
 * controls nested in <main> are otherwise trapped below the footer's stacking
 * context, which makes the trigger unclickable and the scrim incomplete.
 */
export function MobileTagDialog({
  open,
  onOpenChange,
  triggerClassName,
  dialogClassName,
  backdropClassName,
  panelClassName,
  children,
}: MobileTagDialogProps) {
  const [portalHost, setPortalHost] = useState<HTMLElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setPortalHost(document.querySelector<HTMLElement>(".astro-site") ?? document.body);
  }, []);

  useEffect(() => {
    if (!open) return;

    const body = document.body;
    const trigger = triggerRef.current;
    const previousOverflow = body.style.overflow;
    const previousPaddingRight = body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - body.clientWidth;
    if (scrollbarWidth > 0 && !document.getElementById("bg-rose")) {
      body.style.paddingRight = `${scrollbarWidth}px`;
    }
    body.style.overflow = "hidden";

    const focusables = () => Array.from(
      panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? [],
    ).filter((element) => element.getClientRects().length > 0);

    const frame = window.requestAnimationFrame(() => {
      focusables()[0]?.focus({ preventScroll: true });
    });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onOpenChange(false);
        return;
      }
      if (event.key !== "Tab") return;

      const elements = focusables();
      if (!elements.length) {
        event.preventDefault();
        return;
      }
      const first = elements[0];
      const last = elements[elements.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !panelRef.current?.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !panelRef.current?.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown);
      if (previousOverflow) body.style.overflow = previousOverflow;
      else body.style.removeProperty("overflow");
      if (previousPaddingRight) body.style.paddingRight = previousPaddingRight;
      else body.style.removeProperty("padding-right");
      window.requestAnimationFrame(() => {
        if (trigger?.isConnected) trigger.focus({ preventScroll: true });
      });
    };
  }, [onOpenChange, open]);

  const controls = (
    <>
      <button
        ref={triggerRef}
        id="tag-open-button"
        className={`floating-tool-button ${triggerClassName}`}
        type="button"
        aria-label="展开标签筛选"
        aria-expanded={open}
        aria-controls="tag-panel"
        title="展开标签筛选"
        onClick={() => onOpenChange(true)}
      >
        <SiteIcon name="price-tag-3-line" />
      </button>

      <div
        className={dialogClassName}
        role="presentation"
        hidden={!open}
        aria-hidden={!open}
        inert={!open}
      >
          <button
            className={`${backdropClassName} fade-in`}
            type="button"
            tabIndex={-1}
            aria-label="关闭标签筛选"
            onClick={() => onOpenChange(false)}
          />
          <section
            ref={panelRef}
            id="tag-panel"
            className={`${panelClassName} fade-in`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="tag-panel-title"
          >
            <header id="tag-panel-title">Tags</header>
            {children}
          </section>
      </div>
    </>
  );

  return portalHost ? createPortal(controls, portalHost) : controls;
}
