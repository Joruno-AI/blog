#!/usr/bin/env node

import { createHash, randomBytes } from "node:crypto";
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

import { normalizeArchifyMermaidSource } from "../lib/archify/mermaid-source.mjs";
import {
  ARCHIFY_UPSTREAM_COMMIT,
  ARCHIFY_UPSTREAM_VERSION,
  DEFAULT_ARCHIFY_VENDOR_ROOT,
  compileArchifyArtifact,
} from "./lib/archify-compiler.mjs";
import { mermaidToArchify } from "./lib/mermaid-to-archify.mjs";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDirectory, "..");

export const DEFAULT_ZREAD_CACHE_ROOT = join(projectRoot, "public/agent/zread-cache");
export const DEFAULT_ARCHIFY_OUTPUT_ROOT = join(projectRoot, "public/diagrams/archify");
export const ZREAD_ARCHIFY_MANIFEST_FILE = "archify-manifest.json";

const MERMAID_FENCE = /(?:^|\n)[ \t]*```(?:mermaid)(?:[ \t]+[^\n]*)?\r?\n([\s\S]*?)\r?\n[ \t]*```(?=\n|$)/gi;

function portablePath(path) {
  return path.split(sep).join("/");
}

function sha256(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function findCacheDocuments(directory, cacheRoot = directory) {
  if (!existsSync(directory)) return [];
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...findCacheDocuments(path, cacheRoot));
    else if (entry.isFile()) {
      const relativeSegments = portablePath(relative(cacheRoot, path)).split("/");
      const inPagesDirectory = relativeSegments.slice(2, -1).includes("pages");
      if (/^(?:overview|pages)\.json$/i.test(entry.name) || (inPagesDirectory && /\.json$/i.test(entry.name))) files.push(path);
    }
  }
  return files.sort((left, right) => left.localeCompare(right, "en"));
}

function walkStrings(value, path = "$", result = []) {
  if (typeof value === "string") result.push({ path, value });
  else if (Array.isArray(value)) value.forEach((item, index) => walkStrings(item, `${path}[${index}]`, result));
  else if (value && typeof value === "object") {
    for (const key of Object.keys(value).sort()) walkStrings(value[key], `${path}.${key}`, result);
  }
  return result;
}

