"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";

import { AgentKnowledgeLoading } from "@/components/site/agent-knowledge-reader-loading";
import type { AgentSkill } from "@/lib/agent/skills";

export type AgentKnowledgeReaderProps = {
  repo?: string;
  resourcePath?: string;
  skill?: AgentSkill;
};

const BrowserAgentKnowledgeReader = dynamic(
  () => import("@/components/site/agent-knowledge-reader-impl").then((module) => module.AgentKnowledgeReader),
  {
    ssr: false,
    loading: () => null,
  },
);

// Repository traversal, generated documentation, Markdown rendering and the
// interactive Atlas are browser work. The route keeps metadata on the server,
// while this boundary prevents the complete reader from consuming Worker SSR
// CPU for every concurrent detail request.
export function AgentKnowledgeReader(props: AgentKnowledgeReaderProps) {
  const [browserReady, setBrowserReady] = useState(false);
  const markBrowserReady = useCallback(() => setBrowserReady(true), []);
  return <>
    {!browserReady ? <AgentKnowledgeLoading repo={props.skill?.f || props.repo} skill={props.skill} /> : null}
    <BrowserAgentKnowledgeReader {...props} onReady={markBrowserReady} />
  </>;
}
