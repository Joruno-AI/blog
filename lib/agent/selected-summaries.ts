import selectedAgentData from "@/lib/parity/data/agent-selected-summaries.json";

export type SelectedAgentSummary = {
  type: "tool";
  path: string;
  repository: string;
  title: string;
  description: string;
};

type StoredSelectedAgentSummary = Omit<SelectedAgentSummary, "type" | "path">;

const selectedAgentItems = selectedAgentData.items as Record<string, StoredSelectedAgentSummary>;

export const SELECTED_AGENT_SUMMARY_COUNT = selectedAgentData.source.count;

export function getSelectedAgentSummary(path: string): SelectedAgentSummary | null {
  const item = selectedAgentItems[path];
  return item ? { type: "tool", path, ...item } : null;
}

export function selectedAgentStaticParams() {
  return Object.values(selectedAgentItems).map(({ repository }) => ({
    id: repository.split("/"),
  }));
}
