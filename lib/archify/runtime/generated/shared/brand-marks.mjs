// Worker-safe built-in brand-mark path from Archify's official renderer.
// Upstream: tt-a1i/archify@f58298be408d62385407ca26bc5a7b612f68be2b
// Source: archify/renderers/shared/brand-marks.mjs (MIT)
// Remote icon capture stays a build-time concern; runtime IR accepts Archify's
// built-in brand IDs and rejects network-backed brand values deterministically.

import { BRAND_MARKS } from "./generated-brand-marks.mjs";
import { throwDiagnosticError } from "./diagnostics.mjs";
import { esc, textUnits } from "./utils.mjs";

const COLLECTIONS = Object.freeze({
  architecture: "components",
  workflow: "nodes",
  sequence: "participants",
  dataflow: "nodes",
  lifecycle: "states",
});
const MARK_BY_LOOKUP = new Map();
const MARK_BY_DOMAIN = new Map();
const RESOLVED_BY_NODE = new WeakMap();

function lookupForms(value) {
  const raw = String(value ?? "").trim().toLocaleLowerCase("en-US");
  if (!raw) return [];
  const dashed = raw.replace(/[\s_]+/g, "-");
  const compact = raw.replace(/[\s_.-]+/g, "");
  return [...new Set([raw, dashed, compact])];
}

for (const mark of BRAND_MARKS) {
  for (const value of [mark.id, mark.title, ...mark.aliases]) {
    for (const form of lookupForms(value)) {
      if (!MARK_BY_LOOKUP.has(form)) MARK_BY_LOOKUP.set(form, mark);
    }
  }
  for (const domain of mark.domains) MARK_BY_DOMAIN.set(domain, mark);
}

function asUrl(value) {
  try {
    const url = new URL(String(value));
    return ["https:", "http:"].includes(url.protocol) ? url : null;
  } catch {
    return null;
  }
}

function domainMark(hostname) {
  const host = hostname.toLocaleLowerCase("en-US").replace(/\.$/, "");
  const candidates = [...MARK_BY_DOMAIN.entries()]
    .filter(([domain]) => host === domain || host.endsWith(`.${domain}`))
    .sort(([left], [right]) => right.length - left.length);
  return candidates[0]?.[1] || null;
}

export function findBrandMark(value) {
  const url = asUrl(value);
  if (url) return domainMark(url.hostname);
  for (const form of lookupForms(value)) {
    const mark = MARK_BY_LOOKUP.get(form);
    if (mark) return mark;
  }
  return null;
}

function suggestions(value) {
  const needle = lookupForms(value)[0] || "";
  return BRAND_MARKS.map((mark) => ({
    id: mark.id,
    score: lookupForms(mark.id).some((form) => form.includes(needle) || needle.includes(form)) ? 0 : 1,
  }))
    .sort((left, right) => left.score - right.score || left.id.localeCompare(right.id))
    .slice(0, 5)
    .map((entry) => entry.id);
}

export function prepareDiagramBrandMarks(diagramType, diagram) {
  const collection = COLLECTIONS[diagramType];
  const nodes = collection && Array.isArray(diagram[collection]) ? diagram[collection] : [];
  const unknown = [];
  nodes.forEach((node, index) => {
    if (!node.brand) return;
    if (typeof node.brand === "object" || asUrl(node.brand)) {
      unknown.push(`/${collection}/${index}/brand uses remote capture data; render this IR during the trusted build instead`);
      return;
    }
    const preset = findBrandMark(node.brand);
    if (preset) {
      RESOLVED_BY_NODE.set(node, {
        ...preset,
        kind: "preset",
        status: "preset",
        sourceUrl: preset.provenance.source,
      });
      return;
    }
    unknown.push(`/${collection}/${index}/brand ${JSON.stringify(node.brand)} is not a built-in brand; closest IDs: ${suggestions(node.brand).join(", ")}`);
  });
  if (unknown.length) {
    throwDiagnosticError(
      `Brand mark validation failed:\n- ${unknown.join("\n- ")}`,
      unknown.map((message) => ({
        code: message.includes("remote capture") ? "brand/runtime-remote" : "brand/unknown",
        severity: "error",
        message,
        subject: { diagramType, collection },
        evidence: {},
        supportedFixes: message.includes("remote capture")
          ? ["pre-render network-backed brands with the vendored Archify CLI during the trusted build"]
          : ["choose a built-in Archify brand ID"],
      })),
    );
  }
}

export function brandMarkFor(node) {
  return RESOLVED_BY_NODE.get(node) || null;
}

export function brandMetadataFor(node) {
  const mark = brandMarkFor(node);
  return mark
    ? {
        brand: mark.title,
        brandId: mark.id,
        brandStatus: mark.status,
        brandSource: mark.sourceUrl,
      }
    : {};
}

export function brandLabelFitWidth(node, width) {
  return brandMarkFor(node) ? Math.max(1, width - 48) : width;
}

export function brandTopRailProblem(node, width, minimumFontSize, subject = "Node") {
  if (!brandMarkFor(node)) return null;
  const available = width - 48;
  const required = textUnits(node.label) * minimumFontSize * 0.6;
  if (available >= required) return null;
  return `${subject} "${node.id}" brand top rail leaves ${Math.max(0, available)}px for its label, but `
    + `"${node.label}" needs ~${Math.ceil(required)}px at the ${minimumFontSize}px legible minimum — widen the node or shorten the label.`;
}

function markAttrs(mark) {
  return [
    `data-brand-mark="${esc(mark.id)}"`,
    `data-brand-title="${esc(mark.title)}"`,
    `data-brand-status="${esc(mark.status)}"`,
    mark.sourceUrl ? `data-brand-source="${esc(mark.sourceUrl)}"` : "",
    mark.sha256 ? `data-brand-sha256="${esc(mark.sha256)}"` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export function renderBrandMark(node, { x, y, size = 16 } = {}) {
  const mark = brandMarkFor(node);
  if (!mark) return "";
  const inset = 3;
  const scale = (size - inset * 2) / mark.viewBox;
  const content = `<path d="${esc(mark.path)}" transform="translate(${inset} ${inset}) scale(${scale})" fill="#${esc(mark.hex)}"/>`;
  return `<g aria-hidden="true" ${markAttrs(mark)} class="brand-mark" transform="translate(${x} ${y})">
            <rect width="${size}" height="${size}" rx="4" class="brand-mark-badge"/>
            ${content}
            <rect width="${size}" height="${size}" rx="4" class="brand-mark-frame"/>
          </g>`;
}
