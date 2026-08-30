export const ARCHIFY_UPSTREAM_COMMIT = "f58298be408d62385407ca26bc5a7b612f68be2b";
export const ARCHIFY_UPSTREAM_VERSION = "2.16.0-dev.0";
export const ARCHIFY_DIAGRAM_TYPES = Object.freeze([
  "architecture",
  "workflow",
  "sequence",
  "dataflow",
  "lifecycle",
]);

const diagramTypes = new Set(ARCHIFY_DIAGRAM_TYPES);

function sortedJsonValue(value) {
  if (Array.isArray(value)) return value.map(sortedJsonValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, sortedJsonValue(value[key])]),
    );
  }
  return value;
}

/** @param {unknown} ir */
export function canonicalArchifyJson(ir) {
  let normalized;
  try {
    const serialized = JSON.stringify(ir);
    if (serialized === undefined) throw new TypeError("value is not JSON serializable");
    normalized = JSON.parse(serialized);
  } catch (error) {
    throw new TypeError(`Archify IR must be JSON serializable: ${error.message}`);
  }
  return JSON.stringify(sortedJsonValue(normalized));
}

/** @param {string} type */
export function assertArchifyType(type) {
  if (!diagramTypes.has(type)) {
    throw new TypeError(
      `Unknown Archify diagram type ${JSON.stringify(type)}. Expected one of: ${ARCHIFY_DIAGRAM_TYPES.join(", ")}.`,
    );
  }
}

/** @param {string} type @param {unknown} ir */
export function archifyArtifactHashInput(type, ir) {
  assertArchifyType(type);
  return `archify\0${ARCHIFY_UPSTREAM_COMMIT}\0${type}\0${canonicalArchifyJson(ir)}`;
}

/** @param {string} value */
export async function sha256Hex(value) {
  if (!globalThis.crypto?.subtle) throw new Error("Web Crypto SHA-256 is unavailable.");
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** @param {string} type @param {unknown} ir */
export function archifyArtifactHashInBrowser(type, ir) {
  return sha256Hex(archifyArtifactHashInput(type, ir));
}
