import { readFile, readdir, stat } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { gzipSync } from "node:zlib";

const projectRoot = process.cwd();
const openNextRoot = join(projectRoot, ".open-next");
const MAX_WORKER_GZIP_BYTES = 3 * 1024 * 1024;
const PUBLIC_EMBEDDED_KEYS = new Set([
  "BETTER_AUTH_URL",
  "NEXT_PUBLIC_BETTER_AUTH_URL",
  "NEXTJS_ENV",
  "R2_PUBLIC_URL",
]);
const PRIVATE_KEY_NAME = /(?:^|_)(?:API_KEY|AUTH_TOKEN|ACCESS_KEY(?:_ID)?|CREDENTIALS?|DATABASE_URL|HP_KEY|PASSWORD|PRIVATE_KEY|SECRET|TOKEN)(?:_|$)/i;
const HIGH_RISK_VALUE_PATTERNS = [
  ["private-key", /-----BEGIN (?:EC |OPENSSH |RSA )?PRIVATE KEY-----/],
  ["github-token", /\b(?:gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/],
  ["jwt", /\beyJ[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}\b/],
  ["provider-key", /\b(?:hp_[0-9a-f]{12,}|sk-or-v1-[A-Za-z0-9_-]{20,}|ss_mcp_[A-Za-z0-9_-]{12,})\b/],
];

function parseArguments(argv) {
  const options = { generated: false, bundles: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--") continue;
    if (argument === "--generated") options.generated = true;
    else if (argument === "--bundle") {
      const path = argv[index + 1];
      if (!path) throw new Error("--bundle requires a generated Worker path.");
      options.bundles.push(resolve(projectRoot, path));
      options.generated = true;
      index += 1;
    } else {
      throw new Error("Unknown environment-audit argument.");
    }
  }
  return options;
}

function parseEnv(text) {
  const values = new Map();
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    let value = match[2];
    if (
      value.length >= 2
      && ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1);
    }
    values.set(match[1], value);
  }
  return values;
}

async function existingEnvFiles() {
  const entries = await readdir(projectRoot, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && /^\.env(?:\.|$)/.test(entry.name) && entry.name !== ".env.example")
    .map((entry) => join(projectRoot, entry.name))
    .sort();
}

function privateValuesFromEnvironment(values, source, privateValues) {
  for (const [key, value] of values) {
    if (!value || value.length < 8) continue;
    if (key.startsWith("SCAN_SECRET_") || PRIVATE_KEY_NAME.test(key)) {
      privateValues.set(`${source}:${key}`, value);
    }
  }
}

async function collectPrivateValues(envFiles) {
  const values = new Map();
  privateValuesFromEnvironment(Object.entries(process.env), "process", values);
  const developmentVars = join(projectRoot, ".dev.vars");
  const developmentVarsInfo = await stat(developmentVars).catch(() => null);
  if (developmentVarsInfo?.isFile()) {
    privateValuesFromEnvironment(parseEnv(await readFile(developmentVars, "utf8")), ".dev.vars", values);
  }
  for (const file of envFiles) {
    privateValuesFromEnvironment(parseEnv(await readFile(file, "utf8")), relative(projectRoot, file), values);
  }
  return values;
}

async function regularFiles(root) {
  const rootInfo = await stat(root).catch(() => null);
  if (!rootInfo) return [];
  if (rootInfo.isFile()) return [root];
  const files = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) files.push(...await regularFiles(path));
    else if (entry.isFile()) files.push(path);
  }
  return files;
}

