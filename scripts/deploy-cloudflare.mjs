import { rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const projectRoot = process.cwd();
const auditDirectory = join(projectRoot, ".open-next", "deploy-audit");
const workerBundle = join(auditDirectory, "custom-worker.js");
const forwardedArguments = process.argv.slice(2).filter((argument) => argument !== "--");

if (forwardedArguments.some((argument) => argument === "--dry-run" || argument === "--outdir" || argument.startsWith("--outdir="))) {
  console.error("Deployment wrapper controls --dry-run and --outdir so the audited artifact cannot be replaced.");
  process.exit(1);
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    env: process.env,
    stdio: "inherit",
  });
  if (result.error) {
    console.error(`Deployment gate could not start ${command}.`);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run(process.execPath, ["scripts/assert-safe-next-env.mjs", "--generated"]);
rmSync(auditDirectory, { recursive: true, force: true });
run("pnpm", [
  "exec",
  "wrangler",
  "deploy",
  ...forwardedArguments,
  "--dry-run",
  "--outdir",
  auditDirectory,
]);
run(process.execPath, [
  "scripts/assert-safe-next-env.mjs",
  "--generated",
  "--bundle",
  workerBundle,
]);
run("pnpm", ["exec", "opennextjs-cloudflare", "deploy", ...forwardedArguments]);
