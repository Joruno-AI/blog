/**
 * Normalize ZRead Mermaid source before hashing. This keeps build-time manifest
 * keys and browser lookups identical while preserving the authored topology.
 *
 * @param {string} source
 */
export function normalizeArchifyMermaidSource(source) {
  let normalized = String(source)
    .replace(/\r\n?/g, "\n")
    .replace(/^(\s*)\[([A-Za-z_][\w.-]*)\]\s*--\s*"([^"\n]+)"\s*$/gm, "$1$2[\"$3\"]")
    .replace(/(^|[ \t])\[([A-Za-z_][\w.-]*)\](?=[ \t]*(?:--|-.->|==>|~~~))/gm, "$1$2")
    .replace(/((?:-->|---|-.->|==>|~~~)(?:\|[^|\n]*\|)?[ \t]*)\[([A-Za-z_][\w.-]*)\]/g, "$1$2");

  const identifiers = new Map();
  let sequence = 0;
  const resolveIdentifier = (label) => {
    const existing = identifiers.get(label);
    if (existing) return existing;
    const identifier = `node_${sequence++}`;
    identifiers.set(label, identifier);
    return identifier;
  };
  normalized = normalized.replace(/(^|[ \t>])\[\s*"([^"\n]+)"\s*\]/gm, (_, prefix, label) => `${prefix}${resolveIdentifier(label)}["${label}"]`);
  normalized = normalized.replace(/"([^"\n]+)"(?=[ \t]*(?:\[|\(|\{))/g, (_, label) => resolveIdentifier(label));
  for (const [label, identifier] of identifiers) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    normalized = normalized
      .replace(new RegExp(`"${escaped}"(?=[ \\t]*(?:-->|---|-.->|==>|~~~))`, "g"), identifier)
      .replace(new RegExp(`((?:-->|---|-.->|==>|~~~)(?:\\|[^|]*\\|)?[ \\t]*)"${escaped}"`, "g"), `$1${identifier}`);
  }
  return normalized.trim();
}
