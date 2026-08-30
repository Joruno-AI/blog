"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";

import { ArchifyCanvas } from "@/components/site/archify-canvas";

const ARCHIFY_ARTIFACT_PATH = /^\/diagrams\/archify\/[a-f0-9]{64}\.html$/;

export function normalizeArchifyArtifactSrc(source: string) {
  const value = source.trim();
  if (!value || value.startsWith("//")) return null;
  let url;
  try {
    url = new URL(value, "https://archify.local");
  } catch {
    return null;
  }
  if (url.origin !== "https://archify.local" || !ARCHIFY_ARTIFACT_PATH.test(url.pathname)) return null;
  return `${url.pathname}?embed=1`;
}

export function ArchifyEmbed({
  src,
  title,
  className = "",
  fallback,
}: {
  src: string;
  title: string;
  className?: string;
  fallback?: ReactNode;
}) {
  const safeSrc = useMemo(() => normalizeArchifyArtifactSrc(src), [src]);
  const [status, setStatus] = useState<"checking" | "ready" | "error">(safeSrc ? "checking" : "error");

  useEffect(() => {
    if (!safeSrc) {
      setStatus("error");
      return;
    }
    const controller = new AbortController();
    setStatus("checking");
    void fetch(safeSrc, {
      method: "HEAD",
      cache: "force-cache",
      credentials: "same-origin",
      signal: controller.signal,
    }).then((response) => {
      if (!controller.signal.aborted) setStatus(response.ok ? "ready" : "error");
    }).catch(() => {
      if (!controller.signal.aborted) setStatus("error");
    });
    return () => controller.abort();
  }, [safeSrc]);

  return (
    <figure className={["archify-embed", className].filter(Boolean).join(" ")} data-archify-status={status}>
      <figcaption className="archify-embed-header">
        <strong>{title || "Architecture diagram"}</strong>
        <span>Archify</span>
      </figcaption>
      {status === "ready" && safeSrc ? (
        <ArchifyCanvas
          src={safeSrc}
          title={title || "Archify diagram"}
          onError={() => setStatus("error")}
        />
      ) : status === "checking" ? (
        <div className="archify-embed-status" role="status">正在载入 Archify 图表…</div>
      ) : (
        fallback ?? <div className="archify-embed-status" role="status">Archify 产物暂时不可用。<code>{safeSrc || src}</code></div>
      )}
    </figure>
  );
}
