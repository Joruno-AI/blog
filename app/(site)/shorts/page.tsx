import type { Metadata } from "next";

import { LegacyPageFooter } from "@/components/site/legacy-page-footer";
import { ShortsDirectory, type ShortCard } from "@/components/site/shorts-directory";
import { legacyMetadata } from "@/lib/parity/legacy-metadata";
import { getPublicContentSnapshot } from "@/lib/parity/public-content-snapshot";

export const dynamic = "force-static";
export const metadata: Metadata = legacyMetadata({
  title: "Shorts",
  description: "Share your short notes or quick thoughts",
  path: "/shorts/",
  image: "/og-images/shorts.png",
});

export default async function ShortsPage() {
  const items: ShortCard[] = getPublicContentSnapshot().shorts
    .map((resource) => ({
      id: resource.id,
      title: resource.title,
      path: resource.publicPath,
      publishedAt: resource.publishedAt,
      tags: resource.tags,
    }))
    .sort((a, b) => a.title.localeCompare(b.title, "zh-CN"));

  return (
    <>
      <header className="prose shorts-page-header">
        <h1>Shorts</h1>
        <p className="subtitle">Share your short notes or quick thoughts</p>
      </header>
      <ShortsDirectory items={items} />
      <LegacyPageFooter />
    </>
  );
}
