import { AgentKnowledgeReader } from "@/components/site/agent-knowledge-reader";

export function AgentIndexDetail({ repo }: { repo: string }) {
  return <AgentKnowledgeReader repo={repo} />;
}
