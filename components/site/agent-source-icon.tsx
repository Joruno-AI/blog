import type { CSSProperties } from "react";

const MASKED_ICONS = new Set([
  "i-ri-arrow-left-line",
  "i-ri-arrow-down-s-line",
  "i-ri-arrow-left-s-line",
  "i-ri-arrow-right-line",
  "i-ri-arrow-right-s-line",
  "i-ri-archive-line",
  "i-ri-alert-line",
  "i-ri-terminal-box-line",
  "i-ri-node-tree",
  "i-uil-github-alt",
  "i-ri-search-line",
  "i-ri-star-line",
  "i-ri-git-repository-line",
  "i-ri-arrow-right-up-line",
  "i-ri-close-line",
  "i-ri-book-open-line",
  "i-ri-book-2-line",
  "i-ri-file-code-line",
  "i-ri-download-2-line",
  "i-ri-file-copy-line",
  "i-ri-check-line",
  "i-ri-layout-grid-line",
  "i-ri-list-unordered",
  "i-ri-medal-line",
  "i-ri-refresh-line",
  "i-ri-scales-3-line",
  "i-ri-shield-check-line",
  "i-simple-icons-claude",
  "i-simple-icons-openai",
  "i-simple-icons-modelcontextprotocol",
  "i-simple-icons-agentskills",
  "i-ri-sparkling-2-line",
  "i-ri-puzzle-2-line",
  "i-ri-box-3-line",
]);

/**
 * Agent pages originate from an Astro/UnoCSS view whose icons are empty mask
 * spans. Keeping that DOM shape avoids adding artificial word boundaries to
 * accessible/SSR text while retaining the exact source glyphs.
 */
export function AgentSourceIcon({ name }: { name: string }) {
  const masked = MASKED_ICONS.has(name);
  return (
    <span
      aria-hidden="true"
      className={[name, masked ? "agent-source-icon" : ""].filter(Boolean).join(" ")}
      style={masked ? { "--agent-source-icon": `url(/icons/agent/${name}.svg)` } as CSSProperties : undefined}
    />
  );
}
