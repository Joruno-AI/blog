// Worker-safe extraction of Archify's shared CLI renderer helpers.
// Upstream: tt-a1i/archify@f58298be408d62385407ca26bc5a7b612f68be2b
// Source: archify/renderers/shared/cli.mjs (MIT)

import { esc } from "./utils.mjs";
import { throwDiagnosticProblems } from "./diagnostics.mjs";
import { resolveLocale, translateMessage } from "./i18n.mjs";

const SEMANTIC_COLLECTIONS = {
  architecture: "components",
  workflow: "nodes",
  sequence: "participants",
  dataflow: "nodes",
  lifecycle: "states",
};

const RELATIONSHIP_COLLECTIONS = {
  architecture: "connections",
  workflow: "edges",
  sequence: "messages",
  dataflow: "flows",
  lifecycle: "transitions",
};

export function validateRelationshipIds(diagramType, diagram) {
  const collection = RELATIONSHIP_COLLECTIONS[diagramType];
  const relationships = collection && Array.isArray(diagram[collection]) ? diagram[collection] : [];
  const seen = new Set();
  const problems = [];

  relationships.forEach((relationship, index) => {
    if (relationship.id === undefined || relationship.id === null || relationship.id === "") return;
    if (seen.has(relationship.id)) {
      problems.push(`/${collection}/${index}/id duplicates relationship id ${JSON.stringify(relationship.id)}`);
    }
    seen.add(relationship.id);
  });

  if (problems.length) {
    throwDiagnosticProblems("Relationship identity validation failed", problems, {
      code: "relationship/duplicate-id",
      subject: { diagramType, collection },
    });
  }
}

export function validateGuidedViews(diagramType, diagram) {
  const views = diagram.meta?.views;
  if (!Array.isArray(views) || views.length === 0) return;
  const collection = SEMANTIC_COLLECTIONS[diagramType];
  const semanticIds = new Set((diagram[collection] || []).map((item) => item.id));
  const seen = new Set();
  const problems = [];

  views.forEach((view, index) => {
    if (seen.has(view.id)) problems.push(`/meta/views/${index}/id duplicates view id ${JSON.stringify(view.id)}`);
    seen.add(view.id);
    const seenFocus = new Set();
    (view.focus || []).forEach((id, focusIndex) => {
      if (seenFocus.has(id)) {
        problems.push(`/meta/views/${index}/focus/${focusIndex} duplicates semantic id ${JSON.stringify(id)}`);
      }
      seenFocus.add(id);
      if (!semanticIds.has(id)) {
        problems.push(`/meta/views/${index}/focus/${focusIndex} references unknown semantic id ${JSON.stringify(id)}`);
      }
    });
  });

  if (problems.length) {
    throwDiagnosticProblems("Guided view validation failed", problems, {
      code: "guided-view/invalid",
      subject: { diagramType, collection: "meta.views" },
    });
  }
}

export function svgRootAttrs(meta) {
  const animation = meta.animation === "trace" ? ' data-animation="trace"' : "";
  const preset = ` data-preset="${esc(meta.visual_preset || "classic")}"`;
  const engineeringProfile = meta.engineering_profile
    ? ` data-engineering-profile="${esc(meta.engineering_profile)}"`
    : "";
  const requestedProfile = meta.quality_profile;
  const qualityProfile = requestedProfile === "showcase" ? "showcase" : "standard";
  const advisory = requestedProfile ? "" : ' data-quality-gates="advisory"';
  return `role="img" lang="${esc(resolveLocale(meta.locale))}" aria-labelledby="archify-diagram-title archify-diagram-description"${animation}${preset}${engineeringProfile} data-quality-profile="${esc(qualityProfile)}"${advisory}`;
}

export function svgAccessibleText(meta, kind) {
  const description = meta.subtitle || translateMessage(meta.locale, `diagram.description.${kind}`);
  return `        <title id="archify-diagram-title">${esc(meta.title)}</title>\n        <desc id="archify-diagram-description">${esc(description)}</desc>`;
}

export function animateAttr(meta, kind, step) {
  if (meta.animation !== "trace") return "";
  const safeStep = Number.isFinite(step) && step >= 0 ? Math.min(12, Math.floor(step)) : 0;
  return ` data-animate="${kind}" style="--step:${safeStep}"`;
}

export function focusNodeAttrs(id, label, metadata = {}, locale) {
  const optional = [
    ["data-node-kind", metadata.kind],
    ["data-node-sublabel", metadata.sublabel],
    ["data-node-tag", metadata.tag],
    ["data-node-context", metadata.context],
    ["data-node-brand", metadata.brand],
    ["data-node-brand-id", metadata.brandId],
    ["data-node-brand-status", metadata.brandStatus],
    ["data-node-brand-source", metadata.brandSource],
  ]
    .filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== "")
    .map(([name, value]) => ` ${name}="${esc(String(value))}"`)
    .join("");
  const detail = [metadata.sublabel, metadata.context, metadata.brand]
    .filter((value) => value !== undefined && value !== null && String(value).trim() !== "")
    .join(", ");
  const aria = detail
    ? translateMessage(locale, "node.focus.detail", { label, detail })
    : translateMessage(locale, "node.focus", { label });
  return `id="node-${esc(id)}" data-node-id="${esc(id)}" data-node-label="${esc(label)}" tabindex="0" role="button" aria-label="${esc(aria)}" aria-pressed="false"${optional}`;
}

export function focusNodeTitle(label, metadata = {}) {
  const parts = [label, metadata.sublabel, metadata.context, metadata.tag, metadata.brand].filter(
    (value) => value !== undefined && value !== null && String(value).trim() !== "",
  );
  return `<title>${esc(parts.join(" · "))}</title>`;
}

export function focusEdgeAttrs(from, to, label, key, id) {
  const named = label ? ` data-edge-label="${esc(label)}"` : "";
  const keyed = key !== undefined && key !== null ? ` data-edge-key="${esc(String(key))}"` : "";
  const identified = id !== undefined && id !== null && String(id).trim() !== ""
    ? ` data-edge-id="${esc(String(id))}"`
    : "";
  return `data-edge-from="${esc(from)}" data-edge-to="${esc(to)}"${named}${keyed}${identified}`;
}
