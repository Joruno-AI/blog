"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function SiteFooter() {
  const pathname = usePathname();
  const agentParts = pathname.split("/").filter(Boolean);
  const agentDetail = agentParts.length === 3 && agentParts[0] === "agent" && agentParts[1] !== "scenes";
  if (pathname === "/" || pathname.startsWith("/music") || agentDetail) return null;
  return <footer className="astro-footer"><div className="prose astro-footer-inner"><span>© {new Date().getFullYear()} Joruno Jobāna</span><span>Powered by <Link href="https://github.com/lin-stephanie/astro-antfustyle-theme" target="_blank">Astro AntfuStyle Theme</Link></span></div></footer>;
}
