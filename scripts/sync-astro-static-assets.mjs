#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFile, spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export const DEFAULT_COMMIT = "d1ec7b0";
export const DEFAULT_BINDING = "R2_BUCKET";
export const DEFAULT_CONCURRENCY = 6;
export const DEFAULT_RETRIES = 3;
export const SOURCE_DIRECTORIES = ["img", "music", "docs-assets"];
export const LEGACY_CACHE_CONTROL = "public, max-age=14400, must-revalidate";

const PROJECT_ROOT = fileURLToPath(new URL("../", import.meta.url));
const WRANGLER_CONFIG = resolve(PROJECT_ROOT, "wrangler.toml");

const CONTENT_TYPES = new Map([
  [".mp3", "audio/mpeg"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".webp", "image/webp"],
]);

function usage() {
  return `Sync the exact Astro static assets from Git into the existing R2 bucket.

Usage:
  node scripts/sync-astro-static-assets.mjs [options]

The default mode is a read-only dry run. R2 is written only when --remote is
present.

Options:
  --remote                 Upload to remote R2 (the only write mode)
  --commit=<revision>      Source Git revision (default: ${DEFAULT_COMMIT})
  --binding=<name>         R2 binding in wrangler.toml (default: ${DEFAULT_BINDING})
  --bucket=<name>          Override the bucket resolved from wrangler.toml
  --concurrency=<number>   Parallel hashing/uploads (default: ${DEFAULT_CONCURRENCY})
  --retries=<number>       Upload retries after the first attempt (default: ${DEFAULT_RETRIES})
  --manifest=<path>        Write the deterministic SHA256 manifest as JSON
  --help                   Show this message

Examples:
  pnpm assets:sync:astro
  pnpm assets:sync:astro -- --manifest=/tmp/astro-assets.json
  pnpm assets:sync:astro -- --remote --concurrency=4
`;
}

function parseBoundedInteger(value, option, { min, max }) {
  if (!/^\d+$/.test(value)) {
    throw new Error(`${option} must be an integer, received: ${value}`);
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) {
    throw new Error(`${option} must be between ${min} and ${max}, received: ${value}`);
  }
  return parsed;
}

