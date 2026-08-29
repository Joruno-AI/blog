import { ResourceList } from "@/components/site/resource-list";
import { LegacyPage } from "@/components/site/legacy-page";
import { getPublishedResourcesByPathPrefix } from "@/modules/resources/application/queries";
export const dynamic = "force-dynamic";
export default async function Page({ params }: { params: Promise<{ id: string }> }) { const id = decodeURIComponent((await params).id); return <LegacyPage title={id} subtitle="课程章节"><ResourceList resources={await getPublishedResourcesByPathPrefix(`/docs/course/${id}`, 1000)} /></LegacyPage>; }
