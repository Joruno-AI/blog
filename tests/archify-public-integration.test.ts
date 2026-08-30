import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { normalizeArchifyMermaidSource } from "../lib/archify/mermaid-source.mjs";
import { extractZReadMermaidDocuments, generateZReadArchifyArtifacts } from "../scripts/generate-zread-archify-artifacts.mjs";
import { mermaidFlowchartToArchify, mermaidToArchify } from "../scripts/lib/mermaid-to-archify.mjs";

const root = process.cwd();
const zreadManifestPath = join(root, "public/agent/zread-cache/archify-manifest.json");

function artifactPaths(value: unknown, result: string[] = []) {
  if (typeof value === "string" && /^\/diagrams\/archify\/[a-f0-9]{64}\.html$/.test(value)) result.push(value);
  else if (Array.isArray(value)) value.forEach((item) => artifactPaths(item, result));
  else if (value && typeof value === "object") Object.values(value).forEach((item) => artifactPaths(item, result));
  return result;
}

test("authors fresh editorial Archify IR only for Mermaid topology it can support", () => {
  const source = "flowchart LR\n  Browser[Browser UI] --> API[API Worker]\n  API --> DB[(D1 database)]";
  const converted = mermaidFlowchartToArchify(source, { title: "Request path", repository: "fixture/repo" });
  assert.equal(converted.supported, true);
  if (!("ir" in converted)) return;
  assert.equal(converted.type, "architecture");
  assert.equal(converted.ir.diagram_type, "architecture");
  assert.equal(converted.ir.meta.visual_preset, "editorial");
  assert.equal(converted.ir.components.length, 3);
  assert.equal(converted.ir.connections.length, 2);
  assert.equal(normalizeArchifyMermaidSource(`${source}\r\n`), source);

  const sequence = mermaidToArchify("sequenceDiagram\n  actor Alice\n  participant Bob as API\n  Alice->>Bob: hello\n  Bob-->>Alice: accepted", { title: "Handshake" });
  assert.equal(sequence.supported, true);
  assert.ok("ir" in sequence);
  if ("ir" in sequence) {
    assert.equal(sequence.type, "sequence");
    assert.equal(sequence.ir.meta.visual_preset, "editorial");
    assert.ok("messages" in sequence.ir);
    if ("messages" in sequence.ir) {
      assert.equal(sequence.ir.participants.length, 2);
      assert.equal(sequence.ir.messages.length, 2);
      assert.equal(sequence.ir.messages[1].variant, "return");
    }
  }

  const unsupported = mermaidToArchify("sequenceDiagram\n  Alice->>Bob: hello\n  Note over Alice,Bob: not representable losslessly");
  assert.equal(unsupported.supported, false);
  assert.ok("reason" in unsupported && unsupported.reason === "unsupported-sequence-syntax");
});

