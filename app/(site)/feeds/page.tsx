import type { Metadata } from "next";
import Link from "next/link";

import { LegacyPageFooter } from "@/components/site/legacy-page-footer";
import { legacyMetadata } from "@/lib/parity/legacy-metadata";
import "@/app/changelog-parity.css";

const subtitle = "Example: fetching Astro blog using @ascorbic/feed-loader";
export const metadata: Metadata = legacyMetadata({ title: "Astro Blog", description: subtitle, path: "/feeds/" });

export default function FeedsPage() {
  return <>
    <nav id="nav-tabs" className="prose changelog-tabs feeds-tabs" aria-label="Page sections">
      <div role="tablist"><Link className="inactive" href="/changelog" role="tab">Changelog</Link><Link className="active" href="/feeds" role="tab" aria-current="page">AstroBlog</Link><Link className="inactive" href="/streams" role="tab">AstroStreams</Link></div>
      <p className="tabbed-subtitle">{subtitle}</p>
    </nav>
    <div className="prose changelog-content"><div className="legacy-empty" aria-label="Feed list">nothing here yet</div></div>
    <LegacyPageFooter />
  </>;
}
