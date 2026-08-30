import type { Metadata } from "next";

import { PageStructuredData } from "@/components/site/page-structured-data";
import { legacyMetadata } from "@/lib/parity/legacy-metadata";

const description = "唱片机音乐播放器";

export const metadata: Metadata = legacyMetadata({
  title: "唱片机",
  description,
  path: "/music/",
  image: "/og-images/music.png",
});

export default function MusicPage() {
  return <>
    <PageStructuredData path="/music/" title="唱片机" description={description} />
    <div aria-hidden="true" data-music-route-marker="true" />
  </>;
}
