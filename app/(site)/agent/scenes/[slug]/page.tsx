import { notFound } from "next/navigation";

import { AgentPageShell } from "@/components/site/agent-page-shell";
import { AgentSceneDetail } from "@/components/site/agent-scene-detail";
import { getSelectedAgentSkills } from "@/lib/agent/queries";
import scenesData from "@/public/agent/scenes.json";

type Props = { params: Promise<{ slug: string }> };
export default async function Page({ params }: Props) {
  const slug = decodeURIComponent((await params).slug);
  const scene = scenesData.scenes.find((item) => item.slug === slug);
  if (!scene) notFound();
  const selected = await getSelectedAgentSkills();
  return <AgentPageShell active="scenes" title={scene.title} subtitle={scene.desc}><AgentSceneDetail keywords={scene.keywords} selected={selected} /></AgentPageShell>;
}
