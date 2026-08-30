import { SiteChrome } from "@/components/site/site-chrome";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { KeyboardShortcuts } from "@/components/site/keyboard-shortcuts";
import { GlobalMusicPlayer } from "@/components/site/global-music-player";
import "../astro-parity.css";
import "../light-rays.css";
import "../agent-parity.css";
import "../docs-parity.css";
import "../shorts-parity.css";
import "../music-parity.css";
import "../astro-source-prose.css";
import "../astro-source-markdown.css";
import "katex/dist/katex.min.css";
import "viewerjs/dist/viewer.css";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return <SiteChrome><a className="skip-link" href="#main">Skip to content</a><SiteHeader /><main id="main" className="astro-main">{children}</main><SiteFooter /><GlobalMusicPlayer /><KeyboardShortcuts /></SiteChrome>;
}
