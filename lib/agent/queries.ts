import { getPublishedResourceSummariesByPathPrefix } from "@/modules/resources/application/queries";
import { agentSkillFromResource } from "@/lib/agent/skills";

export async function getSelectedAgentSkills() {
  const resources = await getPublishedResourceSummariesByPathPrefix("/agent", 1000);
  return resources
    .filter((resource) => resource.type === "tool" && resource.path.split("/").filter(Boolean).length === 3)
    .map(agentSkillFromResource);
}
