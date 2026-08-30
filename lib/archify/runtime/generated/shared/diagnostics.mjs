// Worker-safe adapter for Archify's renderer diagnostics.
// Upstream: tt-a1i/archify@f58298be408d62385407ca26bc5a7b612f68be2b
// Source: archify/renderers/shared/diagnostics.mjs (MIT)

function plainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined));
}

function normalizedDiagnostic(diagnostic) {
  const message = String(diagnostic?.message || "Archify could not classify this failure.").trim();
  return {
    code: String(diagnostic?.code || "internal/unclassified"),
    severity: diagnostic?.severity === "warning" ? "warning" : "error",
    message,
    subject: plainObject(diagnostic?.subject),
    evidence: plainObject(diagnostic?.evidence),
    supportedFixes: Array.isArray(diagnostic?.supportedFixes)
      ? [...new Set(diagnostic.supportedFixes.map((fix) => String(fix).trim()).filter(Boolean))]
      : [],
    ...(Array.isArray(diagnostic?.suppresses)
      ? {
          suppresses: [
            ...new Set(diagnostic.suppresses.map((code) => String(code).trim()).filter(Boolean)),
          ],
        }
      : {}),
  };
}

// The upstream CLI records diagnostics only when its JSON diagnostic process
// mode is enabled. A pure renderer has no process channel, so this hook stays
// intentionally side-effect free while preserving the geometry call sites.
export function recordDiagnostic() {}

export function withDiagnosticRecordingSuppressed(callback) {
  return callback();
}

export function throwDiagnosticError(message, diagnostics) {
  const error = new Error(message);
  error.archifyDiagnostics = (diagnostics || []).map(normalizedDiagnostic);
  throw error;
}

export function throwDiagnosticProblems(
  prefix,
  problems,
  { code = "layout/constraint", subject = {} } = {},
) {
  const messages = (problems || []).map((problem) => String(problem));
  const diagnostics = messages.map((message) =>
    normalizedDiagnostic({
      code,
      severity: "error",
      message,
      subject,
      evidence: {},
      supportedFixes: [],
    }),
  );
  throwDiagnosticError(`${prefix}:\n- ${messages.join("\n- ")}`, diagnostics);
}
