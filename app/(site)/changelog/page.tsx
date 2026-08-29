import { ResourceList } from "@/components/site/resource-list";
import { TabbedLegacyPage } from "@/components/site/legacy-page";
import { getPublishedResourcesByPathPrefix } from "@/modules/resources/application/queries";

export const dynamic = "force-dynamic";
export default async function ChangelogPage() { return <TabbedLegacyPage active="changelog"><ResourceList resources={await getPublishedResourcesByPathPrefix("/changelog", 1000)} /></TabbedLegacyPage>; }