export function parseArguments(argv) {
  const options = {
    remote: false,
    help: false,
    commit: DEFAULT_COMMIT,
    binding: DEFAULT_BINDING,
    bucket: undefined,
    concurrency: DEFAULT_CONCURRENCY,
    retries: DEFAULT_RETRIES,
    manifest: undefined,
  };

  for (const argument of argv) {
    if (argument === "--") {
      continue;
    } else if (argument === "--remote") {
      options.remote = true;
    } else if (argument === "--help" || argument === "-h") {
      options.help = true;
    } else if (argument.startsWith("--commit=")) {
      options.commit = argument.slice("--commit=".length).trim();
    } else if (argument.startsWith("--binding=")) {
      options.binding = argument.slice("--binding=".length).trim();
    } else if (argument.startsWith("--bucket=")) {
      options.bucket = argument.slice("--bucket=".length).trim();
    } else if (argument.startsWith("--concurrency=")) {
      options.concurrency = parseBoundedInteger(
        argument.slice("--concurrency=".length),
        "--concurrency",
        { min: 1, max: 32 }
      );
    } else if (argument.startsWith("--retries=")) {
      options.retries = parseBoundedInteger(argument.slice("--retries=".length), "--retries", {
        min: 0,
        max: 10,
      });
    } else if (argument.startsWith("--manifest=")) {
      options.manifest = argument.slice("--manifest=".length).trim();
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }

  for (const [option, value] of [
    ["--commit", options.commit],
    ["--binding", options.binding],
  ]) {
    if (!value) throw new Error(`${option} cannot be empty`);
  }
  if (options.bucket === "") throw new Error("--bucket cannot be empty");
  if (options.manifest === "") throw new Error("--manifest cannot be empty");

  return options;
}

export function resolveR2BucketName(wranglerToml, binding = DEFAULT_BINDING) {
  const blockPattern = /\[\[r2_buckets\]\]([\s\S]*?)(?=\n\s*\[|$)/g;
  let match;
  while ((match = blockPattern.exec(wranglerToml)) !== null) {
    const block = match[1];
    const blockBinding = block.match(/^\s*binding\s*=\s*["']([^"']+)["']/m)?.[1];
    if (blockBinding !== binding) continue;
    const bucket = block.match(/^\s*bucket_name\s*=\s*["']([^"']+)["']/m)?.[1];
    if (!bucket) throw new Error(`R2 binding ${binding} has no bucket_name in wrangler.toml`);
    return bucket;
  }
  throw new Error(`R2 binding ${binding} was not found in wrangler.toml`);
}

export function contentTypeForKey(key) {
  const dot = key.lastIndexOf(".");
  const extension = dot === -1 ? "" : key.slice(dot).toLowerCase();
  const contentType = CONTENT_TYPES.get(extension);
  if (!contentType) throw new Error(`No content type configured for ${key}`);
  return contentType;
}

function parseTreeEntry(entry) {
  const tab = entry.indexOf("\t");
  if (tab === -1) throw new Error(`Unexpected git ls-tree entry: ${entry}`);

  const metadata = entry.slice(0, tab).trim().split(/\s+/);
  const sourcePath = entry.slice(tab + 1);
  if (metadata.length !== 4 || metadata[1] !== "blob") {
    throw new Error(`Unexpected git ls-tree metadata for ${sourcePath}: ${entry.slice(0, tab)}`);
  }

  const [, , oid, sizeValue] = metadata;
  const size = Number(sizeValue);
  if (!/^[a-f0-9]{40,64}$/i.test(oid) || !Number.isSafeInteger(size) || size < 0) {
    throw new Error(`Invalid git object metadata for ${sourcePath}`);
  }
  if (!sourcePath.startsWith("public/")) {
    throw new Error(`Refusing a source outside public/: ${sourcePath}`);
  }

  const key = sourcePath.slice("public/".length);
  const root = key.split("/", 1)[0];
  if (!SOURCE_DIRECTORIES.includes(root) || key.includes("\\") || key.split("/").includes("..")) {
    throw new Error(`Refusing an unexpected R2 key: ${key}`);
  }

  return { sourcePath, key, oid, size, contentType: contentTypeForKey(key) };
}

export async function listSourceAssets({ commit = DEFAULT_COMMIT, projectRoot = PROJECT_ROOT } = {}) {
  await execFileAsync("git", ["rev-parse", "--verify", `${commit}^{commit}`], {
    cwd: projectRoot,
    encoding: "utf8",
  });

  const pathspecs = SOURCE_DIRECTORIES.map((directory) => `public/${directory}`);
  const { stdout } = await execFileAsync(
    "git",
    ["ls-tree", "-r", "-l", "-z", commit, "--", ...pathspecs],
    { cwd: projectRoot, encoding: "buffer", maxBuffer: 8 * 1024 * 1024 }
  );

  const entries = stdout
    .toString("utf8")
    .split("\0")
    .filter(Boolean)
    .map(parseTreeEntry)
    .sort((left, right) => (left.key < right.key ? -1 : left.key > right.key ? 1 : 0));

  if (entries.length === 0) {
    throw new Error(`No legacy static assets found at ${commit}`);
  }
  return entries;
}

async function readGitBlob(asset, projectRoot = PROJECT_ROOT) {
  const { stdout } = await execFileAsync("git", ["cat-file", "blob", asset.oid], {
    cwd: projectRoot,
    encoding: "buffer",
    maxBuffer: Math.max(asset.size + 1024 * 1024, 10 * 1024 * 1024),
  });
  if (stdout.byteLength !== asset.size) {
    throw new Error(
      `${asset.key}: git tree declared ${asset.size} bytes, cat-file returned ${stdout.byteLength}`
    );
  }
  return stdout;
}

export function sha256Hex(value) {
  return createHash("sha256").update(value).digest("hex");
}

function runCommand(command, args, { cwd = PROJECT_ROOT, input } = {}) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      cwd,
      env: process.env,
      stdio: [input ? "pipe" : "ignore", "pipe", "pipe"],
    });
    const stdout = [];
    const stderr = [];
    child.stdout.on("data", (chunk) => stdout.push(chunk));
    child.stderr.on("data", (chunk) => stderr.push(chunk));
    child.once("error", rejectPromise);
    child.stdin?.on("error", (error) => {
      // A command that exits early can close stdin before the buffered object
      // finishes writing. Its exit status/stderr below is the useful failure.
      if (error.code !== "EPIPE") rejectPromise(error);
    });
    child.once("close", (code, signal) => {
      if (code === 0) {
        resolvePromise(Buffer.concat(stdout).toString("utf8"));
        return;
      }
      const detail = Buffer.concat(stderr).toString("utf8").trim()
        || Buffer.concat(stdout).toString("utf8").trim()
        || `exit ${code ?? "unknown"}${signal ? ` (${signal})` : ""}`;
      rejectPromise(new Error(detail));
    });
    if (input) child.stdin.end(input);
  });
}

