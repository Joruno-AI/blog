#!/usr/bin/env node

import { randomBytes } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  ARCHIFY_UPSTREAM_COMMIT,
  ARCHIFY_UPSTREAM_VERSION,
  DEFAULT_ARCHIFY_VENDOR_ROOT,
  compileArchifyArtifact,
} from "./lib/archify-compiler.mjs";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDirectory, "..");

export const DEFAULT_ARCHIFY_CONTENT_ROOT = join(projectRoot, "content/diagrams");
export const DEFAULT_ARCHIFY_PUBLIC_ROOT = join(projectRoot, "public/diagrams/archify");
export const ARCHIFY_MANIFEST_FILE = "manifest.json";

function portablePath(path) {
  return path.split(sep).join("/");
}

function findArchifyInputs(directory) {
  if (!existsSync(directory)) return [];
  const inputs = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) inputs.push(...findArchifyInputs(path));
    else if (entry.isFile() && entry.name.endsWith(".archify.json")) inputs.push(path);
  }
  return inputs.sort((left, right) => left.localeCompare(right, "en"));
}

function readIr(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    throw new Error(`Could not parse Archify input ${path}: ${error.message}`);
  }
}

function serializeManifest(manifest) {
  return `${JSON.stringify(manifest, null, 2)}\n`;
}

function atomicWrite(path, contents) {
  mkdirSync(dirname(path), { recursive: true });
  if (existsSync(path) && readFileSync(path, "utf8") === contents) return false;
  const candidate = join(
    dirname(path),
    `.${path.split(/[\\/]/).at(-1)}.${process.pid}.${randomBytes(6).toString("hex")}.tmp`,
  );
  try {
    writeFileSync(candidate, contents, { encoding: "utf8", flag: "wx" });
    renameSync(candidate, path);
  } finally {
    rmSync(candidate, { force: true });
  }
  return true;
}

function manifestArtifactFiles(manifest) {
  if (!manifest || !Array.isArray(manifest.artifacts)) return [];
  return manifest.artifacts
    .map((artifact) => artifact?.publicPath?.match(/^\/diagrams\/archify\/([a-f0-9]{64}\.html)$/)?.[1])
    .filter(Boolean)
    .sort();
}

export function generateArchifyArtifacts({
  check = false,
  contentRoot = DEFAULT_ARCHIFY_CONTENT_ROOT,
  outputRoot = DEFAULT_ARCHIFY_PUBLIC_ROOT,
  vendorRoot = DEFAULT_ARCHIFY_VENDOR_ROOT,
} = {}) {
  const inputs = findArchifyInputs(contentRoot);
  const artifacts = [];
  const expectedFiles = new Set();
  const problems = [];
  let changed = 0;

  for (const inputPath of inputs) {
    const ir = readIr(inputPath);
    const type = ir?.diagram_type;
    let compiled;
    try {
      compiled = compileArchifyArtifact({ type, ir, outputRoot, vendorRoot, write: !check });
    } catch (error) {
      throw new Error(`Archify compilation failed for ${inputPath}: ${error.message}`);
    }
    expectedFiles.add(compiled.fileName);
    if (compiled.changed) changed += 1;
    if (check) {
      if (!existsSync(compiled.outputPath)) {
        problems.push(`missing artifact ${portablePath(relative(projectRoot, compiled.outputPath))}`);
      } else if (readFileSync(compiled.outputPath, "utf8") !== compiled.html) {
        problems.push(`stale artifact ${portablePath(relative(projectRoot, compiled.outputPath))}`);
      }
    }
    artifacts.push({
      source: portablePath(relative(contentRoot, inputPath)),
      type: compiled.type,
      sha256: compiled.hash,
      publicPath: compiled.publicPath,
    });
  }

  const manifest = {
    schemaVersion: 1,
    renderer: {
      name: "Archify",
      version: ARCHIFY_UPSTREAM_VERSION,
      commit: ARCHIFY_UPSTREAM_COMMIT,
    },
    artifacts,
  };
  const manifestPath = join(outputRoot, ARCHIFY_MANIFEST_FILE);
  const manifestContents = serializeManifest(manifest);

  // This manifest owns only artifacts it referenced on the previous run.
  // ZRead has a sibling manifest in another public directory and shares this
  // content-addressed output root, so sweeping every hash here would delete
  // valid repository diagrams.
  let previousManifest = null;
  if (existsSync(manifestPath)) {
    try { previousManifest = JSON.parse(readFileSync(manifestPath, "utf8")); } catch { /* stale manifest is reported below */ }
  }

  for (const fileName of manifestArtifactFiles(previousManifest)) {
    if (expectedFiles.has(fileName)) continue;
    if (check) problems.push(`stale artifact ${portablePath(relative(projectRoot, join(outputRoot, fileName)))}`);
    else {
      rmSync(join(outputRoot, fileName));
      changed += 1;
    }
  }

  if (check) {
    if (!existsSync(manifestPath)) {
      problems.push(`missing manifest ${portablePath(relative(projectRoot, manifestPath))}`);
    } else if (readFileSync(manifestPath, "utf8") !== manifestContents) {
      problems.push(`stale manifest ${portablePath(relative(projectRoot, manifestPath))}`);
    }
    if (problems.length) {
      throw new Error(`Archify artifact check failed:\n- ${problems.join("\n- ")}`);
    }
  } else if (atomicWrite(manifestPath, manifestContents)) {
    changed += 1;
  }

  return {
    check,
    inputs: inputs.length,
    artifacts: artifacts.length,
    changed,
    manifest,
    manifestPath,
  };
}

function parseArguments(args) {
  const options = { check: false };
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--check") {
      options.check = true;
      continue;
    }
    const optionNames = {
      "--content-root": "contentRoot",
      "--output-root": "outputRoot",
      "--vendor-root": "vendorRoot",
    };
    const optionName = optionNames[argument];
    if (optionName) {
      const value = args[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`${argument} requires a path.`);
      options[optionName] = resolve(value);
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument ${argument}.`);
  }
  return options;
}

const isMain = process.argv[1]
  && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isMain) {
  try {
    const result = generateArchifyArtifacts(parseArguments(process.argv.slice(2)));
    const verb = result.check ? "verified" : "generated";
    console.log(`Archify ${verb}: ${result.artifacts} artifact(s), ${result.changed} file change(s).`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
