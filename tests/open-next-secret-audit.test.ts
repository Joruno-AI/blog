import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const auditScript = readFileSync("scripts/assert-safe-next-env.mjs", "utf8");
const workflow = readFileSync(".github/workflows/deploy.yml", "utf8");
const manifest = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts: Record<string, string>;
};

function runAudit(cwd: string, args: string[] = [], env: Record<string, string> = {}) {
  const childEnv: NodeJS.ProcessEnv = {
    ...env,
    NODE_ENV: "test",
  };
  if (process.env.PATH) childEnv.PATH = process.env.PATH;
  return spawnSync(process.execPath, [join(process.cwd(), "scripts/assert-safe-next-env.mjs"), ...args], {
    cwd,
    encoding: "utf8",
    env: { ...childEnv, ...env },
  });
}

test("OpenNext audit rejects private .env keys without logging their values", () => {
  const cwd = mkdtempSync(join(tmpdir(), "open-next-env-audit-"));
  const secret = "test-private-value-that-must-not-be-logged";
  writeFileSync(join(cwd, ".env"), `GITHUB_TOKEN=${secret}\nNEXT_PUBLIC_BETTER_AUTH_URL=https://public.example\n`);
  const result = runAudit(cwd);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /\.env contains non-public keys: GITHUB_TOKEN/);
  assert.doesNotMatch(`${result.stdout}${result.stderr}`, new RegExp(secret));
});

test("OpenNext audit scans generated env modules and the dry-run Worker bundle", () => {
  const cwd = mkdtempSync(join(tmpdir(), "open-next-bundle-audit-"));
  const generated = join(cwd, ".open-next", "cloudflare");
  const server = join(cwd, ".open-next", "server-functions", "default");
  const bundle = join(cwd, "custom-worker.js");
  const secret = "known-secret-value-for-bundle-audit";
  mkdirSync(generated, { recursive: true });
  mkdirSync(server, { recursive: true });
  writeFileSync(join(generated, "next-env.mjs"), "export const production = {};\n");
  writeFileSync(join(server, ".env"), "");
  writeFileSync(bundle, `export const accidental = ${JSON.stringify(secret)};\n`);

  const result = runAudit(cwd, ["--generated", "--bundle", bundle], {
    SCAN_SECRET_FIXTURE: secret,
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /custom-worker\.js contains private value from process:SCAN_SECRET_FIXTURE/);
  assert.doesNotMatch(`${result.stdout}${result.stderr}`, new RegExp(secret));
});

test("OpenNext audit accepts a clean generated environment and bundle", () => {
  const cwd = mkdtempSync(join(tmpdir(), "open-next-clean-audit-"));
  const generated = join(cwd, ".open-next", "cloudflare");
  const bundle = join(cwd, "custom-worker.js");
  mkdirSync(generated, { recursive: true });
  writeFileSync(
    join(generated, "next-env.mjs"),
    'export const production = {"NEXT_PUBLIC_BETTER_AUTH_URL":"https://public.example"};\n',
  );
  writeFileSync(bundle, "export default { fetch() { return new Response('ok'); } };\n");

  const result = runAudit(cwd, ["--generated", "--bundle", bundle]);
  assert.equal(result.status, 0, result.stderr);
});

test("OpenNext audit rejects inherited private process keys before build", () => {
  const cwd = mkdtempSync(join(tmpdir(), "open-next-process-audit-"));
  const secret = "private-process-value-that-must-not-be-logged";
  const result = runAudit(cwd, [], { BETTER_AUTH_SECRET: secret });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /private process environment keys would be inherited by the build: BETTER_AUTH_SECRET/);
  assert.doesNotMatch(`${result.stdout}${result.stderr}`, new RegExp(secret));
});

test("deployment scripts fail closed before build and before upload", () => {
  assert.equal(manifest.scripts["cloudflare:build"], "node scripts/build-cloudflare.mjs");
  assert.equal(manifest.scripts["cloudflare:deploy"], "node scripts/deploy-cloudflare.mjs");
  assert.match(workflow, /Produce auditable production bundle[\s\S]*wrangler deploy --dry-run/);
  assert.match(workflow, /Verify bundled Worker contains no known secrets[\s\S]*--bundle \.open-next\/deploy-audit\/custom-worker\.js/);

  const buildBlock = workflow.slice(
    workflow.indexOf("- name: Build Cloudflare Worker with OpenNext"),
    workflow.indexOf("- name: Produce auditable production bundle"),
  );
  assert.doesNotMatch(buildBlock, /BETTER_AUTH_SECRET|secrets\.|CRON_SECRET|GITHUB_TOKEN|CLOUDFLARE_API_TOKEN/);
  assert.match(auditScript, /HIGH_RISK_VALUE_PATTERNS/);
  assert.match(auditScript, /OpenNext environment audit failed/);

  const buildScript = readFileSync("scripts/build-cloudflare.mjs", "utf8");
  assert.match(buildScript, /PRIVATE_KEY_NAME/);
  assert.match(buildScript, /sanitizedBuildEnv/);
  assert.match(buildScript, /opennextjs-cloudflare[\s\S]*build/);
  assert.match(buildScript, /assert-safe-next-env\.mjs[\s\S]*--generated/);

  const deployScript = readFileSync("scripts/deploy-cloudflare.mjs", "utf8");
  assert.match(deployScript, /wrangler[\s\S]*deploy[\s\S]*--dry-run[\s\S]*--outdir/);
  assert.match(deployScript, /assert-safe-next-env\.mjs[\s\S]*--bundle/);
  assert.match(deployScript, /opennextjs-cloudflare[\s\S]*deploy/);
});
