"use client";

import { useEffect } from "react";

const revealSelector = [
  ".slide-enter",
  ".slide-enter-content > *:not(#desktop-aside):not(#mobile-control)",
  ".home-shell > *",
  ".reader-content > :is(h2, h3, h4, p, ul, ol, blockquote, pre, figure, table, details, .callout, .expressive-code, .archify-embed, .markdown-table-wrap)",
  ".agent-wiki-article > :is(h2, h3, h4, p, ul, ol, blockquote, pre, figure, .archify-embed, table)",
].join(",");

/**
 * Replays Astro's viewport reveal without changing React-owned DOM attributes.
 * Mutating class/style attributes from a parent client boundary can race the
 * hydration of streamed server children, so the visual transition uses WAAPI.
 */
export function RevealController({ routeKey, disabled = false }: { routeKey: string; disabled?: boolean }) {
  useEffect(() => {
    const site = document.querySelector<HTMLElement>(".astro-site");
    const main = site?.querySelector<HTMLElement>("#main");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!site || !main || disabled || reduceMotion || !("IntersectionObserver" in window)) return;

    let frame = 0;
    let observer: IntersectionObserver | null = null;
    const registeredTargets = new WeakSet<HTMLElement>();
    const animations = new Set<Animation>();

    const collectTargets = (root: ParentNode = site) => {
      const targets: HTMLElement[] = [];
      if (root instanceof HTMLElement && root.matches(revealSelector)) targets.push(root);
      targets.push(...root.querySelectorAll<HTMLElement>(revealSelector));
      return targets;
    };

    const holdBelowViewport = (element: HTMLElement) => {
      const mobile = window.matchMedia("(max-width: 767px)").matches;
      const animation = element.animate(
        [
          { opacity: 0, transform: `translate3d(0, ${mobile ? 12 : 18}px, 0)` },
          { opacity: 0, transform: `translate3d(0, ${mobile ? 12 : 18}px, 0)` },
        ],
        { duration: 1, fill: "both" },
      );
      animations.add(animation);
      void animation.finished.catch(() => undefined);
    };

    const reveal = (element: HTMLElement, order = 0) => {
      observer?.unobserve(element);
      element.getAnimations().forEach((animation) => animation.cancel());
      const mobile = window.matchMedia("(max-width: 767px)").matches;
      const animation = element.animate(
        [
          { opacity: 0, transform: `translate3d(0, ${mobile ? 12 : 18}px, 0)` },
          { opacity: 1, transform: "translate3d(0, 0, 0)" },
        ],
        {
          duration: mobile ? 480 : 560,
          delay: Math.min(order * 46, 138),
          easing: "cubic-bezier(0.16, 1, 0.3, 1)",
          fill: "backwards",
        },
      );
      animations.add(animation);
      void animation.finished.finally(() => animations.delete(animation)).catch(() => undefined);
    };

    const revealBatch = (targets: HTMLElement[]) => {
      targets
        .sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top)
        .forEach((target, index) => reveal(target, index));
    };

    const registerTargets = (targets: HTMLElement[], initial = false) => {
      const viewportLimit = window.innerHeight * 0.88;
      const visible: HTMLElement[] = [];
      targets.forEach((target) => {
        if (registeredTargets.has(target)) return;
        registeredTargets.add(target);
        const rect = target.getBoundingClientRect();
        if (rect.bottom >= 0 && rect.top <= viewportLimit) visible.push(target);
        else {
          // Astro keeps reveal targets outside the initial viewport invisible.
          // A one-frame WAAPI hold reproduces that full-page screenshot and
          // scroll behavior without mutating React-owned class/style attrs.
          holdBelowViewport(target);
          observer?.observe(target);
        }
      });
      if (!visible.length) return;
      frame = requestAnimationFrame(() => {
        if (initial) frame = requestAnimationFrame(() => revealBatch(visible));
        else revealBatch(visible);
      });
    };

    observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .map((entry) => entry.target as HTMLElement);
        if (visible.length) frame = requestAnimationFrame(() => revealBatch(visible));
      },
      { rootMargin: "0px 0px -9% 0px", threshold: [0, 0.08, 0.2] },
    );

    registerTargets(collectTargets(), true);
    const mutationObserver = new MutationObserver((mutations) => {
      const addedTargets = mutations.flatMap((mutation) =>
        [...mutation.addedNodes].flatMap((node) =>
          node instanceof HTMLElement ? collectTargets(node) : [],
        ),
      );
      if (addedTargets.length) registerTargets(addedTargets);
    });
    mutationObserver.observe(main, { childList: true, subtree: true });

    return () => {
      if (frame) cancelAnimationFrame(frame);
      observer?.disconnect();
      mutationObserver.disconnect();
      animations.forEach((animation) => animation.cancel());
      animations.clear();
    };
  }, [disabled, routeKey]);

  return null;
}
