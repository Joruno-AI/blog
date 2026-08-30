import type { Metadata } from "next";
import Link from "next/link";

import { ChangelogDirectory, type ChangelogListItem } from "@/components/site/changelog-directory";
import { LegacyPageFooter } from "@/components/site/legacy-page-footer";
import { legacyMetadata } from "@/lib/parity/legacy-metadata";
import { getPublicContentSnapshot } from "@/lib/parity/public-content-snapshot";
import "@/app/blog-parity.css";
import "@/app/changelog-parity.css";

export const dynamic = "force-static";
export const metadata: Metadata = legacyMetadata({
  title: "Changelog",
  description: "Changelog for the Astro AntfuStyle Theme project",
  path: "/changelog/",
  image: "/og-images/changelog.png",
});

export default async function ChangelogPage() {
  const items: ChangelogListItem[] = getPublicContentSnapshot().changelog.flatMap((resource) => {
    if (!resource.publishedAt) return [];
    return [{
      id: resource.id,
      title: resource.title,
      path: resource.publicPath,
      publishedAt: resource.publishedAt,
      minutesRead: resource.minutesRead,
      tags: resource.tags,
    }];
  });
  return <><nav id="nav-tabs" className="prose changelog-tabs" aria-label="Page sections"><div role="tablist"><Link className="active" href="/changelog/" role="tab" aria-current="page">Changelog</Link><Link className="inactive" href="/feeds/" role="tab">AstroBlog</Link><Link className="inactive" href="/streams/" role="tab">AstroStreams</Link></div></nav><div className="prose changelog-content"><ChangelogDirectory items={items} /></div><LegacyPageFooter /></>;
}
