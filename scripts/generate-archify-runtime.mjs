#!/usr/bin/env node

/**
 * Build the Worker/browser-safe Archify architecture and sequence renderers.
 *
 * This is a source adapter, not a replacement renderer. It copies the pure
 * upstream modules and wraps Archify's official renderers in functions instead
 * of their filesystem CLI entry points.
 *
 * Upstream: https://github.com/tt-a1i/archify
 * Commit: f58298be408d62385407ca26bc5a7b612f68be2b
 * License: MIT (see vendor/archify/LICENSE)
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const upstream = path.join(root, "vendor/archify");
const runtime = path.join(root, "lib/archify/runtime/generated");
const sharedOut = path.join(runtime, "shared");
const architectureOut = path.join(runtime, "architecture");
const sequenceOut = path.join(runtime, "sequence");
const commit = "f58298be408d62385407ca26bc5a7b612f68be2b";

if (!fs.existsSync(path.join(upstream, "LICENSE"))) {
  throw new Error("vendor/archify is missing; vendor the pinned upstream before generating the runtime adapter");
}

fs.mkdirSync(sharedOut, { recursive: true });
fs.mkdirSync(architectureOut, { recursive: true });
fs.mkdirSync(sequenceOut, { recursive: true });

const banner = (source) => `/* eslint-disable @typescript-eslint/no-unused-vars */\n// GENERATED FILE - DO NOT EDIT.\n// Adapted from Archify ${commit}: ${source}\n// MIT License: ../../../../../vendor/archify/LICENSE\n`;

function read(relative) {
  return fs.readFileSync(path.join(upstream, relative), "utf8");
}

function write(relative, contents) {
  const target = path.join(runtime, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, contents);
}

for (const source of [
  "renderers/shared/generated-validators.mjs",
  "renderers/shared/i18n.mjs",
  "renderers/shared/utils.mjs",
  "renderers/shared/layout-report.mjs",
  "renderers/shared/text-fit.mjs",
  "renderers/shared/desktop-readability.mjs",
  "renderers/shared/generated-brand-marks.mjs",
  "renderers/architecture/grid.mjs",
]) {
  const destination = source
    .replace("renderers/shared/", "shared/")
    .replace("renderers/architecture/", "architecture/");
  write(destination, banner(source) + read(source));
}

for (const source of [
  "renderers/shared/validator.mjs",
  "renderers/shared/legend.mjs",
  "renderers/shared/engineering-profiles.mjs",
]) {
  const destination = source.replace("renderers/shared/", "shared/");
  write(destination, banner(source) + read(source));
}

{
  const source = "renderers/shared/geometry.mjs";
  const original = read(source);
  const patched = original.replace(
    ": process.env.ARCHIFY_QUALITY_PROFILE || profile;",
    ": profile;",
  );
  if (patched === original) throw new Error("Archify geometry quality-profile adapter did not apply");
  write("shared/geometry.mjs", banner(source) + patched);
}

write(
  "template.mjs",
  `${banner("assets/template.html")}export const ARCHIFY_TEMPLATE = ${JSON.stringify(read("assets/template.html"))};\n`,
);

