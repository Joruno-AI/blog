"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function SiteFooter() {
  const pathname = usePathname();
  const agentParts = pathname.split("/").filter(Boolean);
  const agentKnowledge = pathname === "/agent/repository"
    || (agentParts.length >= 3 && agentParts[0] === "agent" && agentParts[1] !== "scenes");
  if (pathname === "/" || pathname.startsWith("/docs") || agentKnowledge) return null;
  return (
    <footer className="astro-footer site-footer slide-enter">
      <div className="prose astro-footer-inner site-footer-inner">
        <div className="astro-footer-content site-footer-content">
          <span className="site-footer-copyright">© {new Date().getFullYear()} Joruno Jobāna</span>
          <span className="astro-footer-credit site-footer-credit">
            Powered by{" "}
            <Link href="https://github.com/lin-stephanie/astro-antfustyle-theme" target="_blank" rel="noopener noreferrer" aria-label="Open in new tab">
              Astro AntfuStyle Theme
            </Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
