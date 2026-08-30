import { spawnSync } from "node:child_process";

const PRIVATE_KEY_NAME = /(?:^|_)(?:API_KEY|AUTH_TOKEN|ACCESS_KEY(?:_ID)?|CREDENTIALS?|DATABASE_URL|HP_KEY|PASSWORD|PRIVATE_KEY|SECRET|TOKEN)(?:_|$)/i;
const projectRoot = process.cwd();
const forwardedArguments = process.argv.slice(2).filter((argument) => argument !== "--");
const sanitizedBuildEnv = Object.fromEntries(
  Object.entries(process.env).filter(([key]) => !key.startsWith("SCAN_SECRET_") && !PRIVATE_KEY_NAME.test(key)),
);

function run(command, args, env) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    env,
    stdio: "inherit",
  });
  if (result.error) {
    console.error(`Build gate could not start ${command}.`);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
}

// Validate disk-based env files in the same sanitized environment inherited by
// Next.js, then scan the finished output with the original private values known
// only to the auditor (never to the compiler).
run(process.execPath, ["scripts/assert-safe-next-env.mjs"], sanitizedBuildEnv);
run("pnpm", ["exec", "opennextjs-cloudflare", "build", ...forwardedArguments], sanitizedBuildEnv);
run(process.execPath, ["scripts/assert-safe-next-env.mjs", "--generated"], process.env);
