"use client";

import { useEffect } from "react";

export function ViewportRevealGuard({
  rootSelector,
  targetSelector,
}: {
  rootSelector: string;
  targetSelector: string;
}) {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(rootSelector);
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const targets = [...root.querySelectorAll<HTMLElement>(targetSelector)];
    const viewportLimit = window.innerHeight * 0.88;
    const pending = targets.filter((target) => target.getBoundingClientRect().top > viewportLimit);
    if (!pending.length || !("IntersectionObserver" in window)) return;
    const enterDistance = window.matchMedia("(max-width: 767px)").matches ? 12 : 18;

    pending.forEach((target) => {
      target.style.opacity = "0";
      target.style.transform = `translate3d(0, ${enterDistance}px, 0)`;
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const target = entry.target as HTMLElement;
          target.style.removeProperty("opacity");
          target.style.removeProperty("transform");
          observer.unobserve(target);
        });
      },
      { rootMargin: "0px 0px -9% 0px", threshold: [0, 0.08, 0.2] },
    );
    pending.forEach((target) => observer.observe(target));

    return () => {
      observer.disconnect();
      pending.forEach((target) => {
        target.style.removeProperty("opacity");
        target.style.removeProperty("transform");
      });
    };
  }, [rootSelector, targetSelector]);

  return null;
}

/** Keeps below-the-fold home sections hidden until they enter the viewport, as in Astro. */
export function HomeRevealController() {
  return (
    <ViewportRevealGuard
      rootSelector=".home-shell"
      targetSelector=":scope > *"
    />
  );
}
