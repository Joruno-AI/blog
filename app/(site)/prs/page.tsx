import Link from "next/link";

import { LegacyPage } from "@/components/site/legacy-page";
import { WarningCallout } from "@/components/site/warning-callout";

export default function PrsPage() {
  return <LegacyPage title="AstroEco is Contributing..." subtitle="Display your GitHub pull requests using astro-loader-github-prs"><WarningCallout>No GitHub data available for display. See <Link href="/blog/customizing-github-activity-pages">Customizing GitHub Activity Pages</Link> for details.</WarningCallout></LegacyPage>;
}
