"use client";

import { Maximize2, Minimize2, Minus, Plus, Scan } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";

import {
  ARCHIFY_EMBED_CHANNEL,
  withArchifyEmbedBridge,
} from "@/lib/archify/embed-bridge.mjs";

// Keep the camera useful on narrow screens: fitting a wide architecture can
// legitimately land below 100%, and users still need to zoom back out after
// exploring a node.
const MIN_ZOOM = 25;
const MAX_ZOOM = 300;
const ZOOM_STEP = 25;
const FULLSCREEN_ESCAPE_GUARD_MS = 400;

type ArchifyTheme = "light" | "dark";

type ArchifyBridgeMessage = {
  channel?: string;
  type?: "ready" | "state" | "escape";
  payload?: { percent?: number; aspectRatio?: number; theme?: ArchifyTheme; x?: number; y?: number };
};

function clampZoom(value: number) {
  if (!Number.isFinite(value)) return MIN_ZOOM;
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.round(value)));
}

function validTheme(value: string | null | undefined): ArchifyTheme | null {
  const normalized = value?.trim().toLowerCase();
  return normalized === "light" || normalized === "dark" ? normalized : null;
}

function singleColorScheme(value: string | null | undefined) {
  const tokens = value?.trim().toLowerCase().replace(/^only\s+/, "").split(/\s+/).filter(Boolean) ?? [];
  return tokens.length === 1 ? validTheme(tokens[0]) : null;
}

