"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LightRays } from "@/components/site/light-rays";
import { SiteIcon } from "@/components/site/site-icon";

function pageKind(pathname: string) {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  if (path === "/") return "home";
  if (path === "/blog") return "blog";
  if (path.startsWith("/blog/")) return "article";
  if (path === "/docs" || path.startsWith("/docs/")) return "docs";
  if (path === "/agent" || path.startsWith("/agent/")) return "agent";
  if (path === "/music" || path.startsWith("/music/")) return "music";
  return "default";
}

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [showTop, setShowTop] = useState(false);
  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        setShowTop(window.scrollY > 300);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);
  const kind = pageKind(pathname);
  return (
    <div className="astro-site" data-page-kind={kind}>
      {kind !== "music" ? <LightRays /> : null}
      {children}
      <button
        id="to-top-button"
        className="floating-tool-button to-top-button"
        type="button"
        aria-label="回到页面顶部"
        title="回到页面顶部"
        data-visible={showTop || undefined}
        onClick={() => window.scrollTo({ top: 0, behavior: "auto" })}
      >
        <SiteIcon name="arrow-up-line" />
      </button>
    </div>
  );
}
