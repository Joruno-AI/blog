import type { Metadata } from "next";

import { AgentCatalog } from "@/components/site/agent-catalog";
import { AgentPageShell } from "@/components/site/agent-page-shell";
import { getSelectedAgentSkills } from "@/lib/agent/queries";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Agent 项目库", description: "浏览全部收录的 Agent Skills、MCP Servers 与工具" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
const value = (input: string | string[] | undefined) => Array.isArray(input) ? input[0] : input;

export default async function Page({ searchParams }: Props) {
  const [selected, params] = await Promise.all([getSelectedAgentSkills(), searchParams]);
  const initial = {
    category: value(params.cat), quality: value(params.quality), sort: value(params.sort), query: value(params.q), safe: value(params.safe) === "1",
    page: Number(value(params.page)) || 1, view: value(params.view) === "table" ? "table" as const : "card" as const,
  };
  return <AgentPageShell active="all" title="Agent 项目库" subtitle="28,868 个开源项目，可搜索、筛选与站内比较"><AgentCatalog selected={selected} initial={initial} /></AgentPageShell>;
}
