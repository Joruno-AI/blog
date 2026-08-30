import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";

import { verifyArchifyBuildAssets } from "../scripts/build-cloudflare.mjs";
import { verifyZReadCache } from "../scripts/lib/verify-zread-cache.mjs";

function writeJson(file: string, value: unknown) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(value)}\n`);
}

test("Cloudflare build integrity checks every artifact declared by both Archify manifests", () => {
  const temporaryRoot = mkdtempSync(join(tmpdir(), "archify-build-assets-"));
  const assetsRoot = join(temporaryRoot, ".open-next/assets");
  const publicRoot = join(temporaryRoot, "public");
  const builtDiagrams = join(assetsRoot, "diagrams/archify");
  const publicDiagrams = join(publicRoot, "diagrams/archify");
  const genericHash = "a".repeat(64);
  const zreadHash = "b".repeat(64);
  const sourceHash = "c".repeat(64);
  const html = (title: string) => `<!doctype html><meta name="generator" content="archify 2.16.0"><title>${title}</title>`;
  try {
    mkdirSync(builtDiagrams, { recursive: true });
    mkdirSync(publicDiagrams, { recursive: true });
    const genericManifest = {
      schemaVersion: 1,
      artifacts: [{ sha256: genericHash, publicPath: `/diagrams/archify/${genericHash}.html` }],
    };
    const zreadManifest = {
      schemaVersion: 1,
      artifacts: { "fixture/repository": { [sourceHash]: `/diagrams/archify/${zreadHash}.html` } },
      metadata: { "fixture/repository": { [sourceHash]: { artifactSha256: zreadHash } } },
      stats: { generated: 1 },
    };
    writeJson(join(builtDiagrams, "manifest.json"), genericManifest);
    writeJson(join(publicDiagrams, "manifest.json"), genericManifest);
    writeJson(join(assetsRoot, "agent/zread-cache/archify-manifest.json"), zreadManifest);
    writeJson(join(publicRoot, "agent/zread-cache/archify-manifest.json"), zreadManifest);
    for (const [hash, title] of [[genericHash, "generic"], [zreadHash, "zread"]]) {
      writeFileSync(join(builtDiagrams, `${hash}.html`), html(title));
      writeFileSync(join(publicDiagrams, `${hash}.html`), html(title));
    }

    assert.deepEqual(verifyArchifyBuildAssets({ assetsRoot, publicRoot }), {
      generic: 1,
      zread: 1,
      unique: 2,
    });

    writeFileSync(join(builtDiagrams, `${zreadHash}.html`), html("corrupted copy"));
    assert.throws(
      () => verifyArchifyBuildAssets({ assetsRoot, publicRoot }),
      /does not match the generated public file/,
    );
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test("ZRead cache check validates present payloads and only strict mode requires full selected coverage", async () => {
  const temporaryRoot = mkdtempSync(join(tmpdir(), "zread-cache-integrity-"));
  const complete = "fixture/complete";
  const partial = "fixture/partial";
  const completeRoot = join(temporaryRoot, ...complete.split("/"));
  const partialRoot = join(temporaryRoot, ...partial.split("/"));
  const overview = { source: "zread", page: "Overview", slug: "1-overview", markdown: "# Overview" };
  try {
    writeJson(join(completeRoot, "structure.json"), {
      source: "zread",
      items: [
        { title: "Overview", slug: "1-overview" },
        { title: "Details", slug: "2-details" },
      ],
    });
    writeJson(join(completeRoot, "overview.json"), overview);
    writeJson(join(completeRoot, "pages/1-overview.json"), overview);

    const manifest = { schemaVersion: 1, source: "zread", pageCoverage: "overview", repositories: [complete] };
    const result = await verifyZReadCache({
      cacheRoot: temporaryRoot,
      manifest,
      selectedRepositories: [complete, partial],
    });
    assert.equal(result.declaredRepositories, 1);
    assert.equal(result.verifiedPayloads, 3);

    writeJson(join(completeRoot, "pages/2-details.json"), { source: "zread", markdown: "# Missing metadata" });
    await assert.rejects(
      verifyZReadCache({ cacheRoot: temporaryRoot, manifest, selectedRepositories: [complete, partial] }),
      /invalid page payload.*2-details\.json/,
    );
    rmSync(join(completeRoot, "pages/2-details.json"));

    writeJson(join(partialRoot, "overview.json"), { source: "deepwiki", markdown: "# Wrong source" });
    await assert.rejects(
      verifyZReadCache({ cacheRoot: temporaryRoot, manifest, selectedRepositories: [complete, partial] }),
      /expected a complete source=zread payload/,
    );

    rmSync(partialRoot, { recursive: true, force: true });
    await assert.rejects(
      verifyZReadCache({ cacheRoot: temporaryRoot, manifest, selectedRepositories: [complete], strict: true }),
      /missing declared page.*2-details\.json/,
    );
    await assert.rejects(
      verifyZReadCache({ cacheRoot: temporaryRoot, manifest, selectedRepositories: [complete, partial], strict: true }),
      /selected repository coverage is incomplete: 1 not declared complete \(fixture\/partial\)/,
    );
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test("normal CI validates declared cache snapshots while full upstream coverage remains an explicit strict gate", () => {
  const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as { scripts: Record<string, string> };
  const workflow = readFileSync(".github/workflows/deploy.yml", "utf8");
  const cloudflareBuild = readFileSync("scripts/build-cloudflare.mjs", "utf8");
  assert.equal(packageJson.scripts["data:check:zread-cache"], "node scripts/sync-zread-selected-cache.mjs --check");
  assert.equal(packageJson.scripts["data:check:zread-cache:strict"], "node scripts/sync-zread-selected-cache.mjs --check --strict");
  assert.match(workflow, /Verify declared ZRead cache snapshots[\s\S]*pnpm data:check:zread-cache/);
  assert.match(cloudflareBuild, /\["data:check:zread-cache"\]/);
  assert.doesNotMatch(workflow, /data:check:zread-cache:strict/);
});