test("discovers arbitrary JSON documents below each ZRead pages directory", () => {
  const temporaryRoot = mkdtempSync(join(tmpdir(), "personal-platform-zread-pages-"));
  const cacheRoot = join(temporaryRoot, "public/agent/zread-cache");
  const pagesRoot = join(cacheRoot, "fixture", "repository", "pages");
  const outputRoot = join(temporaryRoot, "public/diagrams/archify");
  const mermaid = "flowchart LR\n  Browser[Browser] --> Worker[Worker]";
  try {
    mkdirSync(pagesRoot, { recursive: true });
    writeFileSync(join(pagesRoot, "2-request-path.json"), JSON.stringify({ markdown: `# Request path\n\n\`\`\`mermaid\n${mermaid}\n\`\`\`` }));
    writeFileSync(join(cacheRoot, "fixture", "repository", "structure.json"), JSON.stringify({ markdown: `\`\`\`mermaid\n${mermaid}\n\`\`\`` }));
    const discovered = extractZReadMermaidDocuments({ cacheRoot });
    assert.equal(discovered.length, 1);
    assert.equal(discovered[0].repository, "fixture/repository");
    assert.match(discovered[0].location, /pages\/2-request-path\.json/);

    const result = generateZReadArchifyArtifacts({ cacheRoot, outputRoot });
    assert.equal(result.artifacts, 1);
    assert.equal(result.unsupported, 0);
    assert.equal(existsSync(join(cacheRoot, "archify-manifest.json")), true);
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test("ships real self-contained Archify artifacts for the ZRead cache and check mode is read-only", () => {
  const manifest = JSON.parse(readFileSync(zreadManifestPath, "utf8")) as {
    renderer: { name: string; commit: string };
    artifacts: Record<string, Record<string, string>>;
    stats: { unique: number; generated: number; unsupported: number };
  };
  assert.equal(manifest.renderer.name, "Archify");
  assert.equal(manifest.renderer.commit, "f58298be408d62385407ca26bc5a7b612f68be2b");
  assert.ok(manifest.stats.generated > 0);
  assert.equal(manifest.stats.generated, manifest.stats.unique);
  assert.equal(manifest.stats.unsupported, 0);

  const paths = [...new Set(artifactPaths(manifest.artifacts))];
  assert.equal(paths.length, manifest.stats.generated);
  for (const publicPath of paths) {
    const filePath = join(root, "public", publicPath);
    assert.equal(existsSync(filePath), true, publicPath);
    const html = readFileSync(filePath, "utf8");
    assert.match(html, /<meta name="generator" content="archify 2\.16\.0-dev\.0">/);
    assert.match(html, /data-(?:node-id|edge-from)=/);
    assert.match(html, /new URLSearchParams\(window\.location\.search\)\.get\('embed'\)/);
  }

  const tracked = [zreadManifestPath, ...paths.map((path) => join(root, "public", path))];
  const before = tracked.map((path) => ({ path, mtime: statSync(path, { bigint: true }).mtimeNs }));
  const checked = generateZReadArchifyArtifacts({ check: true });
  const after = tracked.map((path) => ({ path, mtime: statSync(path, { bigint: true }).mtimeNs }));
  assert.equal(checked.changed, 0);
  assert.deepEqual(after, before);
});

test("routes every visible Markdown diagram through an Archify artifact or official runtime", () => {
  const embed = readFileSync(join(root, "components/site/archify-embed.tsx"), "utf8");
  const runtimeEmbed = readFileSync(join(root, "components/site/archify-runtime-mermaid.tsx"), "utf8");
  const agentMarkdown = readFileSync(join(root, "components/site/agent-markdown-impl.tsx"), "utf8");
  const blogMarkdown = readFileSync(join(root, "components/site/markdown-content.tsx"), "utf8");
  const reveal = readFileSync(join(root, "components/site/reveal-controller.tsx"), "utf8");
  const middleware = readFileSync(join(root, "middleware.ts"), "utf8");
  const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as { scripts: Record<string, string> };
  const cloudflareBuild = readFileSync(join(root, "scripts/build-cloudflare.mjs"), "utf8");

  assert.match(embed, /ARCHIFY_ARTIFACT_PATH/);
  assert.match(embed, /\[a-f0-9\]\{64\}/);
  assert.match(embed, /sandbox="allow-scripts"/);
  assert.match(embed, /referrerPolicy="no-referrer"/);
  assert.doesNotMatch(embed, /allow-same-origin/);

  assert.match(agentMarkdown, /ARCHIFY_MANIFEST_URL = "\/agent\/zread-cache\/archify-manifest\.json"/);
  assert.match(agentMarkdown, /<ArchifyEmbed/);
  assert.match(agentMarkdown, /<ArchifyRuntimeMermaid/);
  assert.doesNotMatch(agentMarkdown, /manifest-miss|Archify 产物待同步/);
  assert.doesNotMatch(agentMarkdown, /MERMAID_CDN|cdn\.jsdelivr\.net\/npm\/mermaid|loadMermaid|sanitizeMermaidSvg|agent-mermaid-canvas|<svg/);
  assert.match(runtimeEmbed, /renderMermaidWithArchify/);
  assert.match(runtimeEmbed, /srcDoc=\{state\.html\}/);
  assert.match(runtimeEmbed, /sandbox="allow-scripts"/);
  assert.doesNotMatch(runtimeEmbed, /<pre|language-mermaid|allow-same-origin/);
  assert.match(blogMarkdown, /archify-\(architecture\|workflow\|sequence\|dataflow\|lifecycle\)/);
  assert.match(blogMarkdown, /<ArchifyEmbed/);
  assert.match(blogMarkdown, /BLOG_ARCHIFY_MANIFEST_URL = "\/diagrams\/archify\/manifest\.json"/);
  assert.match(reveal, /\.archify-embed/);

  assert.match(middleware, /_next\/image\|diagrams\(\?:\/\|\$\)/);
  assert.match(middleware, /path === "\/agent\/zread-cache\/archify-manifest\.json"/);
  assert.match(packageJson.scripts.build, /diagrams:build/);
  assert.match(packageJson.scripts["diagrams:build"], /generate-zread-archify-artifacts/);
  assert.match(packageJson.scripts["diagrams:check"], /generate-zread-archify-artifacts\.mjs --check/);
  assert.match(cloudflareBuild, /\["diagrams:build"\]/);
  assert.match(cloudflareBuild, /\.open-next\/assets/);
  assert.match(cloudflareBuild, /Cloudflare build is missing generated Archify assets/);
});
