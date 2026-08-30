import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workflow = readFileSync(".github/workflows/deploy.yml", "utf8");
const installer = readFileSync("scripts/install-heroui-pro.mjs", "utf8");
const manifest = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts: Record<string, string>;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
};

test("production workflow completes static gates before applying remote D1 migrations", () => {
  const heroUi = workflow.indexOf("run: pnpm heroui:install:ci");
  const staticGates = workflow.indexOf("- name: Lint, typecheck and test");
  const migrate = workflow.indexOf("- name: Apply D1 migrations");
  const verify = workflow.indexOf("- name: Verify migrated D1 data");
  const projection = workflow.indexOf("- name: Generate public projection from remote D1");
  const build = workflow.indexOf("- name: Build Cloudflare Worker with OpenNext");

  assert.ok(heroUi > 0);
  assert.ok(heroUi < staticGates);
  assert.ok(staticGates < migrate);
  assert.ok(migrate < verify);
  assert.ok(verify < projection);
  assert.ok(projection < build);
});

test("HeroUI Pro CI materialization stays version and artifact pinned", () => {
  assert.equal(manifest.dependencies["@heroui-pro/react"], "1.0.0-beta.8");
  assert.equal(manifest.devDependencies.hpsetup, "4.7.1");
  assert.equal(manifest.scripts["heroui:install:ci"], "node scripts/install-heroui-pro.mjs");
  assert.equal(manifest.scripts["heroui:verify"], "node scripts/install-heroui-pro.mjs --check");

  assert.match(installer, /EXPECTED_PRODUCT_VERSION = "1\.0\.0-beta\.8"/);
  assert.match(installer, /EXPECTED_SETUP_VERSION = "4\.7\.1"/);
  assert.match(installer, /EXPECTED_DIST_SHA256 = "[0-9a-f]{64}"/);
  assert.match(installer, /downloadFromProxy/);
  assert.match(installer, /HeroUI Pro setup changed package\.json or pnpm-lock\.yaml/);
  assert.match(installer, /message\.replace\(KEY_REDACTION_PATTERN, "\[REDACTED\]"\)/);
  assert.doesNotMatch(installer, /console\.(?:log|error)\([^\n]*\bkey\b/i);
  assert.doesNotMatch(installer, /@latest|\blatest\b/);
  assert.doesNotMatch(workflow, /pnpm exec hpsetup|hpsetup@latest/);
});
