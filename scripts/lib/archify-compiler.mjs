import { spawnSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  ARCHIFY_DIAGRAM_TYPES,
  ARCHIFY_UPSTREAM_COMMIT,
  ARCHIFY_UPSTREAM_VERSION,
  archifyArtifactHashInput,
  assertArchifyType,
  canonicalArchifyJson,
} from "../../lib/archify/artifact-address.mjs";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));

export {
  ARCHIFY_DIAGRAM_TYPES,
  ARCHIFY_UPSTREAM_COMMIT,
  ARCHIFY_UPSTREAM_VERSION,
  assertArchifyType,
  canonicalArchifyJson,
};

export const DEFAULT_ARCHIFY_VENDOR_ROOT = resolve(scriptDirectory, "../../vendor/archify");
export const DEFAULT_ARCHIFY_OUTPUT_ROOT = resolve(scriptDirectory, "../../public/diagrams/archify");

export function archifyArtifactHash(type, ir) {
  return createHash("sha256")
    .update(archifyArtifactHashInput(type, ir), "utf8")
    .digest("hex");
}

function runArchifyCli(vendorRoot, args, stage) {
  const cliPath = join(vendorRoot, "bin/archify.mjs");
  if (!existsSync(cliPath)) {
    throw new Error(`Vendored Archify CLI is missing at ${cliPath}.`);
  }

  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: vendorRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      ARCHIFY_BRAND_ALLOW_PRIVATE: "0",
    },
    maxBuffer: 32 * 1024 * 1024,
  });

  if (result.error) {
    throw new Error(`Archify ${stage} process did not start: ${result.error.message}`);
  }
  if (result.status !== 0) {
    const detail = [result.stderr, result.stdout]
      .map((value) => value?.trim())
      .filter(Boolean)
      .join("\n");
    throw new Error(`Archify ${stage} failed${detail ? `:\n${detail}` : "."}`);
  }

  return result.stdout.trim();
}

function assertStandaloneArchifyHtml(html) {
  const checks = [
    [/<\!DOCTYPE html>/i, "HTML document declaration"],
    [/<meta name="generator" content="archify [^"]+">/i, "Archify generator marker"],
    [/<style>[\s\S]*<\/style>/i, "embedded styles"],
    [/<script>[\s\S]*<\/script>/i, "embedded viewer runtime"],
    [/<svg\b[\s\S]*<\/svg>/i, "diagram SVG"],
    [/data-(?:node-id|edge-from|component|lane|state-id)=/i, "semantic data attributes"],
  ];
  const missing = checks.filter(([pattern]) => !pattern.test(html)).map(([, label]) => label);
  if (missing.length) {
    throw new Error(`Archify rendered an incomplete standalone artifact; missing ${missing.join(", ")}.`);
  }
}

function atomicWriteFile(path, contents) {
  mkdirSync(dirname(path), { recursive: true });
  if (existsSync(path) && readFileSync(path, "utf8") === contents) return false;

  const candidate = join(
    dirname(path),
    `.${path.split(/[\\/]/).at(-1)}.${process.pid}.${randomBytes(6).toString("hex")}.tmp`,
  );
  try {
    writeFileSync(candidate, contents, { encoding: "utf8", flag: "wx" });
    renameSync(candidate, path);
  } finally {
    rmSync(candidate, { force: true });
  }
  return true;
}

/**
 * Validate and render one typed Archify JSON IR document with the pinned
 * upstream CLI. `write: false` performs the full compilation in a temporary
 * directory and leaves the public output tree untouched.
 */
export function compileArchifyArtifact({
  type,
  ir,
  outputRoot = DEFAULT_ARCHIFY_OUTPUT_ROOT,
  vendorRoot = DEFAULT_ARCHIFY_VENDOR_ROOT,
  write = true,
}) {
  assertArchifyType(type);
  if (!ir || typeof ir !== "object" || Array.isArray(ir)) {
    throw new TypeError("Archify IR must be a parsed JSON object.");
  }
  if (ir.diagram_type !== type) {
    throw new TypeError(
      `Archify IR diagram_type ${JSON.stringify(ir.diagram_type)} does not match requested type ${JSON.stringify(type)}.`,
    );
  }

  const canonicalIr = canonicalArchifyJson(ir);
  const hash = archifyArtifactHash(type, ir);
  const fileName = `${hash}.html`;
  const outputPath = join(outputRoot, fileName);
  const temporaryRoot = mkdtempSync(join(tmpdir(), "personal-platform-archify-"));
  const inputPath = join(temporaryRoot, `${hash}.json`);
  const renderedPath = join(temporaryRoot, `${hash}.html`);

  try {
    writeFileSync(inputPath, `${canonicalIr}\n`, "utf8");
    runArchifyCli(vendorRoot, ["validate", type, inputPath, "--json"], "validation");
    runArchifyCli(vendorRoot, ["render", type, inputPath, renderedPath], "render");
    const html = readFileSync(renderedPath, "utf8");
    assertStandaloneArchifyHtml(html);
    const changed = write ? atomicWriteFile(outputPath, html) : false;

    return {
      type,
      hash,
      fileName,
      outputPath,
      publicPath: `/diagrams/archify/${fileName}`,
      html,
      changed,
      renderer: {
        name: "Archify",
        version: ARCHIFY_UPSTREAM_VERSION,
        commit: ARCHIFY_UPSTREAM_COMMIT,
      },
    };
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
}
