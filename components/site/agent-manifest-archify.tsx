"use client";

import { ArrowRight, Network } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type { AgentManifestNode } from "@/lib/agent/repository";
import type { ArchifyArchitectureIR } from "@/lib/archify/runtime";

const MAX_RENDERED_NODES = 32;

export function agentManifestArchitecture(repo: string, manifestNodes: AgentManifestNode[]): ArchifyArchitectureIR {
  const ranked = [...manifestNodes]
    .sort((left, right) => right.incoming.length - left.incoming.length || left.path.localeCompare(right.path))
    .slice(0, MAX_RENDERED_NODES);
  const identifiers = new Map(ranked.map((node, index) => [node.id, `package-${index + 1}`]));
  const columns = Math.max(1, Math.min(6, ranked.length, Math.ceil(Math.sqrt(ranked.length * 1.7))));
  const rows = Math.max(1, Math.ceil(ranked.length / columns));
  const cellW = 164;
  const cellH = 72;
  const gapX = 54;
  const gapY = 66;
  const contentWidth = columns * cellW + Math.max(0, columns - 1) * gapX;
  const contentHeight = rows * cellH + Math.max(0, rows - 1) * gapY;
  const viewHeight = Math.max(360, contentHeight + 144);
  const viewWidth = Math.max(720, contentWidth + 96, Math.ceil(viewHeight * 1.75));
  let edgeIndex = 0;

  return {
    schema_version: 1,
    diagram_type: "architecture",
    meta: {
      title: `${repo} 项目依赖总览`,
      subtitle: `来自 ${ranked.length} 份 package.json 的 workspace 关系`,
      locale: "zh-CN",
      visual_preset: "editorial",
      animation: "none",
      legend: { mode: "hidden" },
      viewBox: [viewWidth, viewHeight],
    },
    layout: {
      mode: "grid",
      origin: [Math.round((viewWidth - contentWidth) / 2), 72],
      cols: columns,
      gapX,
      gapY,
      cellW,
      cellH,
    },
    components: ranked.map((node, index) => ({
      id: identifiers.get(node.id)!,
      type: "external",
      label: node.name.slice(0, 52),
      sublabel: (node.path.replace(/\/package\.json$/, "") || "/").slice(0, 72),
      tag: node.workspace ? "WORKSPACE" : "ROOT",
      row: Math.floor(index / columns),
      col: index % columns,
      sources: [{ path: node.path }],
    })),
    connections: ranked.flatMap((node) => node.dependencies.flatMap((dependency) => {
      const from = identifiers.get(node.id);
      const to = identifiers.get(dependency);
      if (!from || !to) return [];
      edgeIndex += 1;
      return [{
        id: `workspace-dependency-${edgeIndex}`,
        from,
        to,
        variant: "default" as const,
        route: "auto" as const,
      }];
    })),
  };
}

export function AgentManifestArchify({
  repo,
  nodes,
  onOpen,
}: {
  repo: string;
  nodes: AgentManifestNode[];
  onOpen: (path: string) => void;
}) {
  const diagram = useMemo(() => agentManifestArchitecture(repo, nodes), [nodes, repo]);
  const [html, setHtml] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setHtml("");
    setError("");
    void import("@/lib/archify/runtime")
      .then(({ renderArchitectureHtml }) => {
        if (active) setHtml(renderArchitectureHtml(diagram, { embed: true }));
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Archify 图表产物生成失败。");
      });
    return () => { active = false; };
  }, [diagram]);

  return <div className="agent-archify-manifest" data-archify-renderer="official" data-repository={repo}>
    {html ? <iframe
      className="agent-archify-manifest-frame"
      srcDoc={html}
      sandbox="allow-scripts"
      loading="lazy"
      referrerPolicy="no-referrer"
      title={`${repo} 项目依赖总览`}
    /> : <div className="agent-archify-manifest-state" role={error ? "alert" : "status"}>
      <Network aria-hidden="true" />
      <strong>{error ? "Archify 产物暂未就绪" : "正在通过 Archify 构建依赖图…"}</strong>
      {error ? <p>{error}</p> : null}
    </div>}
    <div className="agent-archify-manifest-files" aria-label="依赖图源文件">
      {nodes.slice(0, MAX_RENDERED_NODES).map((node, index) => <button type="button" onClick={() => onOpen(node.path)} key={node.id}>
        <span>{String(index + 1).padStart(2, "0")}.</span>
        <strong>{node.name}</strong>
        <small>{node.path}</small>
        <ArrowRight aria-hidden="true" />
      </button>)}
    </div>
  </div>;
}
