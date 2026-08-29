import { TabbedLegacyPage } from "@/components/site/legacy-page";
import { getPublishedResourcesByPathPrefix } from "@/modules/resources/application/queries";
import { StreamDirectory } from "@/components/site/stream-directory";
export const dynamic = "force-dynamic";
export default async function StreamsPage() { return <TabbedLegacyPage active="streams" subtitle="Example: displaying Astro streams with local JSON data"><StreamDirectory resources={await getPublishedResourcesByPathPrefix("/streams", 1000)} /></TabbedLegacyPage>; }
