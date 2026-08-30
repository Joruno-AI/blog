/**
 * Node build compatibility entry for the browser/Worker-safe converter.
 * Keep all parsing and IR authoring in lib/archify so live ZRead Markdown and
 * the static artifact pipeline share the exact same supported Mermaid subset.
 */
export {
  mermaidFlowchartToArchify,
  mermaidSequenceToArchify,
  mermaidToArchify,
} from "../../lib/archify/mermaid-to-archify.mjs";