function embeddedKeysFromNextEnv(text) {
  return [...text.matchAll(/[,{]\s*"([A-Za-z_][A-Za-z0-9_]*)"\s*:/g)].map((match) => match[1]);
}

async function inspectGeneratedEnv(path, findings) {
  const info = await stat(path).catch(() => null);
  if (!info?.isFile()) {
    findings.push(`missing generated environment artifact: ${relative(projectRoot, path)}`);
    return;
  }
  const text = await readFile(path, "utf8");
  const keys = path.endsWith("next-env.mjs")
    ? embeddedKeysFromNextEnv(text)
    : [...parseEnv(text).keys()];
  const privateKeys = [...new Set(keys.filter((key) => !PUBLIC_EMBEDDED_KEYS.has(key)))].sort();
  if (privateKeys.length) {
    findings.push(
      `${relative(projectRoot, path)} embeds non-public environment keys: ${privateKeys.join(", ")}`,
    );
  }
}

async function inspectArtifact(path, privateValues, findings, scanPatterns) {
  const info = await stat(path).catch(() => null);
  if (!info?.isFile()) {
    findings.push(`missing generated bundle artifact: ${relative(projectRoot, path)}`);
    return;
  }
  if (info.size > 128 * 1024 * 1024) {
    findings.push(`generated artifact is too large to audit: ${relative(projectRoot, path)}`);
    return;
  }
  const content = await readFile(path);
  for (const [label, value] of privateValues) {
    if (content.includes(Buffer.from(value))) {
      findings.push(`${relative(projectRoot, path)} contains private value from ${label}`);
    }
  }
  if (scanPatterns) {
    const text = content.toString("utf8");
    for (const [label, pattern] of HIGH_RISK_VALUE_PATTERNS) {
      if (pattern.test(text)) findings.push(`${relative(projectRoot, path)} contains a ${label} signature`);
    }
  }
}

async function inspectWorkerSize(path, findings) {
  const info = await stat(path).catch(() => null);
  if (!info?.isFile()) return;
  const gzipBytes = gzipSync(await readFile(path), { level: 9 }).byteLength;
  if (gzipBytes > MAX_WORKER_GZIP_BYTES) {
    findings.push(
      `${relative(projectRoot, path)} exceeds the 3 MiB compressed Worker release gate`,
    );
  }
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const envFiles = await existingEnvFiles();
  const privateValues = await collectPrivateValues(envFiles);
  const findings = [];

  if (!options.generated) {
    const inheritedPrivateKeys = Object.entries(process.env)
      .filter(([key, value]) => value && !key.startsWith("SCAN_SECRET_") && PRIVATE_KEY_NAME.test(key))
      .map(([key]) => key)
      .sort();
    if (inheritedPrivateKeys.length) {
      findings.push(
        `private process environment keys would be inherited by the build: ${inheritedPrivateKeys.join(", ")}`,
      );
    }
  }

  for (const file of envFiles) {
    const keys = [...parseEnv(await readFile(file, "utf8")).keys()];
    const unsafe = keys.filter((key) => !PUBLIC_EMBEDDED_KEYS.has(key));
    if (unsafe.length) {
      findings.push(`${relative(projectRoot, file)} contains non-public keys: ${unsafe.sort().join(", ")}`);
    }
  }

  if (options.generated) {
    const nextEnv = join(openNextRoot, "cloudflare", "next-env.mjs");
    await inspectGeneratedEnv(nextEnv, findings);

    const standaloneRoot = join(openNextRoot, "server-functions", "default");
    const standaloneEntries = await readdir(standaloneRoot, { withFileTypes: true }).catch(() => []);
    for (const entry of standaloneEntries) {
      if (entry.isFile() && /^\.env(?:\.|$)/.test(entry.name)) {
        await inspectGeneratedEnv(join(standaloneRoot, entry.name), findings);
      }
    }

    const generatedFiles = await regularFiles(openNextRoot);
    for (const path of generatedFiles) {
      await inspectArtifact(path, privateValues, findings, false);
    }
    for (const bundle of options.bundles) {
      await inspectArtifact(bundle, privateValues, findings, true);
      await inspectWorkerSize(bundle, findings);
      const sourceMap = `${bundle}.map`;
      if (await stat(sourceMap).catch(() => null)) {
        await inspectArtifact(sourceMap, privateValues, findings, true);
      }
    }
  }

  if (findings.length) {
    for (const finding of [...new Set(findings)]) console.error(`ENV_AUDIT: ${finding}`);
    throw new Error("OpenNext environment audit failed; generated artifacts were not approved for deployment.");
  }
  console.log(options.generated
    ? "OpenNext environment audit passed for generated artifacts."
    : "OpenNext environment audit passed before build.");
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message.replace(/(?:gh[pousr]_|github_pat_|hp_|sk-or-v1-|ss_mcp_)[A-Za-z0-9_-]+/g, "[REDACTED]"));
  process.exitCode = 1;
});
