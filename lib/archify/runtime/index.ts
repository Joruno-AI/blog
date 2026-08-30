import { renderArchitecture as renderOfficialArchitecture } from "./generated/architecture/render-architecture.mjs";
import { renderSequence as renderOfficialSequence } from "./generated/sequence/render-sequence.mjs";

export const ARCHIFY_UPSTREAM = Object.freeze({
  repository: "https://github.com/tt-a1i/archify",
  commit: "f58298be408d62385407ca26bc5a7b612f68be2b",
  version: "2.16.0-dev.0",
  license: "MIT",
} as const);

export type ArchifyLocale = "en" | "zh-CN";
export type ArchifyVisualPreset = "classic" | "signal-flow" | "blueprint" | "editorial";
export type ArchifyComponentType =
  | "frontend"
  | "backend"
  | "database"
  | "cloud"
  | "security"
  | "messagebus"
  | "external";
export type ArchifyConnectionVariant = "default" | "emphasis" | "security" | "dashed";
export type ArchifySide = "left" | "right" | "top" | "bottom";
export type ArchifyPoint = [number, number];

export interface ArchifyGuidedView {
  id: string;
  label: string;
  focus: string[];
  note?: string;
}

export interface ArchifyLegendEntry {
  label?: string;
  visible?: boolean;
}

export interface ArchifyArchitectureMeta {
  title: string;
  locale?: ArchifyLocale;
  subtitle?: string;
  output?: string;
  animation?: "trace" | "none";
  visual_preset?: ArchifyVisualPreset;
  quality_profile?: "standard" | "showcase";
  engineering_profile?: "deployment-ownership";
  repository?: {
    url: string;
    revision: string;
  };
  views?: ArchifyGuidedView[];
  legend?: {
    mode?: "auto" | "all" | "hidden";
    entries?: Partial<Record<ArchifyComponentType, ArchifyLegendEntry>>;
  };
  viewBox?: ArchifyPoint;
}

export interface ArchifyArchitectureComponent {
  id: string;
  type: ArchifyComponentType;
  label: string;
  sublabel?: string;
  tag?: string;
  /** Worker rendering supports official built-in Archify brand IDs. */
  brand?: string;
  sources?: Array<{
    path: string;
    line?: number;
    end_line?: number;
    label?: string;
  }>;
  row?: number;
  col?: number;
  pos?: ArchifyPoint;
  size?: ArchifyPoint;
}

export interface ArchifyArchitectureBoundary {
  kind: "region" | "security-group";
  label: string;
  wraps: string[];
  pad?: number;
}

export interface ArchifyArchitectureConnection {
  id?: string;
  from: string;
  to: string;
  label?: string;
  variant?: ArchifyConnectionVariant;
  fromSide?: ArchifySide;
  toSide?: ArchifySide;
  route?: "auto" | "straight" | "orthogonal-h" | "orthogonal-v";
  via?: ArchifyPoint[];
  labelAt?: ArchifyPoint;
  labelDx?: number;
  labelDy?: number;
  labelSegment?: number;
  width?: number;
}

export interface ArchifyInfoCard {
  dot: "cyan" | "emerald" | "violet" | "amber" | "rose" | "orange" | "slate";
  title: string;
  items: string[];
}

export interface ArchifyArchitectureIR {
  schema_version: 1;
  diagram_type: "architecture";
  meta: ArchifyArchitectureMeta;
  layout?: {
    mode: "grid";
    origin?: ArchifyPoint;
    cols?: number;
    gapX?: number;
    gapY?: number;
    cellW?: number;
    cellH?: number;
  };
  components: ArchifyArchitectureComponent[];
  boundaries?: ArchifyArchitectureBoundary[];
  connections?: ArchifyArchitectureConnection[];
  cards?: ArchifyInfoCard[];
}

export interface ArchifyArchitectureLayoutReport {
  ok: true;
  diagram_type: "architecture";
  layout: { mode: "free" | "grid"; [key: string]: unknown };
  viewBox: ArchifyPoint;
  components: Array<Record<string, unknown>>;
  boundaries: Array<Record<string, unknown>>;
  connections: Array<Record<string, unknown>>;
  labels: Array<Record<string, unknown>>;
}