function resolveParentTheme(): ArchifyTheme {
  const root = document.documentElement;
  const dataTheme = validTheme(root.getAttribute("data-theme"));
  if (dataTheme) return dataTheme;
  const dataScheme = validTheme(root.getAttribute("data-color-scheme"));
  if (dataScheme) return dataScheme;
  if (root.classList.contains("dark")) return "dark";
  if (root.classList.contains("light")) return "light";
  const attributeScheme = singleColorScheme(root.getAttribute("color-scheme"));
  if (attributeScheme) return attributeScheme;
  const inlineScheme = singleColorScheme(root.style.colorScheme);
  if (inlineScheme) return inlineScheme;
  const computedScheme = singleColorScheme(window.getComputedStyle(root).colorScheme);
  if (computedScheme) return computedScheme;
  // The site metadata orders the active scheme first ("light dark" or
  // "dark light") while still advertising both browser-supported schemes.
  const metaScheme = validTheme(document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]')?.content.split(/\s+/)[0]);
  if (metaScheme) return metaScheme;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ArchifyCanvas({
  src,
  srcDoc,
  title,
  className = "",
  frameClassName = "",
  loading = "lazy",
  onError,
}: {
  src?: string;
  srcDoc?: string;
  title: string;
  className?: string;
  frameClassName?: string;
  loading?: "eager" | "lazy";
  onError?: () => void;
}) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const fullscreenRef = useRef(false);
  const fullscreenExitGuardUntilRef = useRef(0);
  const preparedSrcDoc = useMemo(
    () => srcDoc ? withArchifyEmbedBridge(srcDoc) : undefined,
    [srcDoc],
  );
  const [bridgeReady, setBridgeReady] = useState(false);
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [zoomDraft, setZoomDraft] = useState(String(MIN_ZOOM));
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);
  const [fullscreen, setFullscreen] = useState(false);

  const sendCommand = useCallback((command: string, value?: number | ArchifyTheme) => {
    frameRef.current?.contentWindow?.postMessage({
      channel: ARCHIFY_EMBED_CHANNEL,
      type: "command",
      command,
      ...(typeof value === "number" || typeof value === "string" ? { value } : {}),
    }, "*");
  }, []);

  const syncTheme = useCallback(() => {
    const theme = resolveParentTheme();
    sendCommand("set-theme", theme);
  }, [sendCommand]);

  useEffect(() => {
    setBridgeReady(false);
    setZoom(MIN_ZOOM);
    setZoomDraft(String(MIN_ZOOM));
    setAspectRatio(null);
  }, [preparedSrcDoc, src]);

  useEffect(() => {
    const onMessage = (event: MessageEvent<ArchifyBridgeMessage>) => {
      if (event.source !== frameRef.current?.contentWindow) return;
      const message = event.data;
      if (!message || message.channel !== ARCHIFY_EMBED_CHANNEL) return;
      if (message.type === "escape") {
        if (document.fullscreenElement === canvasRef.current) {
          fullscreenExitGuardUntilRef.current = performance.now() + FULLSCREEN_ESCAPE_GUARD_MS;
          void document.exitFullscreen().catch(() => undefined);
        }
        return;
      }
      if (message.type !== "ready" && message.type !== "state") return;
      setBridgeReady(true);
      if (message.type === "ready") syncTheme();
      const nextZoom = Number(message.payload?.percent);
      if (Number.isFinite(nextZoom)) {
        const normalized = clampZoom(nextZoom);
        setZoom(normalized);
        setZoomDraft(String(normalized));
      }
      const nextRatio = Number(message.payload?.aspectRatio);
      if (Number.isFinite(nextRatio) && nextRatio > 0) setAspectRatio(nextRatio);
      const nextX = Number(message.payload?.x);
      const nextY = Number(message.payload?.y);
      if (Number.isFinite(nextX)) canvasRef.current?.setAttribute("data-camera-x", String(nextX));
      if (Number.isFinite(nextY)) canvasRef.current?.setAttribute("data-camera-y", String(nextY));
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [syncTheme]);

  useEffect(() => {
    syncTheme();
    const root = document.documentElement;
    const rootObserver = new MutationObserver(syncTheme);
    rootObserver.observe(root, {
      attributes: true,
      attributeFilter: ["class", "data-theme", "data-color-scheme", "style", "color-scheme"],
    });
    const meta = document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]');
    const metaObserver = new MutationObserver(syncTheme);
    if (meta) metaObserver.observe(meta, { attributes: true, attributeFilter: ["content"] });
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
    systemTheme.addEventListener("change", syncTheme);
    return () => {
      rootObserver.disconnect();
      metaObserver.disconnect();
      systemTheme.removeEventListener("change", syncTheme);
    };
  }, [syncTheme]);

  useEffect(() => {
    // A static artifact can finish loading before React hydrates the host,
    // which means both its one-shot `ready` post and the iframe load event may
    // precede our listeners. A short bounded handshake makes static `src` and
    // runtime `srcDoc` embeds converge on the same theme/control state.
    const retries = [0, 80, 240, 600, 1200].map((delay) => window.setTimeout(() => {
      syncTheme();
      sendCommand("get-state");
    }, delay));
    return () => retries.forEach((timer) => window.clearTimeout(timer));
  }, [preparedSrcDoc, sendCommand, src, syncTheme]);

  useEffect(() => {
    const syncFullscreen = () => {
      const next = document.fullscreenElement === canvasRef.current;
      if (fullscreenRef.current && !next) {
        fullscreenExitGuardUntilRef.current = performance.now() + FULLSCREEN_ESCAPE_GUARD_MS;
      }
      fullscreenRef.current = next;
      setFullscreen(next);
    };
    const exitOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      const ownsFullscreen = document.fullscreenElement === canvasRef.current;
      const guardsRecentExit = performance.now() < fullscreenExitGuardUntilRef.current;
      if (!ownsFullscreen && !fullscreenRef.current && !guardsRecentExit) return;

      // Window capture runs before the Atlas/dialog document handlers. Browser
      // fullscreen implementations can emit keydown either side of
      // `fullscreenchange`, so the short guard also consumes the trailing Esc.
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      fullscreenExitGuardUntilRef.current = performance.now() + FULLSCREEN_ESCAPE_GUARD_MS;
      if (ownsFullscreen) void document.exitFullscreen().catch(() => undefined);
    };
    document.addEventListener("fullscreenchange", syncFullscreen);
    window.addEventListener("keydown", exitOnEscape, true);
    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreen);
      window.removeEventListener("keydown", exitOnEscape, true);
    };
  }, []);

  useEffect(() => {
    if (!fullscreen || !bridgeReady) return;
    // The iframe receives its final fullscreen dimensions after the browser's
    // fullscreenchange event. Re-fit on the next frames so the complete graph
    // is visible instead of preserving an article-width camera offset.
    const first = window.requestAnimationFrame(() => sendCommand("fit"));
    const second = window.setTimeout(() => sendCommand("fit"), 160);
    return () => {
      window.cancelAnimationFrame(first);
      window.clearTimeout(second);
    };
  }, [bridgeReady, fullscreen, sendCommand]);

  const applyZoom = (value: number) => {
    const next = clampZoom(value);
    setZoom(next);
    setZoomDraft(String(next));
    sendCommand("set-zoom", next);
  };

  const commitDraft = () => {
    const parsed = Number(zoomDraft.replace(/%/g, "").trim());
    if (!Number.isFinite(parsed)) {
      setZoomDraft(String(zoom));
      return;
    }
    applyZoom(parsed);
  };

  const fitCanvas = () => {
    // Archify computes the fitted camera from the actual SVG viewBox and
    // viewport. Do not overwrite that result with a guessed 100% value.
    sendCommand("fit");
  };

  const toggleFullscreen = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (document.fullscreenElement === canvas) await document.exitFullscreen();
    else await canvas.requestFullscreen();
  };

  const viewportStyle = aspectRatio
    ? ({ "--archify-canvas-ratio": String(aspectRatio) } as CSSProperties)
    : undefined;

  return <div
    ref={canvasRef}
    className={["archify-canvas", className].filter(Boolean).join(" ")}
    data-archify-ready={bridgeReady ? "true" : "false"}
    data-fullscreen={fullscreen ? "true" : "false"}
  >
    <div className="archify-canvas-controls" role="toolbar" aria-label={`${title} 画布控制`}>
      <span className="archify-canvas-controls-label" aria-hidden="true">Archify 画布</span>
      <button
        type="button"
        onClick={() => applyZoom(zoom - ZOOM_STEP)}
        disabled={!bridgeReady || zoom <= MIN_ZOOM}
        aria-label="缩小图表"
        title="缩小 25%"
      ><Minus aria-hidden="true" /></button>
      <label className="archify-canvas-zoom-field">
        <span className="sr-only">缩放比例</span>
        <input
          type="number"
          min={MIN_ZOOM}
          max={MAX_ZOOM}
          step={5}
          inputMode="numeric"
          value={zoomDraft}
          disabled={!bridgeReady}
          onChange={(event) => setZoomDraft(event.target.value)}
          onBlur={commitDraft}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commitDraft();
              event.currentTarget.blur();
            } else if (event.key === "Escape") {
              event.preventDefault();
              setZoomDraft(String(zoom));
              event.currentTarget.blur();
            }
          }}
          aria-label="缩放百分比"
        />
        <span aria-hidden="true">%</span>
      </label>
      <button
        type="button"
        onClick={() => applyZoom(zoom + ZOOM_STEP)}
        disabled={!bridgeReady || zoom >= MAX_ZOOM}
        aria-label="放大图表"
        title="放大 25%"
      ><Plus aria-hidden="true" /></button>
      <span className="archify-canvas-control-divider" aria-hidden="true" />
      <button type="button" className="archify-canvas-text-button" onClick={fitCanvas} disabled={!bridgeReady} title="适配完整图表">
        <Scan aria-hidden="true" /><span>适配</span>
      </button>
      <button
        type="button"
        className="archify-canvas-text-button"
        onClick={() => void toggleFullscreen()}
        aria-label={fullscreen ? "退出全屏" : "全屏查看"}
        aria-keyshortcuts="Escape"
        title={fullscreen ? "退出全屏（Esc）" : "全屏查看"}
      >
        {fullscreen ? <Minimize2 aria-hidden="true" /> : <Maximize2 aria-hidden="true" />}
        <span>{fullscreen ? "退出" : "全屏"}</span>
      </button>
      {fullscreen ? <span className="archify-canvas-esc-hint">Esc 退出全屏</span> : null}
    </div>
    <div className="archify-embed-viewport" style={viewportStyle}>
      <iframe
        ref={frameRef}
        className={["archify-embed-frame", frameClassName].filter(Boolean).join(" ")}
        {...(src ? { src } : {})}
        {...(preparedSrcDoc ? { srcDoc: preparedSrcDoc } : {})}
        title={title}
        sandbox="allow-scripts"
        loading={loading}
        referrerPolicy="no-referrer"
        allow="fullscreen"
        onLoad={() => {
          syncTheme();
          window.setTimeout(() => sendCommand("get-state"), 0);
          window.setTimeout(() => sendCommand("get-state"), 120);
        }}
        onError={onError}
      />
    </div>
  </div>;
}
