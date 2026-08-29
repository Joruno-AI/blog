"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

function pageKind(pathname: string) {
  if (pathname === "/") return "home";
  if (pathname === "/blog") return "blog";
  if (pathname.startsWith("/blog/")) return "article";
  if (pathname.startsWith("/docs")) return "docs";
  if (pathname.startsWith("/agent")) return "agent";
  if (pathname.startsWith("/music")) return "music";
  return "default";
}

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [showTop, setShowTop] = useState(false);
  useEffect(() => { const onScroll = () => setShowTop(window.scrollY > 300); onScroll(); window.addEventListener("scroll", onScroll, { passive: true }); return () => window.removeEventListener("scroll", onScroll); }, []);
  const kind = pageKind(pathname);
  return <div className="astro-site" data-page-kind={kind}>{kind !== "music" ? <div className="ambient-light-rays" aria-hidden="true"><span /><span /><span /></div> : null}{children}<button className="to-top-button" type="button" aria-label="回到页面顶部" data-visible={showTop || undefined} onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>↑</button></div>;
}
