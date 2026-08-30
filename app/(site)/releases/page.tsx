import type { Metadata } from "next";

import { GithubActivityEmpty } from "@/components/site/github-activity-empty";
import { LegacyPageFooter } from "@/components/site/legacy-page-footer";
import { legacyMetadata } from "@/lib/parity/legacy-metadata";
import "@/app/github-activity-parity.css";

export const metadata: Metadata = legacyMetadata({
  title: "AstroEco is Releasing...",
  description: "Display your GitHub releases using astro-loader-github-releases",
  path: "/releases/",
  image: "/og-images/releases.png",
});

export default function ReleasesPage() {
  return <><GithubActivityEmpty action="Releasing" loader="astro-loader-github-releases" /><LegacyPageFooter /></>;
}
