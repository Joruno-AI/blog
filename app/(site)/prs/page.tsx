import type { Metadata } from "next";

import { GithubActivityEmpty } from "@/components/site/github-activity-empty";
import { LegacyPageFooter } from "@/components/site/legacy-page-footer";
import { legacyMetadata } from "@/lib/parity/legacy-metadata";
import "@/app/github-activity-parity.css";

export const metadata: Metadata = legacyMetadata({
  title: "AstroEco is Contributing...",
  description: "Display your GitHub pull requests using astro-loader-github-prs",
  path: "/prs/",
  image: "/og-images/prs.png",
});

export default function PrsPage() {
  return <><GithubActivityEmpty action="Contributing" loader="astro-loader-github-prs" /><LegacyPageFooter /></>;
}
