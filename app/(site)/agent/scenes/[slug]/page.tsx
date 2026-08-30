import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AgentSceneDetailIsland } from "@/components/site/agent-aggregate-islands";
import { AgentPageShell } from "@/components/site/agent-page-shell";
import { agentSceneDetailInitial } from "@/lib/agent/ssr-projections";
import { legacyMetadata } from "@/lib/parity/legacy-metadata";
import scenesData from "@/lib/parity/data/agent-scenes.json";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return scenesData.scenes.map((scene) => ({ slug: scene.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = decodeURIComponent((await params).slug);
  const scene = scenesData.scenes.find((item) => item.slug === slug);
  if (!scene) return {};
  const path = `/agent/scenes/${scene.slug}/`;
  return legacyMetadata({
    title: `${scene.title} - Agent 场景`,
    description: `${scene.title}: ${scene.desc}`,
    path,
    image: `/og-images/agent/scenes/${scene.slug}.png`,
  });
}

export default async function Page({ params }: Props) {
  const slug = decodeURIComponent((await params).slug);
  const scene = scenesData.scenes.find((item) => item.slug === slug);
  if (!scene) notFound();
  const groupLabel = scenesData.groups.find((group) => group.key === scene.group)?.label ?? "";
  return <AgentPageShell active="scenes" title={scene.title} subtitle={scene.desc}><AgentSceneDetailIsland keywords={scene.keywords} groupLabel={groupLabel} initial={agentSceneDetailInitial(scene.slug)} /></AgentPageShell>;
}