{
  const source = "renderers/architecture/render-architecture.mjs";
  let body = read(source);
  const firstBodyLine = "const componentTextFit = {";
  const bodyStart = body.indexOf(firstBodyLine);
  if (bodyStart < 0) throw new Error("Archify architecture renderer body marker is missing");
  body = body.slice(bodyStart);

  const cliSetup = `const __dirname = path.dirname(fileURLToPath(import.meta.url));\nconst layoutJsonMode = process.argv.includes('--layout-json');\nconst cliArgs = process.argv.filter((arg) => arg !== '--layout-json');\nconst { diagram: arch, template, outPath, sourceEvidence } = await loadDiagramWithBrandMarks({\n  rendererDir: __dirname,\n  diagramType: 'architecture',\n  defaultExample: 'web-app.architecture.json',\n  argv: cliArgs,\n});\n`;
  if (!body.includes(cliSetup)) throw new Error("Archify architecture CLI setup marker is missing");
  body = body.replace(cliSetup, "");

  const cliTail = `validateArchitecture();\nif (layoutJsonMode) {\n  console.log(JSON.stringify(buildLayoutReport(), null, 2));\n  process.exit(0);\n}\nwriteDiagram({\n  outPath,\n  template,\n  diagramType: 'architecture',\n  meta: arch.meta,\n  svg: renderSvg(),\n  cards: arch.cards,\n  sourceEvidence,\n});\n`;
  if (!body.endsWith(cliTail)) throw new Error("Archify architecture CLI tail marker is missing");
  body = body.slice(0, -cliTail.length);

  const imports = `import { esc, renderDefinitions, renderSemanticSigil, textUnits, applyTemplate, renderCards } from '../shared/utils.mjs';
import { animateAttr, focusEdgeAttrs, focusNodeAttrs, focusNodeTitle, svgAccessibleText, svgRootAttrs, validateGuidedViews, validateRelationshipIds } from '../shared/runtime-helpers.mjs';
import { validateSchema } from '../shared/validator.mjs';
import { validateEngineeringProfile } from '../shared/engineering-profiles.mjs';
import { prepareDiagramBrandMarks, brandLabelFitWidth, brandMetadataFor, brandTopRailProblem, renderBrandMark } from '../shared/brand-marks.mjs';
import { componentBox, boundaryBox, connectionPath } from '../shared/layout-report.mjs';
import { throwDiagnosticProblems } from '../shared/diagnostics.mjs';
import { legendFootprint, relationshipLegendObstacles, resolveLegend, renderLegend as renderResolvedLegend } from '../shared/legend.mjs';
import { availableNodeTextWidth, fittedNodeFontSize, minimumNodeTextWidth } from '../shared/text-fit.mjs';
import { minimumReadableSourceTextPx } from '../shared/desktop-readability.mjs';
import { translateMessage as i18nText } from '../shared/i18n.mjs';
import { gridLayout, resolveComponentPos, validateGridPlacement } from './grid.mjs';
import { ARCHIFY_TEMPLATE } from '../template.mjs';
import {
  asArray,
  isFinitePoint,
  rectsOverlap,
  segmentIntersectsRect,
  cleanEndpointSideProblems,
  cleanFlowProblems,
  cleanCrossingProblems,
  cleanAmbiguousCorridorProblems,
  cleanBorderRunProblems,
  cleanRouteRhythmProblems,
  cleanLabelRouteClearanceProblems,
  suggestLabelObstacleFix,
  suggestComponentSeparation,
  anchor,
  automaticPortSpread,
  automaticPortRhythmBridge,
  defaultFromSide,
  defaultToSide,
  chosenSide,
  routeHonorsEndpointSides,
  normalizeRoutePoints,
  polylinePath,
  routePointsValue,
  roundedPath,
  labelPoint,
  componentFill,
  componentText,
  arrowClassMap,
  variantAccent,
} from '../shared/geometry.mjs';
`;

  const functionHead = `\nexport function renderArchitecture(diagram, options = {}) {\n  const arch = diagram;\n  const template = options.template || ARCHIFY_TEMPLATE;\n  validateSchema('architecture', arch);\n  validateGuidedViews('architecture', arch);\n  validateRelationshipIds('architecture', arch);\n  validateEngineeringProfile('architecture', arch);\n  prepareDiagramBrandMarks('architecture', arch);\n`;
  const functionTail = `  validateArchitecture();\n  const svg = renderSvg();\n  let html = applyTemplate(template, {\n    title: arch.meta.title,\n    subtitle: arch.meta.subtitle,\n    svg,\n    cards: renderCards(arch.cards),\n    locale: arch.meta.locale,\n    visualPreset: arch.meta.visual_preset || 'classic',\n    guidedViews: arch.meta.views || [],\n    sourceEvidence: null,\n  });\n  if (options.embed) {\n    html = html.replace(/<html([^>]*)>/, '<html$1 data-embed="true">');\n  }\n  return { html, svg, layout: buildLayoutReport() };\n}\n`;

  write(
    "architecture/render-architecture.mjs",
    banner(source) + imports + functionHead + body + functionTail,
  );
}

