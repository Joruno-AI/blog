#!/usr/bin/env node

import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  validZReadCachePayload,
  verifyZReadCache,
  zreadPageCacheKey,
} from "./lib/verify-zread-cache.mjs";

const root = path.resolve(import.meta.dirname, "..");
const selectedPath = path.join(root, "lib/parity/data/agent-selected-summaries.json");
const outputRoot = path.join(root, "public/agent/zread-cache");
const manifestPath = path.join(outputRoot, "manifest.json");
const sourceOrigin = (process.env.ZREAD_CACHE_SOURCE_ORIGIN || "https://www.wangshengliang.cn").replace(/\/$/, "");
const concurrency = Math.max(1, Math.min(24, Number(process.env.ZREAD_CACHE_CONCURRENCY) || 10));
const requestTimeout = Math.max(2_000, Math.min(60_000, Number(process.env.ZREAD_CACHE_TIMEOUT_MS) || 12_000));
const checkOnly = process.argv.includes("--check");
const strictCheck = process.argv.includes("--strict");
const force = process.argv.includes("--force");
const includePages = process.argv.includes("--pages");
const limitArg = process.argv.find((entry) => entry.startsWith("--limit="));
const limit = limitArg ? Math.max(1, Number(limitArg.slice("--limit=".length)) || 1) : Infinity;

function repositoryFromItem(item) {
  const value = typeof item?.repository === "string" ? item.repository.trim() : "";
  return /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(value) ? value : "";
}

function cacheFile(repository, action) {
  const [owner, repo] = repository.split("/");
  return path.join(outputRoot, owner, repo, `${action}.json`);
}

function pageCacheKey(value) {
  return zreadPageCacheKey(value);
}

function pageCacheFile(repository, slug) {
  const [owner, repo] = repository.split("/");
  return path.join(outputRoot, owner, repo, "pages", `${pageCacheKey(slug)}.json`);
}

async function atomicJson(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value)}\n`);
  await rename(temporary, file);
}

function validPayload(action, payload) {
  return validZReadCachePayload(action, payload);
}

async function fetchPayload(repository, action, title = "") {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeout);
  try {
    const url = new URL(`${sourceOrigin}/api/zread/${repository}/${action}`);
    if (action === "page" && title) url.searchParams.set("title", title);
    const response = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "Joruno-ZRead-Migration/1.0" },
      redirect: "follow",
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !validPayload(action, payload)) {
      throw new Error(`HTTP ${response.status}`);
    }
    return payload;
  } finally {
    clearTimeout(timeout);
  }
}

async function hasValidCache(repository, action) {
  if (force) return false;
  try {
    return validPayload(action, JSON.parse(await readFile(cacheFile(repository, action), "utf8")));
  } catch {
    return false;
  }
}

async function readValidCache(repository, action) {
  try {
    const payload = JSON.parse(await readFile(cacheFile(repository, action), "utf8"));
    return validPayload(action, payload) ? payload : null;
  } catch {
    return null;
  }
}

async function hasValidPageCache(repository, slug) {
  if (force) return false;
  try {
    return validPayload("page", JSON.parse(await readFile(pageCacheFile(repository, slug), "utf8")));
  } catch {
    return false;
  }
}

async function syncOne(repository) {
  const failures = [];
  const payloads = {};
  for (const action of ["structure", "overview"]) {
    try {
      if (await hasValidCache(repository, action)) {
        payloads[action] = await readValidCache(repository, action);
        continue;
      }
      payloads[action] = await fetchPayload(repository, action);
      await atomicJson(cacheFile(repository, action), payloads[action]);
    } catch (reason) {
      failures.push({ action, error: reason instanceof Error ? reason.message : String(reason) });
    }
  }
  const structure = payloads.structure;
  const overview = payloads.overview;
  const items = Array.isArray(structure?.items) ? structure.items : [];
  const overviewItem = items.find((item) => item?.title === overview?.page || item?.slug === overview?.slug) || items[0];
  if (overview && overviewItem?.slug) {
    await atomicJson(pageCacheFile(repository, overviewItem.slug), overview);
  }
  if (includePages && items.length) {
    for (const item of items) {
      if (!item?.slug || item.slug === overviewItem?.slug) continue;
      try {
        if (await hasValidPageCache(repository, item.slug)) continue;
        await atomicJson(pageCacheFile(repository, item.slug), await fetchPayload(repository, "page", item.title || item.slug));
      } catch (reason) {
        failures.push({ action: `page:${item.slug}`, error: reason instanceof Error ? reason.message : String(reason) });
      }
    }
  }
  return failures.length ? { repository, failures } : null;
}

async function mapConcurrent(items, worker) {
  let cursor = 0;
  const results = new Array(items.length);
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index], index);
      if (!checkOnly && (index + 1) % 20 === 0) process.stderr.write(`ZRead cache ${index + 1}/${items.length}\n`);
    }
  }));
  return results;
}

async function main() {
  if (strictCheck && !checkOnly) throw new Error("--strict requires --check.");
  const selected = JSON.parse(await readFile(selectedPath, "utf8"));
  const repositories = [...new Set(Object.values(selected.items || {}).map(repositoryFromItem).filter(Boolean))]
    .slice(0, limit);
  if (!repositories.length) throw new Error("Selected Agent repository list is empty.");

  if (checkOnly) {
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    const result = await verifyZReadCache({
      cacheRoot: outputRoot,
      manifest,
      selectedRepositories: repositories,
      strict: strictCheck,
    });
    process.stdout.write(
      `ZRead cache verified ${result.verifiedPayloads} payload(s) across ${result.verifiedRepositories} repository snapshot(s); `
      + `${result.declaredRepositories}/${result.selectedRepositories} declared complete${strictCheck ? " (strict)" : ""}.\n`,
    );
    return;
  }

  await mkdir(outputRoot, { recursive: true });
  const failures = (await mapConcurrent(repositories, syncOne)).filter(Boolean);
  const failedRepositories = new Set(failures.map((entry) => entry.repository));
  const completed = repositories.filter((repository) => !failedRepositories.has(repository));
  await atomicJson(manifestPath, {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    sourceOrigin,
    source: "zread",
    pageCoverage: includePages ? "all" : "overview",
    repositories: completed,
    failures,
  });
  // Never leave an empty directory from a failed first run looking complete.
  if (!completed.length) await rm(manifestPath, { force: true });
  process.stdout.write(`ZRead cache synchronized ${completed.length}/${repositories.length} repositories.\n`);
  if (failures.length) process.stderr.write(`${JSON.stringify(failures.slice(0, 20), null, 2)}\n`);
}

try {
  await main();
} catch (reason) {
  console.error(reason instanceof Error ? reason.message : String(reason));
  process.exitCode = 1;
}
