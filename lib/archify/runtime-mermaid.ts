import { mermaidToArchify as convertMermaidToArchify } from "./mermaid-to-archify.mjs";
import {
  renderArchifyRuntimeHtml,
  type ArchifyRuntimeIR,
} from "./runtime";

export type MermaidArchifyRuntimeResult =
  | {
      supported: true;
      type: ArchifyRuntimeIR["diagram_type"];
      ir: ArchifyRuntimeIR;
      html: string;
    }
  | {
      supported: false;
      reason: string;
      detail?: string;
    };

/**
 * Convert the conservative Mermaid subset to typed Archify IR and render it
 * with the pinned official renderer. This entire import graph is browser and
 * Worker compatible; it performs no filesystem, process, or network access.
 */
export function renderMermaidWithArchify(
  source: string,
  options: { title?: string; repository?: string } = {},
): MermaidArchifyRuntimeResult {
  const converted = convertMermaidToArchify(source, options) as
    | { supported: true; type: ArchifyRuntimeIR["diagram_type"]; ir: ArchifyRuntimeIR }
    | { supported: false; reason: string; detail?: string };

  if (!converted.supported) return converted;
  return {
    ...converted,
    html: renderArchifyRuntimeHtml(converted.ir, { embed: true }),
  };
}
