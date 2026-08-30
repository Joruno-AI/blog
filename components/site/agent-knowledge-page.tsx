import { AgentKnowledgeReader } from "@/components/site/agent-knowledge-reader";
import type { AgentSkill } from "@/lib/agent/skills";

export function AgentKnowledgePage({
  resourcePath,
  repo,
  skill,
}: {
  resourcePath: string;
  repo?: string;
  skill?: AgentSkill;
}) {
  return <AgentKnowledgeReader repo={skill?.f || repo} resourcePath={resourcePath} skill={skill} />;
}
