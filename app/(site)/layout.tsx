import { SiteChrome } from "@/components/site/site-chrome";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return <SiteChrome><a className="skip-link" href="#main">Skip to content</a><SiteHeader /><main id="main" className="astro-main">{children}</main><SiteFooter /></SiteChrome>;
}
