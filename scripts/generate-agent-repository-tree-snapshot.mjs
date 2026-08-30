#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const outputPath = path.join(root, "lib/agent/data/repository-tree-snapshots.json");
const repository = (process.argv.find((argument) => argument.startsWith("--repository="))?.slice("--repository=".length)
  || process.argv[2]
  || "").trim();
const requestedRef = (process.argv.find((argument) => argument.startsWith("--ref="))?.slice("--ref=".length) || "").trim();

if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) {
  throw new Error("Usage: pnpm data:generate:agent-tree-snapshot -- --repository=OWNER/REPO [--ref=BRANCH]");
}
if (requestedRef && (!/^[A-Za-z0-9._/-]+$/.test(requestedRef) || requestedRef.includes(".."))) {
  throw new Error("Repository snapshot ref is invalid.");
}

const temporary = mkdtempSync(path.join(tmpdir(), "agent-repository-tree-"));

try {
  const cloneArguments = ["clone", "--depth=1", "--no-checkout"];
  if (requestedRef) cloneArguments.push("--branch", requestedRef);
  cloneArguments.push(`https://github.com/${repository}.git`, temporary);
  execFileSync("git", cloneArguments, { cwd: root, stdio: "inherit" });

  const ref = requestedRef || execFileSync("git", ["symbolic-ref", "--short", "HEAD"], {
    cwd: temporary,
    encoding: "utf8",
  }).trim();
  const commit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: temporary, encoding: "utf8" }).trim();
  const generatedAt = execFileSync("git", ["show", "-s", "--format=%cI", "HEAD"], {
    cwd: temporary,
    encoding: "utf8",
  }).trim();
  const rawTree = execFileSync("git", ["ls-tree", "--full-tree", "-r", "-l", "-z", "HEAD"], {
    cwd: temporary,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  const directories = new Set();
  const blobs = rawTree.split("\0").filter(Boolean).flatMap((record) => {
    const separator = record.indexOf("\t");
    if (separator < 0) return [];
    const metadata = record.slice(0, separator).trim().split(/\s+/);
    const filePath = record.slice(separator + 1);
    if (metadata[1] !== "blob" || !filePath || filePath.length > 1_800) return [];
    const parts = filePath.split("/");
    for (let index = 1; index < parts.length; index += 1) directories.add(parts.slice(0, index).join("/"));
    const size = Number(metadata[3]);
    return [{ path: filePath, type: "blob", size: Number.isSafeInteger(size) && size >= 0 ? size : null }];
  });
  if (!blobs.length || blobs.length > 5_000) {
    throw new Error(`Repository snapshot contains ${blobs.length} blobs; expected 1-5000.`);
  }
  const tree = [
    ...[...directories].map((directory) => ({ path: directory, type: "tree", size: null })),
    ...blobs,
  ].sort((left, right) => left.path.localeCompare(right.path));
  if (tree.length > 5_000) {
    throw new Error(`Repository snapshot contains ${tree.length} total entries; the Agent tree limit is 5000.`);
  }

  let manifest = { schemaVersion: 1, repositories: {} };
  try {
    const existing = JSON.parse(readFileSync(outputPath, "utf8"));
    if (existing?.schemaVersion === 1 && existing.repositories && typeof existing.repositories === "object") manifest = existing;
  } catch {
    // The first snapshot creates the manifest.
  }
  manifest.repositories[repository.toLowerCase()] = {
    repository,
    ref,
    commit,
    generatedAt,
    tree,
  };
  mkdirSync(path.dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`);
  process.stdout.write(`Generated ${repository}@${ref} tree snapshot: ${blobs.length} blobs, ${directories.size} directories, ${tree.length} entries.\n`);
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
