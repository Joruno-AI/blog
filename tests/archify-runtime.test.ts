import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  ARCHIFY_UPSTREAM,
  renderArchitecture,
  renderArchitectureHtml,
  renderSequence,
  type ArchifyArchitectureIR,
  type ArchifySequenceIR,
} from "../lib/archify/runtime";
import { renderMermaidWithArchify } from "../lib/archify/runtime-mermaid";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const fixture: ArchifyArchitectureIR = {
  schema_version: 1,
  diagram_type: "architecture",
  meta: {
    title: "Runtime Example",
    locale: "zh-CN",
  },
  components: [
    {
      id: "client",
      type: "frontend",
      label: "Client",
      pos: [40, 80],
      size: [120, 60],
    },
  ],
  connections: [],
};

const sequenceFixture = JSON.parse(
  fs.readFileSync(path.join(root, "vendor/archify/examples/cache-miss-request.sequence.json"), "utf8"),
) as ArchifySequenceIR;

test("renders the byte-identical official Archify architecture artifact", () => {
  const result = renderArchitecture(fixture);

  assert.equal(
    createHash("sha256").update(result.html).digest("hex"),
    "51787758c324b724422dafba0b72a99c7ee6be464a4da0ef618486a20053ff2c",
  );
  assert.match(result.html, /^<!DOCTYPE html>/);
  assert.match(result.html, /<meta name="generator" content="archify 2\.16\.0-dev\.0">/);
  assert.match(result.html, /data-node-id="client"/);
  assert.match(result.html, /var Archify = \{\};/);
  assert.match(result.svg, /data-node-id="client"/);
  assert.deepEqual(result.layout.viewBox, [200, 208]);
  assert.equal(result.layout.components.length, 1);
});

test("returns deterministic embed-ready self-contained HTML", () => {
  const first = renderArchitecture(fixture, { embed: true });
  const second = renderArchitectureHtml(fixture, { embed: true });

  assert.equal(first.html, second);
  assert.match(first.html, /<html[^>]+data-embed="true">/);
  assert.match(first.html, /<style>[\s\S]+<\/style>/);
  assert.match(first.html, /<script>[\s\S]+<\/script>/);
  assert.doesNotMatch(first.html, /ARCHIFY:SVG_SLOT_(?:START|END)/);
});

test("renders sequence IR with the pinned official Archify runtime", () => {
  const result = renderSequence(sequenceFixture);

  assert.equal(
    createHash("sha256").update(result.html).digest("hex"),
    "c027d67e0e8e3286617897254d9ddb4de04f714ff01231b05f535f9e62d20b82",
  );
  assert.match(result.html, /<meta name="generator" content="archify 2\.16\.0-dev\.0">/);
  assert.match(result.svg, /data-edge-from=/);
  assert.match(result.svg, /data-node-id=/);
});

test("converts live Mermaid misses to official Archify HTML in the pure runtime", () => {
  const architecture = renderMermaidWithArchify(
    "flowchart LR\n  Browser[Browser] --> API[API]\n  API --> DB[(Database)]",
    { title: "Live flow", repository: "owner/repository" },
  );
  assert.equal(architecture.supported, true);
  if (!architecture.supported) return;
  assert.equal(architecture.type, "architecture");
  assert.match(architecture.html, /data-embed="true"/);
  assert.match(architecture.html, /<meta name="generator" content="archify 2\.16\.0-dev\.0">/);
  assert.doesNotMatch(architecture.html, /flowchart LR/);

  const sequence = renderMermaidWithArchify(
    "sequenceDiagram\n  actor Reader\n  participant API\n  Reader->>API: Request docs\n  API-->>Reader: Return page",
    { title: "Live sequence", repository: "owner/repository" },
  );
  assert.equal(sequence.supported, true);
  if (!sequence.supported) return;
  assert.equal(sequence.type, "sequence");
  assert.match(sequence.html, /data-embed="true"/);
  assert.match(sequence.html, /data-edge-from="Reader" data-edge-to="API"/);
  assert.doesNotMatch(sequence.html, /sequenceDiagram/);
});

test("keeps Archify schema validation in the pure runtime", () => {
  const invalid = {
    ...fixture,
    components: [{ id: "bad id", type: "frontend", label: "Broken", pos: [40, 80] }],
  } as unknown as ArchifyArchitectureIR;

  assert.throws(
    () => renderArchitecture(invalid),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /architecture schema validation failed/i);
      assert.ok(Array.isArray((error as Error & { archifyDiagnostics?: unknown[] }).archifyDiagnostics));
      return true;
    },
  );
});

test("runtime import graph contains no Node, filesystem, child-process, or network dependency", () => {
  const runtimeRoot = path.join(root, "lib/archify/runtime/generated");
  const queue = [
    path.join(runtimeRoot, "architecture/render-architecture.mjs"),
    path.join(runtimeRoot, "sequence/render-sequence.mjs"),
    path.join(root, "lib/archify/mermaid-to-archify.mjs"),
  ];
  const visited = new Set<string>();

  while (queue.length) {
    const current = queue.pop();
    assert.ok(current);
    if (visited.has(current)) continue;
    visited.add(current);
    const source = fs.readFileSync(current, "utf8");

    assert.doesNotMatch(source, /(?:from|import\s*\()[\s"']+node:/);
    assert.doesNotMatch(source, /child_process|node:fs|\bfs\.|process\.|fetch\s*\(/);

    for (const match of source.matchAll(/from\s+["'](\.[^"']+)["']/g)) {
      queue.push(path.resolve(path.dirname(current), match[1]));
    }
  }

  assert.ok(visited.size >= 12, "the check should traverse both official renderers and the converter");
  assert.equal(ARCHIFY_UPSTREAM.commit, "f58298be408d62385407ca26bc5a7b612f68be2b");
});