export async function retry(operation, retries, onRetry = () => {}) {
  let attempt = 0;
  while (true) {
    try {
      return await operation(attempt);
    } catch (error) {
      if (attempt >= retries) throw error;
      attempt += 1;
      onRetry(error, attempt);
      await new Promise((resolvePromise) => setTimeout(resolvePromise, 250 * 2 ** (attempt - 1)));
    }
  }
}

async function uploadAsset({ asset, bytes, bucket, retries }) {
  const objectPath = `${bucket}/${asset.key}`;
  await retry(
    () =>
      runCommand(
        "pnpm",
        [
          "exec",
          "wrangler",
          "r2",
          "object",
          "put",
          objectPath,
          "--remote",
          "--pipe",
          "--content-type",
          asset.contentType,
          "--cache-control",
          LEGACY_CACHE_CONTROL,
          "--force",
          "--config",
          WRANGLER_CONFIG,
        ],
        { input: bytes }
      ),
    retries,
    (error, attempt) => {
      const summary = error instanceof Error ? error.message.split("\n", 1)[0] : String(error);
      console.warn(`RETRY ${attempt}/${retries} ${asset.key}: ${summary}`);
    }
  );
}

async function mapConcurrent(items, concurrency, worker) {
  const results = new Array(items.length);
  let cursor = 0;

  async function consume() {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) return;
      results[index] = await worker(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, consume));
  return results;
}

export async function buildManifest({
  assets,
  commit = DEFAULT_COMMIT,
  concurrency = DEFAULT_CONCURRENCY,
  projectRoot = PROJECT_ROOT,
  onAsset = undefined,
}) {
  const files = await mapConcurrent(assets, concurrency, async (asset, index) => {
    const bytes = await readGitBlob(asset, projectRoot);
    const sha256 = sha256Hex(bytes);
    await onAsset?.({ asset, bytes, sha256, index, total: assets.length });
    return {
      key: asset.key,
      sourcePath: asset.sourcePath,
      gitOid: asset.oid,
      size: asset.size,
      contentType: asset.contentType,
      sha256,
    };
  });

  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
  const digestInput = files
    .map((file) => `${file.key}\0${file.size}\0${file.sha256}\n`)
    .join("");
  return {
    schemaVersion: 1,
    sourceCommit: commit,
    sourceDirectories: SOURCE_DIRECTORIES,
    fileCount: files.length,
    totalBytes,
    sha256: sha256Hex(digestInput),
    files,
  };
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(usage());
    return;
  }

  const wranglerToml = await readFile(WRANGLER_CONFIG, "utf8");
  const bucket = options.bucket || resolveR2BucketName(wranglerToml, options.binding);
  const assets = await listSourceAssets({ commit: options.commit });

  console.log(
    options.remote
      ? `REMOTE WRITE: ${assets.length} objects -> R2 bucket ${bucket}`
      : `DRY RUN: ${assets.length} objects -> R2 bucket ${bucket}; no remote writes`
  );
  console.log(
    `Source ${options.commit}: ${SOURCE_DIRECTORIES.map((directory) => `public/${directory}`).join(", ")}`
  );

  const failures = [];
  const manifest = await buildManifest({
    assets,
    commit: options.commit,
    concurrency: options.concurrency,
    onAsset: async ({ asset, bytes, sha256, index, total }) => {
      const label = `${String(index + 1).padStart(String(total).length, "0")}/${total}`;
      if (options.remote) {
        try {
          await uploadAsset({ asset, bytes, bucket, retries: options.retries });
          console.log(`UPLOADED ${label} ${asset.key} ${asset.size}B sha256:${sha256}`);
        } catch (error) {
          failures.push({ key: asset.key, error });
          console.error(
            `FAILED ${label} ${asset.key}: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      } else {
        console.log(`DRY-RUN ${label} ${asset.key} ${asset.size}B sha256:${sha256}`);
      }
    },
  });

  if (options.manifest) {
    const manifestPath = resolve(PROJECT_ROOT, options.manifest);
    await mkdir(dirname(manifestPath), { recursive: true });
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
    console.log(`Manifest: ${manifestPath}`);
  }

  console.log(
    `SUMMARY mode=${options.remote ? "remote" : "dry-run"} files=${manifest.fileCount} bytes=${manifest.totalBytes} manifest-sha256=${manifest.sha256} failures=${failures.length}`
  );

  if (failures.length > 0) {
    throw new AggregateError(
      failures.map(({ error }) => error),
      `${failures.length} R2 upload(s) failed after retries: ${failures
        .map(({ key }) => key)
        .slice(0, 10)
        .join(", ")}`
    );
  }
}

const isEntrypoint = process.argv[1]
  && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isEntrypoint) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack || error.message : error);
    process.exitCode = 1;
  });
}
