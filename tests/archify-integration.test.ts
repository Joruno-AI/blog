import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  ARCHIFY_DIAGRAM_TYPES,
  ARCHIFY_UPSTREAM_COMMIT,
  ARCHIFY_UPSTREAM_VERSION,
  archifyArtifactHash,
  compileArchifyArtifact,
} from "../scripts/lib/archify-compiler.mjs";
import { generateArchifyArtifacts } from "../scripts/generate-archify-artifacts.mjs";

const root = process.cwd();
const vendorRoot = join(root, "vendor/archify");
const architectureExamplePath = join(vendorRoot, "examples/web-app.architecture.json");
const examplesByType = {
  architecture: "web-app.architecture.json",
  workflow: "agent-tool-call.workflow.json",
  sequence: "cache-miss-request.sequence.json",
  dataflow: "product-analytics.dataflow.json",
  lifecycle: "agent-run.lifecycle.json",
} as const;

function readArchitectureExample() {
  return JSON.parse(readFileSync(architectureExamplePath, "utf8")) as Record<string, unknown>;
}

function snapshotDirectory(directory: string) {
  return readdirSync(directory)
    .sort()
    .map((name) => {
      const path = join(directory, name);
      const stat = statSync(path, { bigint: true });
      return {
        name,
        contents: readFileSync(path, "utf8"),
        inode: stat.ino.toString(),
        modified: stat.mtimeNs.toString(),
      };
    });
}

test("pins the real Archify runtime and exposes every upstream diagram type", () => {
  assert.equal(ARCHIFY_UPSTREAM_COMMIT, "f58298be408d62385407ca26bc5a7b612f68be2b");
  assert.equal(ARCHIFY_UPSTREAM_VERSION, "2.16.0-dev.0");
  assert.deepEqual(ARCHIFY_DIAGRAM_TYPES, [
    "architecture",
    "workflow",
    "sequence",
    "dataflow",
    "lifecycle",
  ]);

  const upstream = readFileSync(join(vendorRoot, "UPSTREAM.md"), "utf8");
  const packageJson = JSON.parse(readFileSync(join(vendorRoot, "package.json"), "utf8")) as {
    version: string;
    license: string;
  };
  assert.match(upstream, new RegExp(ARCHIFY_UPSTREAM_COMMIT));
  assert.equal(packageJson.version, ARCHIFY_UPSTREAM_VERSION);
  assert.equal(packageJson.license, "MIT");
  assert.equal(existsSync(join(vendorRoot, "LICENSE")), true);

  const doctor = spawnSync(process.execPath, [join(vendorRoot, "bin/archify.mjs"), "doctor"], {
    cwd: vendorRoot,
    encoding: "utf8",
  });
  assert.equal(doctor.status, 0, doctor.stderr);
  for (const type of ARCHIFY_DIAGRAM_TYPES) {
    assert.match(doctor.stdout, new RegExp(`\\[ok\\] ${type} renderer, schema, and example`));
  }
});

test("renders all five Archify types as content-addressed standalone HTML artifacts", () => {
  const temporaryRoot = mkdtempSync(join(tmpdir(), "personal-platform-archify-test-"));
  const outputRoot = join(temporaryRoot, "public/diagrams/archify");
  try {
    const compiled = Object.fromEntries(
      Object.entries(examplesByType).map(([type, fileName]) => {
        const ir = JSON.parse(readFileSync(join(vendorRoot, "examples", fileName), "utf8"));
        const artifact = compileArchifyArtifact({ type, ir, outputRoot, vendorRoot });
        assert.match(artifact.hash, /^[a-f0-9]{64}$/);
        assert.equal(artifact.changed, true);
        assert.equal(readFileSync(artifact.outputPath, "utf8"), artifact.html);
        assert.match(artifact.html, /<!DOCTYPE html>/);
        assert.match(artifact.html, /<meta name="generator" content="archify 2\.16\.0-dev\.0">/);
        assert.match(artifact.html, /<html[^>]+data-theme=/);
        assert.match(artifact.html, /<style>[\s\S]*<\/style>/);
        assert.match(artifact.html, /<script>[\s\S]*Archify[\s\S]*<\/script>/);
        assert.match(artifact.html, /<svg\b[^>]*data-quality-profile=/);
        assert.match(artifact.html, /data-(?:node-id|edge-from)=/);
        return [type, artifact];
      }),
    );

    const first = compiled.architecture;
    const ir = readArchitectureExample();
    const reordered = Object.fromEntries(Object.entries(ir).reverse());
    const firstStat = statSync(first.outputPath, { bigint: true });
    const second = compileArchifyArtifact({
      type: "architecture",
      ir: reordered,
      outputRoot,
      vendorRoot,
    });
    const secondStat = statSync(second.outputPath, { bigint: true });

    assert.match(first.hash, /^[a-f0-9]{64}$/);
    assert.equal(first.hash, archifyArtifactHash("architecture", reordered));
    assert.equal(second.hash, first.hash);
    assert.equal(second.changed, false);
    assert.equal(secondStat.ino, firstStat.ino);
    assert.equal(secondStat.mtimeNs, firstStat.mtimeNs);
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test("checks generated Archify artifacts without touching the output tree", () => {
  const temporaryRoot = mkdtempSync(join(tmpdir(), "personal-platform-archify-check-"));
  const contentRoot = join(temporaryRoot, "content/diagrams");
  const outputRoot = join(temporaryRoot, "public/diagrams/archify");
  try {
    mkdirSync(join(contentRoot, "platform"), { recursive: true });
    writeFileSync(
      join(contentRoot, "platform/request-path.archify.json"),
      `${JSON.stringify(readArchitectureExample(), null, 2)}\n`,
      "utf8",
    );

    const built = generateArchifyArtifacts({ contentRoot, outputRoot, vendorRoot });
    assert.equal(built.inputs, 1);
    assert.equal(built.artifacts, 1);
    assert.equal(built.manifest.artifacts[0].source, "platform/request-path.archify.json");
    assert.equal(built.manifest.artifacts[0].type, "architecture");
    assert.equal(existsSync(join(outputRoot, "manifest.json")), true);
    assert.equal(existsSync(join(outputRoot, `${built.manifest.artifacts[0].sha256}.html`)), true);

    const before = snapshotDirectory(outputRoot);
    const checked = generateArchifyArtifacts({ check: true, contentRoot, outputRoot, vendorRoot });
    const after = snapshotDirectory(outputRoot);
    assert.equal(checked.changed, 0);
    assert.deepEqual(after, before);
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});
