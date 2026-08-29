import { LegacyPage } from "@/components/site/legacy-page";
import { ResourceList } from "@/components/site/resource-list";
import { getPublishedResourcesByPathPrefix } from "@/modules/resources/application/queries";

export async function AgentRoutePage({ title, subtitle, prefix }: { title: string; subtitle: string; prefix?: string }) {
  const resources = prefix ? await getPublishedResourcesByPathPrefix(prefix, 1000) : [];
  return <LegacyPage title={title} subtitle={subtitle} agentNav>{resources.length ? <ResourceList resources={resources} /> : <p className="legacy-empty">数据会由 GitHub Skills 快照同步到这里。</p>}</LegacyPage>;
}
