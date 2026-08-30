"use client";

import { useEffect, useState } from "react";

import { ArchifyCanvas } from "@/components/site/archify-canvas";

type RuntimeState =
  | { status: "loading" }
  | { status: "ready"; html: string }
  | { status: "unsupported"; reason: string; detail?: string }
  | { status: "error"; message: string };

export function ArchifyRuntimeMermaid({
  source,
  repository,
  title,
}: {
  source: string;
  repository: string;
  title: string;
}) {
  const [state, setState] = useState<RuntimeState>({ status: "loading" });

  useEffect(() => {
    let active = true;
    setState({ status: "loading" });
    void import("@/lib/archify/runtime-mermaid")
      .then(({ renderMermaidWithArchify }) => renderMermaidWithArchify(source, {
        title,
        repository,
      }))
      .then((result) => {
        if (!active) return;
        if (result.supported) setState({ status: "ready", html: result.html });
        else setState({
          status: "unsupported",
          reason: result.reason,
          ...(result.detail ? { detail: result.detail } : {}),
        });
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setState({
          status: "error",
          message: reason instanceof Error ? reason.message : "Archify runtime rendering failed",
        });
      });
    return () => { active = false; };
  }, [repository, source, title]);

  return <figure
    className="archify-embed archify-runtime-embed"
    data-archify-status={state.status}
    data-archify-renderer="official-runtime"
  >
    <figcaption className="archify-embed-header">
      <strong>{title}</strong>
      <span>Archify</span>
    </figcaption>
    {state.status === "ready" ? <ArchifyCanvas srcDoc={state.html} title={title} /> : state.status === "loading" ? <div className="archify-embed-status" role="status">
      正在通过 Archify 构建图表…
    </div> : state.status === "unsupported" ? <div className="archify-embed-status" role="status">
      当前 Mermaid 语法超出 Archify 实时转换范围。
      <code>{state.reason}{state.detail ? ` · ${state.detail}` : ""}</code>
    </div> : <div className="archify-embed-status" role="alert">
      Archify 图表生成失败。<code>{state.message}</code>
    </div>}
  </figure>;
}