export interface ArchifyArchitectureRenderOptions {
  /** Adds data-embed=true immediately; useful for iframe srcDoc responses. */
  embed?: boolean;
  /** Mainly for upstream template-compatibility tests. */
  template?: string;
}

export interface ArchifyArchitectureRenderResult {
  /** Official self-contained Archify viewer HTML. */
  html: string;
  /** Official semantic SVG inserted into that viewer. */
  svg: string;
  /** Official renderer layout report for inspection and tests. */
  layout: ArchifyArchitectureLayoutReport;
}

export interface ArchifySequenceMeta {
  title: string;
  locale?: ArchifyLocale;
  subtitle?: string;
  animation?: "trace" | "none";
  visual_preset?: ArchifyVisualPreset;
  quality_profile?: "standard" | "showcase";
  engineering_profile?: "deployment-ownership";
  viewBox?: ArchifyPoint;
  column_fit?: "fixed" | "spread";
  views?: ArchifyGuidedView[];
  legend?: {
    mode?: "auto" | "all" | "hidden";
    entries?: Record<string, ArchifyLegendEntry>;
  };
}

export interface ArchifySequenceParticipant {
  id: string;
  type: ArchifyComponentType;
  label: string;
  sublabel?: string;
  brand?: string;
}

export interface ArchifySequenceMessage {
  id?: string;
  from: string;
  to: string;
  y: number;
  label: string;
  note?: string;
  variant?: ArchifyConnectionVariant | "return";
}

export interface ArchifySequenceIR {
  schema_version: 1;
  diagram_type: "sequence";
  meta: ArchifySequenceMeta;
  participants: ArchifySequenceParticipant[];
  messages: ArchifySequenceMessage[];
  segments?: Array<{ label: string; from: number; to: number }>;
  activations?: Array<{
    participant: string;
    from: number;
    to: number;
    type?: ArchifyComponentType;
  }>;
  cards?: ArchifyInfoCard[];
}

export interface ArchifySequenceRenderResult {
  /** Official self-contained Archify viewer HTML. */
  html: string;
  /** Official semantic SVG inserted into that viewer. */
  svg: string;
}

export type ArchifyRuntimeIR = ArchifyArchitectureIR | ArchifySequenceIR;

/**
 * Render typed Architecture JSON IR with Archify's official renderer code.
 *
 * The imported runtime graph is synchronous and contains no filesystem,
 * child-process, Node built-in, or network dependency, so a Next.js Worker
 * route may call this function directly.
 */
export function renderArchitecture(
  diagram: ArchifyArchitectureIR,
  options: ArchifyArchitectureRenderOptions = {},
): ArchifyArchitectureRenderResult {
  return renderOfficialArchitecture(diagram, options) as ArchifyArchitectureRenderResult;
}

export function renderArchitectureHtml(
  diagram: ArchifyArchitectureIR,
  options: ArchifyArchitectureRenderOptions = {},
): string {
  return renderArchitecture(diagram, options).html;
}

/** Render typed Sequence JSON IR with Archify's official renderer code. */
export function renderSequence(
  diagram: ArchifySequenceIR,
  options: ArchifyArchitectureRenderOptions = {},
): ArchifySequenceRenderResult {
  return renderOfficialSequence(diagram, options) as ArchifySequenceRenderResult;
}

export function renderSequenceHtml(
  diagram: ArchifySequenceIR,
  options: ArchifyArchitectureRenderOptions = {},
): string {
  return renderSequence(diagram, options).html;
}

/** Dispatch the runtime-supported IR produced by the Mermaid adapter. */
export function renderArchifyRuntimeHtml(
  diagram: ArchifyRuntimeIR,
  options: ArchifyArchitectureRenderOptions = {},
): string {
  switch (diagram.diagram_type) {
    case "architecture":
      return renderArchitectureHtml(diagram, options);
    case "sequence":
      return renderSequenceHtml(diagram, options);
  }
}
