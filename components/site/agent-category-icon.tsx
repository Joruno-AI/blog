import { AgentSourceIcon } from "@/components/site/agent-source-icon";
import { AGENT_CATEGORY_LABELS } from "@/lib/agent/skills";

export const AGENT_CATEGORY_ICON_NAMES = {
  "claude-skill": "i-simple-icons-claude",
  "codex-skill": "i-simple-icons-openai",
  "mcp-server": "i-simple-icons-modelcontextprotocol",
  "agent-tool": "i-simple-icons-agentskills",
  "ai-skill": "i-ri-sparkling-2-line",
  "llm-plugin": "i-ri-puzzle-2-line",
  uncategorized: "i-ri-box-3-line",
} as const;

export function AgentCategoryIcon({ category, size = "md", className = "" }: { category: string; size?: "sm" | "md" | "lg"; className?: string }) {
  const icon = agentCategoryIconName(category);
  return <span className={`skill-category-icon is-${size} ${className}`} title={AGENT_CATEGORY_LABELS[category] ?? AGENT_CATEGORY_LABELS.uncategorized} aria-hidden="true"><AgentSourceIcon name={icon} /></span>;
}

export function agentCategoryIconName(category: string) {
  return AGENT_CATEGORY_ICON_NAMES[category as keyof typeof AGENT_CATEGORY_ICON_NAMES] ?? AGENT_CATEGORY_ICON_NAMES.uncategorized;
}
