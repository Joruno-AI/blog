import { AgentPageShell } from "@/components/site/agent-page-shell";
import { AgentScenes } from "@/components/site/agent-scenes";
import { getSelectedAgentSkills } from "@/lib/agent/queries";

export const dynamic = "force-dynamic";
export default async function Page() {
  const selected = await getSelectedAgentSkills();
  return <AgentPageShell active="scenes" title="场景导航" subtitle="56 个场景，按需找到合适的工具"><AgentScenes initialItems={selected} /></AgentPageShell>;
}
