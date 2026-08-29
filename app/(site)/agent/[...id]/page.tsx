import type { Metadata } from "next";

import { AgentIndexDetail } from "@/components/site/agent-index-detail";
import { AgentKnowledgePage } from "@/components/site/agent-knowledge-page";
import { getRequestViewer } from "@/lib/auth/request-viewer";
import { agentSkillFromResource } from "@/lib/agent/skills";
import { getPublicResource } from "@/modules/resources/application/queries";

type Props = { params: Promise<{ id: string[] }> };
const pathOf = async (params: Props["params"]) => `/agent/${(await params).id.map(decodeURIComponent).join("/")}`;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resource = await getPublicResource(await pathOf(params), await getRequestViewer());
  if (!resource || resource.type !== "tool") return {};
  return { title: `${resource.title} - Agent 知识库`, description: resource.description ?? undefined, alternates: { canonical: resource.path } };
}

export default async function Page({ params }: Props) {
  const path = await pathOf(params);
  const resource = await getPublicResource(path, await getRequestViewer());
  if (!resource || resource.type !== "tool") return <AgentIndexDetail repo={path.replace(/^\/agent\//, "")} />;
  return <AgentKnowledgePage skill={agentSkillFromResource(resource)} />;
}
