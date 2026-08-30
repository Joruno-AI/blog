import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

import {
  ARCHIFY_EMBED_BRIDGE_MARKER,
  ARCHIFY_EMBED_CHANNEL,
  withArchifyEmbedBridge,
} from "../lib/archify/embed-bridge.mjs";

test("injects an idempotent, opaque-sandbox Archify camera bridge", () => {
  const source = '<!DOCTYPE html><html><body><div class="diagram-container"><svg viewBox="0 0 1600 900"></svg></div></body></html>';
  const enhanced = withArchifyEmbedBridge(source);
  assert.match(enhanced, /data-embed="true"/);
  assert.match(enhanced, new RegExp(ARCHIFY_EMBED_BRIDGE_MARKER.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(enhanced, new RegExp(ARCHIFY_EMBED_CHANNEL));
  assert.match(enhanced, /event\.source !== parent/);
  assert.match(enhanced, /zoom-in/);
  assert.match(enhanced, /zoom-out/);
  assert.match(enhanced, /set-zoom/);
  assert.match(enhanced, /set-theme/);
  assert.match(enhanced, /officialTheme\.toggle\(\)/);
  assert.match(enhanced, /html\.setAttribute\('data-theme', theme\)/);
  assert.match(enhanced, /document\.body\.style\.setProperty\('transition', 'none', 'important'\)/);
  assert.match(enhanced, /report\('state'\);\s*requestAnimationFrame/);
  assert.match(enhanced, /logicalViewport/);
  assert.match(enhanced, /centerAt/);
  assert.match(enhanced, /data-archify-embed-wide-diagram/);
  assert.match(enhanced, /container\.removeAttribute\('data-wide-diagram'\)/);
  assert.match(enhanced, /shell\.style\.height = '100%'/);
  assert.match(enhanced, /container\.style\.boxSizing = 'border-box'/);
  assert.match(enhanced, /preserveAspectRatio', 'xMidYMid meet'/);
  assert.match(enhanced, /archify-embed-focus-style/);
  assert.match(enhanced, /data-focus-match/);
  assert.match(enhanced, /getAttribute\('data-embed'\) !== 'true'/);
  assert.match(enhanced, /parent\.postMessage\(\{ channel: CHANNEL, type: 'escape' \}/);
  assert.match(enhanced, /function camera\(\) \{\s*enableEmbeddedCamera\(\)/);
  assert.match(enhanced, /command === 'fit' \|\| command === 'reset'/);
  assert.match(enhanced, /var MIN_SCALE = 0\.25/);
  assert.match(enhanced, /focus\.clear\(\{ preserveView: true, restoreFocus: false \}\)/);
  assert.match(enhanced, /aspectRatio: width \/ height/);
  assert.equal(withArchifyEmbedBridge(enhanced), enhanced);
  assert.doesNotMatch(enhanced, /allow-same-origin/);
});

test("keeps embedded wide diagrams on the real camera path below 720px", () => {
  const source = '<!DOCTYPE html><html><body><div class="diagram-container" data-wide-diagram="true"><svg viewBox="0 0 1600 900"></svg></div></body></html>';
  const enhanced = withArchifyEmbedBridge(source);
  const script = enhanced.match(/<script data-archify-embed-bridge="v1">([\s\S]*?)<\/script>/)?.[1];
  assert.ok(script, "missing injected bridge script");

  const attributes = new Set(["data-wide-diagram"]);
  const container = {
    style: {},
    closest: () => null,
    querySelector: () => ({
      setAttribute: () => undefined,
      style: { setProperty: () => undefined },
    }),
    hasAttribute: (name: string) => attributes.has(name),
    removeAttribute: (name: string) => attributes.delete(name),
    setAttribute: (name: string) => attributes.add(name),
  };
  const state = { scale: 1 };
  const reports: Array<{ payload?: { percent?: number; theme?: string } }> = [];
  let receiveMessage: ((event: { source: unknown; data: unknown }) => void) | undefined;
  const parent = { postMessage: (message: { payload?: { percent?: number; theme?: string } }) => reports.push(message) };
  let rootTheme = "dark";
  const view = {
    state: () => state,
    logicalViewport: () => ({ x: 0, y: 0, width: 1600, height: 900 }),
    centerAt: (_x: number, _y: number, options: { scale: number }) => {
      // Mirrors the upstream mobile-wide branch that caused the regression.
      state.scale = attributes.has("data-wide-diagram") ? 1 : options.scale;
      return true;
    },
    reset: () => { state.scale = 1; },
  };
  const window = {
    Archify: {
      view,
      theme: { toggle: () => { rootTheme = rootTheme === "dark" ? "light" : "dark"; } },
    },
    addEventListener: (type: string, listener: typeof receiveMessage) => {
      if (type === "message") receiveMessage = listener;
    },
  };
  const document = {
    documentElement: {
      style: {},
      getAttribute: (name: string) => name === "data-embed" ? "true" : name === "data-theme" ? rootTheme : null,
      setAttribute: (name: string, value: string) => { if (name === "data-theme") rootTheme = value; },
    },
    getElementById: () => null,
    createElement: () => ({ id: "", textContent: "" }),
    head: { appendChild: () => undefined },
    body: { style: { setProperty: () => undefined } },
    querySelector: (selector: string) => selector === ".diagram-container" ? container : {
      viewBox: { baseVal: { width: 1600, height: 900 } },
    },
    addEventListener: () => undefined,
  };

  vm.runInNewContext(script, {
    console,
    document,
    window,
    parent,
    requestAnimationFrame: (callback: () => void) => callback(),
  });
  assert.equal(attributes.has("data-wide-diagram"), false);
  assert.equal(attributes.has("data-archify-embed-wide-diagram"), true);
  assert.ok(receiveMessage);
  receiveMessage({
    source: parent,
    data: { channel: ARCHIFY_EMBED_CHANNEL, type: "command", command: "set-zoom", value: 180 },
  });
  assert.equal(state.scale, 1.8);
  assert.equal(reports.at(-1)?.payload?.percent, 180);
  receiveMessage({
    source: parent,
    data: { channel: ARCHIFY_EMBED_CHANNEL, type: "command", command: "set-theme", value: "light" },
  });
  assert.equal(rootTheme, "light");
  assert.equal(reports.at(-1)?.payload?.theme, "light");
});

test("ships full canvas controls and sizes the frame from the Archify viewBox", () => {
  const canvas = readFileSync("components/site/archify-canvas.tsx", "utf8");
  const css = readFileSync("app/globals.css", "utf8");
  const agentCss = readFileSync("app/agent-parity.css", "utf8");

  for (const contract of [
    "requestFullscreen",
    "exitFullscreen",
    'event.key !== "Escape"',
    'aria-label="\u7f29\u653e\u767e\u5206\u6bd4"',
    'aria-label="\u7f29\u5c0f\u56fe\u8868"',
    'aria-label="\u653e\u5927\u56fe\u8868"',
    "\u9002\u914d",
    "ARCHIFY_EMBED_CHANNEL",
    'sendCommand("set-zoom"',
    'sendCommand("fit")',
  ]) assert.ok(canvas.includes(contract), `missing canvas contract: ${contract}`);

  assert.match(canvas, /sandbox="allow-scripts"/);
  assert.doesNotMatch(canvas, /allow-same-origin/);
  assert.match(canvas, /allow="fullscreen"/);
  assert.match(canvas, /const MIN_ZOOM = 25/);
  assert.match(canvas, /if \(!fullscreen \|\| !bridgeReady\) return/);
  assert.doesNotMatch(canvas, /allowFullScreen/);
  assert.match(canvas, /window\.addEventListener\("keydown", exitOnEscape, true\)/);
  assert.match(canvas, /event\.stopImmediatePropagation\(\)/);
  assert.match(canvas, /message\.type === "escape"/);
  assert.match(canvas, /fullscreenExitGuardUntilRef/);
  assert.match(canvas, /guardsRecentExit/);
  assert.doesNotMatch(canvas, /document\.addEventListener\("keydown", exitOnEscape/);
  assert.match(css, /aspect-ratio: var\(--archify-canvas-ratio, 16 \/ 9\)/);
  assert.match(css, /\.archify-canvas:fullscreen/);
  assert.doesNotMatch(css, /height: clamp\(27rem, 54vw, 46rem\)/);
  assert.doesNotMatch(agentCss, /height: clamp\(32rem, 70vh, 50rem\)/);
});

test("isolates fullscreen Escape from Atlas and other parent overlays", () => {
  const canvas = readFileSync("components/site/archify-canvas.tsx", "utf8");
  const atlas = readFileSync("components/site/agent-knowledge-reader-impl.tsx", "utf8");

  // The canvas owns the earliest capture phase while it is fullscreen. Atlas
  // keeps its normal document-level Escape behavior for every other state.
  assert.match(atlas, /document\.addEventListener\("keydown", keydown, true\)/);
  assert.match(canvas, /window\.addEventListener\("keydown", exitOnEscape, true\)/);
  assert.match(canvas, /if \(!ownsFullscreen && !fullscreenRef\.current && !guardsRecentExit\) return/);
  assert.match(canvas, /event\.preventDefault\(\)/);
  assert.match(canvas, /event\.stopPropagation\(\)/);
  assert.match(canvas, /event\.stopImmediatePropagation\(\)/);
  assert.match(canvas, /FULLSCREEN_ESCAPE_GUARD_MS/);
});

test("syncs the effective parent theme through the opaque iframe bridge", () => {
  const canvas = readFileSync("components/site/archify-canvas.tsx", "utf8");

  assert.match(canvas, /root\.getAttribute\("data-theme"\)/);
  assert.match(canvas, /root\.classList\.contains\("dark"\)/);
  assert.match(canvas, /root\.style\.colorScheme/);
  assert.match(canvas, /meta\[name="color-scheme"\]/);
  assert.match(canvas, /window\.matchMedia\("\(prefers-color-scheme: dark\)"\)/);
  assert.match(canvas, /new MutationObserver\(syncTheme\)/);
  assert.match(canvas, /attributeFilter: \["class", "data-theme", "data-color-scheme", "style", "color-scheme"\]/);
  assert.match(canvas, /sendCommand\("set-theme", theme\)/);
  assert.match(canvas, /if \(message\.type === "ready"\) syncTheme\(\)/);
  assert.match(canvas, /onLoad=\{\(\) => \{\s*syncTheme\(\)/);
  assert.match(canvas, /const retries = \[0, 80, 240, 600, 1200\]/);
});
