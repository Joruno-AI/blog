"use client";

import dynamic from "next/dynamic";

import type { AgentWikiStructureItem } from "@/lib/agent/zread";

export type AgentMarkdownProps = {
  content: string;
  repo: string;
  refName: string;
  sourcePath?: string;
  className?: string;
  wikiItems?: AgentWikiStructureItem[];
  onOpenWiki?: (title: string) => void;
  onOpenFile?: (path: string) => void;
};

const BrowserAgentMarkdown = dynamic(
  () => import("@/components/site/agent-markdown-impl").then((module) => module.AgentMarkdown),
  {
    ssr: false,
    loading: () => (
      <article className="agent-wiki-article prose astro-markdown">
        <div className="agent-article-skeleton" aria-label="正在渲染文档">
          <span /><span /><span /><span /><span /><span />
        </div>
      </article>
    ),
  },
);

// Repository Markdown is fetched in the browser already. This client-only
// boundary keeps Shiki's complete grammar set in static browser chunks instead
// of tracing it into the Worker handler.
export function AgentMarkdown(props: AgentMarkdownProps) {
  return <BrowserAgentMarkdown {...props} />;
}
