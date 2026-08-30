import type { Metadata } from "next";
import { cache } from "react";

import { AgentIndexDetail } from "@/components/site/agent-index-detail";
import { AgentKnowledgePage } from "@/components/site/agent-knowledge-page";
import {
  getSelectedAgentSummary,
  selectedAgentStaticParams,
} from "@/lib/agent/selected-summaries";
import { selectedAgentPreview } from "@/lib/agent/ssr-projections";
import { agentSkillFromResource } from "@/lib/agent/skills";
import { legacyMetadata } from "@/lib/parity/legacy-metadata";
import { getPublicResourceSummary } from "@/modules/resources/application/queries";

type Props = { params: Promise<{ id: string[] }> };
const pathOf = async (params: Props["params"]) => `/agent/${(await params).id.map(decodeURIComponent).join("/")}`;
const repositoryOf = async (params: Props["params"]) => (await params).id.slice(0, 2).map(decodeURIComponent).join("/");
const getAgentSummary = cache(async (path: string) => (
  getSelectedAgentSummary(path) ?? await getPublicResourceSummary(path)
));

// Astro generated the 400 curated repository pages at build time. Keep those
// responses out of the Worker render path while retaining on-demand fallback
// for repositories from the complete 28k index.
export const dynamicParams = true;

export function generateStaticParams() {
  return selectedAgentStaticParams();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const path = await pathOf(params);
  const resource = await getAgentSummary(path);
  if (!resource || resource.type !== "tool") {
    const repository = await repositoryOf(params);
    const name = repository.split("/")[1];
    return name ? legacyMetadata({
      title: `${name} - Agent 知识库`,
      description: "基于仓库源码生成的站内知识库、架构地图与文件浏览器",
      path,
      image: `/og-images${path}.png`,
    }) : {};
  }
  return legacyMetadata({
    title: `${resource.title} - Agent 知识库`,
    description: resource.description || "基于仓库源码生成的站内知识库、架构地图与文件浏览器",
    path: resource.path,
    image: `/og-images${resource.path}.png`,
  });
}

export default async function Page({ params }: Props) {
  const path = await pathOf(params);
  const resource = await getAgentSummary(path);
  if (!resource || resource.type !== "tool") return <AgentIndexDetail repo={await repositoryOf(params)} />;
  if ("repository" in resource) {
    return <AgentKnowledgePage resourcePath={resource.path} repo={resource.repository} skill={selectedAgentPreview(resource.repository) ?? undefined} />;
  }
  return <AgentKnowledgePage resourcePath={resource.path} skill={agentSkillFromResource(resource)} />;
}
