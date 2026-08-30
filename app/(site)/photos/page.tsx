import type { Metadata } from "next";

import "@/app/photos-parity.css";
import { LegacyPageFooter } from "@/components/site/legacy-page-footer";
import { ViewportRevealGuard } from "@/components/site/home-reveal-controller";
import { PageStructuredData } from "@/components/site/page-structured-data";
import { PhotoGallery } from "@/components/site/photo-gallery";
import { legacyMetadata } from "@/lib/parity/legacy-metadata";
import { getPublicContentSnapshot } from "@/lib/parity/public-content-snapshot";

const description = "Create your personal gallery";

export const metadata: Metadata = legacyMetadata({
  title: "Photos",
  description,
  path: "/photos/",
  image: "/og-images/photos.png",
});

export const dynamic = "force-static";

export default function PhotosPage() {
  const collection = getPublicContentSnapshot().photoCollection;
  return (
    <>
      <PageStructuredData path="/photos/" title="Photos" description={description} />
      <ViewportRevealGuard
        rootSelector=".astro-site"
        targetSelector=".astro-photos-index + footer.slide-enter, .astro-site > footer.site-footer.slide-enter"
      />
      <div className="astro-photos-index">
        <header className="astro-photo-header prose">
          <h1>Photos</h1>
          <p>{description}</p>
        </header>
        <PhotoGallery hash={collection.hash} />
      </div>
      <LegacyPageFooter />
    </>
  );
}