{
  const source = "renderers/sequence/render-sequence.mjs";
  let body = read(source);
  const firstBodyLine = "const participantTextFit = {";
  const bodyStart = body.indexOf(firstBodyLine);
  if (bodyStart < 0) throw new Error("Archify sequence renderer body marker is missing");
  body = body.slice(bodyStart);

  const cliSetupStart = body.indexOf("const __dirname = path.dirname(fileURLToPath(import.meta.url));");
  const rendererBodyStart = body.indexOf("const viewBox = sequence.meta?.viewBox", cliSetupStart);
  if (cliSetupStart < 0 || rendererBodyStart < 0) {
    throw new Error("Archify sequence CLI setup marker is missing");
  }
  body = body.slice(0, cliSetupStart) + body.slice(rendererBodyStart);

  const cliTailStart = body.lastIndexOf("\nvalidateSequence();\nwriteDiagram({");
  if (cliTailStart < 0) throw new Error("Archify sequence CLI tail marker is missing");
  body = body.slice(0, cliTailStart);

  const imports = `import { esc, renderDefinitions, renderSemanticSigil, textUnits, applyTemplate, renderCards } from '../shared/utils.mjs';
import { animateAttr, focusEdgeAttrs, focusNodeAttrs, focusNodeTitle, svgAccessibleText, svgRootAttrs, validateGuidedViews, validateRelationshipIds } from '../shared/runtime-helpers.mjs';
import { validateSchema } from '../shared/validator.mjs';
import { validateEngineeringProfile } from '../shared/engineering-profiles.mjs';
import { prepareDiagramBrandMarks, brandLabelFitWidth, brandMetadataFor, brandTopRailProblem, renderBrandMark } from '../shared/brand-marks.mjs';
import { throwDiagnosticProblems } from '../shared/diagnostics.mjs';
import { resolveLegend, renderLegend as renderResolvedLegend } from '../shared/legend.mjs';
import { componentFill, arrowClassMap, rectsOverlap, cleanFlowProblems, cleanCrossingProblems, cleanAmbiguousCorridorProblems, cleanBorderRunProblems, cleanRouteRhythmProblems, cleanLabelRouteClearanceProblems, routePointsValue, asArray, isFinitePoint } from '../shared/geometry.mjs';
import { availableNodeTextWidth, fittedNodeFontSize, minimumNodeTextWidth } from '../shared/text-fit.mjs';
import { translateMessage as i18nText } from '../shared/i18n.mjs';
import { ARCHIFY_TEMPLATE } from '../template.mjs';
`;

  const functionHead = `\nexport function renderSequence(diagram, options = {}) {\n  const sequence = diagram;\n  const template = options.template || ARCHIFY_TEMPLATE;\n  validateSchema('sequence', sequence);\n  validateGuidedViews('sequence', sequence);\n  validateRelationshipIds('sequence', sequence);\n  validateEngineeringProfile('sequence', sequence);\n  prepareDiagramBrandMarks('sequence', sequence);\n`;
  const functionTail = `  validateSequence();\n  const svg = renderSvg();\n  let html = applyTemplate(template, {\n    title: sequence.meta.title,\n    subtitle: sequence.meta.subtitle,\n    svg,\n    cards: renderCards(sequence.cards),\n    locale: sequence.meta.locale,\n    visualPreset: sequence.meta.visual_preset || 'classic',\n    guidedViews: sequence.meta.views || [],\n    sourceEvidence: null,\n  });\n  if (options.embed) {\n    html = html.replace(/<html([^>]*)>/, '<html$1 data-embed="true">');\n  }\n  return { html, svg };\n}\n`;

  write(
    "sequence/render-sequence.mjs",
    banner(source) + imports + functionHead + body + "\n" + functionTail,
  );
}

console.log(`Generated Worker-safe Archify architecture/sequence runtime at ${path.relative(root, runtime)}`);
