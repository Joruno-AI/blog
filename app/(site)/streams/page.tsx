import type { Metadata } from "next";
import Link from "next/link";

import { PageStructuredData } from "@/components/site/page-structured-data";
import { LegacyPageFooter } from "@/components/site/legacy-page-footer";
import { ViewportRevealGuard } from "@/components/site/home-reveal-controller";
import { StreamDirectory } from "@/components/site/stream-directory";
import { legacyMetadata } from "@/lib/parity/legacy-metadata";
import { getPublicContentSnapshot, snapshotPublishedResources } from "@/lib/parity/public-content-snapshot";
import "@/app/projects-streams-parity.css";

const subtitle = "Example: displaying Astro streams with local JSON data";

export const metadata: Metadata = legacyMetadata({
  title: "Astro Streams",
  description: subtitle,
  path: "/streams/",
});

export const dynamic = "force-static";

export default function StreamsPage() {
  const resources = snapshotPublishedResources(getPublicContentSnapshot().streams);

  return (
    <>
      <PageStructuredData path="/streams/" title="Astro Streams" description={subtitle} />
      <ViewportRevealGuard
        rootSelector=".astro-site"
        targetSelector=".streams-parity-page .stream-year-heading.slide-enter, .streams-parity-page .stream-list-item.slide-enter, .streams-parity-page + footer.slide-enter, .astro-site > footer.site-footer.slide-enter"
      />
      <div className="streams-parity-page">
        <nav id="nav-tabs" className="prose streams-tabbed-header" aria-label="Page sections">
          <div className="streams-tab-list" role="tablist">
            <Link className="stream-tab inactive" href="/changelog/" role="tab">
              Changelog
            </Link>
            <Link className="stream-tab inactive" href="/feeds/" role="tab">
              AstroBlog
            </Link>
            <Link className="stream-tab active" href="/streams/" role="tab" aria-current="page">
              AstroStreams
            </Link>
          </div>
          <p>{subtitle}</p>
        </nav>
        <div className="prose streams-parity-content">
          <StreamDirectory resources={resources} />
        </div>
      </div>
      <LegacyPageFooter />
    </>
  );
}
