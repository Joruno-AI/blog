import { TabbedLegacyPage } from "@/components/site/legacy-page";
import { getPublishedResourcesByPathPrefix } from "@/modules/resources/application/queries";
import { ResourceList } from "@/components/site/resource-list";
export const dynamic = "force-dynamic";
export default async function StreamsPage() { return <TabbedLegacyPage active="streams" subtitle="Example: displaying Astro streams with local JSON data"><ResourceList resources={await getPublishedResourcesByPathPrefix("/streams", 1000)} /></TabbedLegacyPage>; }