function precedingHeading(markdown, index) {
  const prefix = markdown.slice(0, index);
  const headings = [...prefix.matchAll(/^#{1,6}[ \t]+(.+?)[ \t]*#*[ \t]*$/gm)];
  return headings.at(-1)?.[1]?.replace(/[*_`[\]]/g, "").trim() || "Repository architecture";
}

export function extractZReadMermaidDocuments({ cacheRoot = DEFAULT_ZREAD_CACHE_ROOT } = {}) {
  const discovered = [];
  for (const filePath of findCacheDocuments(cacheRoot)) {
    const relativePath = portablePath(relative(cacheRoot, filePath));
    const segments = relativePath.split("/");
    if (segments.length < 3) continue;
    const repository = `${segments[0]}/${segments[1]}`;
    let document;
    try {
      document = JSON.parse(readFileSync(filePath, "utf8"));
    } catch (error) {
      throw new Error(`Could not parse ZRead cache document ${filePath}: ${error.message}`);
    }
    for (const entry of walkStrings(document)) {
      for (const match of entry.value.matchAll(MERMAID_FENCE)) {
        const source = normalizeArchifyMermaidSource(match[1]);
        if (!source) continue;
        discovered.push({
          repository,
          source,
          sourceSha256: sha256(source),
          title: precedingHeading(entry.value, match.index || 0),
          location: `${relativePath}:${entry.path}`,
        });
      }
    }
  }
  return discovered.sort((left, right) =>
    left.repository.localeCompare(right.repository, "en")
      || left.sourceSha256.localeCompare(right.sourceSha256, "en")
      || left.location.localeCompare(right.location, "en"));
}

function objectFromEntriesSorted(entries) {
  return Object.fromEntries([...entries].sort(([left], [right]) => left.localeCompare(right, "en")));
}

function serializeManifest(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function atomicWrite(path, contents) {
  mkdirSync(dirname(path), { recursive: true });
  if (existsSync(path) && readFileSync(path, "utf8") === contents) return false;
  const candidate = join(dirname(path), `.${path.split(/[\\/]/).at(-1)}.${process.pid}.${randomBytes(6).toString("hex")}.tmp`);
  try {
    writeFileSync(candidate, contents, { encoding: "utf8", flag: "wx" });
    renameSync(candidate, path);
  } finally {
    rmSync(candidate, { force: true });
  }
  return true;
}

function manifestArtifactFileNames(manifest) {
  const names = new Set();
  const visit = (value) => {
    if (typeof value === "string") {
      const match = value.match(/^\/diagrams\/archify\/([a-f0-9]{64}\.html)$/);
      if (match) names.add(match[1]);
    } else if (Array.isArray(value)) value.forEach(visit);
    else if (value && typeof value === "object") Object.values(value).forEach(visit);
  };
  visit(manifest);
  return names;
}

function readJsonIfPresent(path) {
  if (!existsSync(path)) return null;
  try { return JSON.parse(readFileSync(path, "utf8")); } catch { return null; }
}

function assignNested(target, repository, hash, value) {
  target[repository] ??= {};
  target[repository][hash] = value;
}

export function generateZReadArchifyArtifacts({
  check = false,
  cacheRoot = DEFAULT_ZREAD_CACHE_ROOT,
  outputRoot = DEFAULT_ARCHIFY_OUTPUT_ROOT,
  vendorRoot = DEFAULT_ARCHIFY_VENDOR_ROOT,
  manifestPath = join(cacheRoot, ZREAD_ARCHIFY_MANIFEST_FILE),
} = {}) {
  const discovered = extractZReadMermaidDocuments({ cacheRoot });
  const unique = new Map();
  for (const item of discovered) {
    const key = `${item.repository}\0${item.sourceSha256}`;
    const existing = unique.get(key);
    if (existing) {
      existing.locations.add(item.location);
      if (existing.title === "Repository architecture" && item.title !== existing.title) existing.title = item.title;
    } else unique.set(key, { ...item, locations: new Set([item.location]) });
  }

  const artifacts = {};
  const metadata = {};
  const unsupported = {};
  const expectedFiles = new Set();
  const problems = [];
  let changed = 0;

  for (const item of unique.values()) {
    const locations = [...item.locations].sort((left, right) => left.localeCompare(right, "en"));
    const converted = mermaidToArchify(item.source, {
      title: item.title,
      repository: item.repository,
    });
    if (!converted.supported) {
      assignNested(unsupported, item.repository, item.sourceSha256, {
        reason: converted.reason,
        ...(converted.detail ? { detail: converted.detail } : {}),
        sources: locations,
      });
      continue;
    }

    let compiled;
    try {
      compiled = compileArchifyArtifact({
        type: converted.type,
        ir: converted.ir,
        outputRoot,
        vendorRoot,
        write: !check,
      });
    } catch (error) {
      assignNested(unsupported, item.repository, item.sourceSha256, {
        reason: "archify-validation-failed",
        detail: String(error.message || error).split("\n")[0].slice(0, 240),
        sources: locations,
      });
      continue;
    }

    expectedFiles.add(compiled.fileName);
    if (compiled.changed) changed += 1;
    if (check) {
      if (!existsSync(compiled.outputPath)) problems.push(`missing artifact ${portablePath(relative(projectRoot, compiled.outputPath))}`);
      else if (readFileSync(compiled.outputPath, "utf8") !== compiled.html) problems.push(`stale artifact ${portablePath(relative(projectRoot, compiled.outputPath))}`);
    }
    assignNested(artifacts, item.repository, item.sourceSha256, compiled.publicPath);
    assignNested(metadata, item.repository, item.sourceSha256, {
      type: compiled.type,
      title: item.title,
      artifactSha256: compiled.hash,
      sources: locations,
    });
  }

  const sortNested = (value) => objectFromEntriesSorted(Object.entries(value).map(([repository, records]) => [
    repository,
    objectFromEntriesSorted(Object.entries(records)),
  ]));
  const manifest = {
    schemaVersion: 1,
    renderer: {
      name: "Archify",
      version: ARCHIFY_UPSTREAM_VERSION,
      commit: ARCHIFY_UPSTREAM_COMMIT,
    },
    artifacts: sortNested(artifacts),
    metadata: sortNested(metadata),
    unsupported: sortNested(unsupported),
    stats: {
      repositories: new Set(discovered.map((item) => item.repository)).size,
      discovered: discovered.length,
      unique: unique.size,
      generated: expectedFiles.size,
      unsupported: Object.values(unsupported).reduce((sum, records) => sum + Object.keys(records).length, 0),
    },
  };
  const manifestContents = serializeManifest(manifest);
  const previousManifest = readJsonIfPresent(manifestPath);
  const previousFiles = manifestArtifactFileNames(previousManifest);
  const siblingManifest = readJsonIfPresent(join(outputRoot, "manifest.json"));
  const protectedFiles = manifestArtifactFileNames(siblingManifest);

  for (const fileName of previousFiles) {
    if (expectedFiles.has(fileName) || protectedFiles.has(fileName)) continue;
    const path = join(outputRoot, fileName);
    if (!existsSync(path)) continue;
    if (check) problems.push(`stale artifact ${portablePath(relative(projectRoot, path))}`);
    else {
      rmSync(path);
      changed += 1;
    }
  }

  if (check) {
    if (!existsSync(manifestPath)) problems.push(`missing manifest ${portablePath(relative(projectRoot, manifestPath))}`);
    else if (readFileSync(manifestPath, "utf8") !== manifestContents) problems.push(`stale manifest ${portablePath(relative(projectRoot, manifestPath))}`);
    if (problems.length) throw new Error(`ZRead Archify artifact check failed:\n- ${problems.join("\n- ")}`);
  } else if (atomicWrite(manifestPath, manifestContents)) changed += 1;

  return {
    check,
    discovered: discovered.length,
    unique: unique.size,
    artifacts: expectedFiles.size,
    unsupported: manifest.stats.unsupported,
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
      "--cache-root": "cacheRoot",
      "--output-root": "outputRoot",
      "--vendor-root": "vendorRoot",
      "--manifest-path": "manifestPath",
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

const isMain = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isMain) {
  try {
    const result = generateZReadArchifyArtifacts(parseArguments(process.argv.slice(2)));
    const verb = result.check ? "verified" : "generated";
    console.log(`ZRead Archify ${verb}: ${result.artifacts}/${result.unique} artifact(s), ${result.unsupported} unsupported, ${result.changed} file change(s).`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
