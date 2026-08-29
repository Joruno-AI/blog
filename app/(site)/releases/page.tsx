import Link from "next/link";

import { LegacyPage } from "@/components/site/legacy-page";
import { WarningCallout } from "@/components/site/warning-callout";

export default function ReleasesPage() {
  return <LegacyPage title="AstroEco is Releasing..." subtitle="Display your GitHub releases using astro-loader-github-releases"><WarningCallout>No GitHub data available for display. See <Link href="/blog/customizing-github-activity-pages">Customizing GitHub Activity Pages</Link> for details.</WarningCallout></LegacyPage>;
}
