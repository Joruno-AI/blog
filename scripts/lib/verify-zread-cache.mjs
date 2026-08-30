import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const REPOSITORY = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

export function zreadPageCacheKey(value) {
  return String(value || "")
    .trim()
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}._-]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 160) || "overview";
}

export function validZReadCachePayload(action, payload) {
  if (!payload || typeof payload !== "object" || payload.source !== "zread") return false;
  if (action === "structure") {
    if (!Array.isArray(payload.items) || payload.items.length === 0) return false;
    const slugs = new Set();
    return payload.items.every((item) => {
      const title = typeof item?.title === "string" ? item.title.trim() : "";
      const slug = typeof item?.slug === "string" ? item.slug.trim() : "";
      if (!title || !slug || slugs.has(slug)) return false;
      slugs.add(slug);
      return true;
    });
  }
  return typeof payload.page === "string" && payload.page.trim().length > 0
    && typeof payload.slug === "string" && payload.slug.trim().length > 0
    && typeof payload.markdown === "string" && payload.markdown.trim().length > 0;
}

async function readPayload(file, action, problems, { required = false } = {}) {
  let source;
  try {
    source = await readFile(file, "utf8");
  } catch (error) {
    if (required || error?.code !== "ENOENT") {
      problems.push(`${required ? "missing" : "unreadable"} ${file}`);
    }
    return null;
  }
  if (!source.trim()) {
    problems.push(`empty ${file}`);
    return null;
  }
  let payload;
  try {
    payload = JSON.parse(source);
  } catch {
    problems.push(`invalid JSON ${file}`);
    return null;
  }
  if (!validZReadCachePayload(action, payload)) {
    problems.push(`invalid ${action} payload ${file} (expected a complete source=zread payload)`);
    return null;
  }
  return payload;
}

async function verifyPagesDirectory({
  repository,
  repositoryRoot,
  structure,
  overview,
  requireOverviewPage,
  requireAllPages,
  problems,
}) {
  const pagesRoot = path.join(repositoryRoot, "pages");
  let entries = [];
  try {
    entries = await readdir(pagesRoot, { withFileTypes: true });
  } catch (error) {
    if ((requireOverviewPage || requireAllPages) && error?.code === "ENOENT") {
      problems.push(`missing pages directory for ${repository}`);
    } else if (error?.code !== "ENOENT") {
      problems.push(`unreadable pages directory for ${repository}`);
    }
    return { pages: new Map(), payloads: 0 };
  }

  const pages = new Map();
  let payloads = 0;
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name, "en"))) {
    const file = path.join(pagesRoot, entry.name);
    if (!entry.isFile() || !entry.name.endsWith(".json")) {
      problems.push(`unexpected pages entry ${file}`);
      continue;
    }
    const payload = await readPayload(file, "page", problems);
    if (!payload) continue;
    pages.set(entry.name.slice(0, -".json".length), payload);
    payloads += 1;
  }

  const items = Array.isArray(structure?.items) ? structure.items : [];
  const overviewItem = items.find((item) => item?.title === overview?.page || item?.slug === overview?.slug) || items[0];
  const overviewSlug = overview?.slug || overviewItem?.slug;
  if (requireOverviewPage) {
    if (!overviewSlug) {
      problems.push(`could not determine overview page slug for ${repository}`);
    } else {
      const key = zreadPageCacheKey(overviewSlug);
      const page = pages.get(key);
      if (!page) problems.push(`missing overview page ${path.join(pagesRoot, `${key}.json`)}`);
      else if (page.markdown !== overview?.markdown || page.source !== overview?.source) {
        problems.push(`overview page does not match overview.json for ${repository}`);
      }
    }
  }

  if (requireAllPages) {
    for (const item of items) {
      const key = zreadPageCacheKey(item.slug);
      if (!pages.has(key)) problems.push(`missing declared page ${path.join(pagesRoot, `${key}.json`)}`);
    }
  }

  return { pages, payloads };
}

export async function verifyZReadCache({
  cacheRoot,
  manifest,
  selectedRepositories,
  strict = false,
}) {
  const selected = [...new Set(selectedRepositories)].sort((left, right) => left.localeCompare(right, "en"));
  const problems = [];
  if (!manifest || typeof manifest !== "object") problems.push("cache manifest is not an object");
  if (manifest?.schemaVersion !== 1) problems.push("cache manifest schemaVersion must be 1");
  if (manifest?.source !== "zread") problems.push("cache manifest source must be zread");
  if (!Array.isArray(manifest?.repositories)) problems.push("cache manifest repositories must be an array");
  if (manifest?.pageCoverage != null && !["overview", "all"].includes(manifest.pageCoverage)) {
    problems.push("cache manifest pageCoverage must be overview or all");
  }

  const declared = new Set();
  for (const repository of Array.isArray(manifest?.repositories) ? manifest.repositories : []) {
    if (typeof repository !== "string" || !REPOSITORY.test(repository)) {
      problems.push(`invalid repository in cache manifest: ${String(repository)}`);
      continue;
    }
    if (declared.has(repository)) problems.push(`duplicate repository in cache manifest: ${repository}`);
    declared.add(repository);
    if (!selected.includes(repository)) problems.push(`cache manifest repository is not selected: ${repository}`);
  }

  if (strict) {
    const missing = selected.filter((repository) => !declared.has(repository));
    if (missing.length) {
      const preview = missing.slice(0, 20).join(", ");
      problems.push(
        `selected repository coverage is incomplete: ${missing.length} not declared complete (${preview}${missing.length > 20 ? ", ..." : ""})`,
      );
    }
  }

  const requireManifestAllPages = manifest?.pageCoverage === "all";
  let verifiedRepositories = 0;
  let verifiedPayloads = 0;
  for (const repository of selected) {
    if (!REPOSITORY.test(repository)) {
      problems.push(`invalid selected repository: ${repository}`);
      continue;
    }
    const repositoryRoot = path.join(cacheRoot, ...repository.split("/"));
    const requiresCore = declared.has(repository);
    const hasAnyCore = ["structure.json", "overview.json"].some((name) => existsSync(path.join(repositoryRoot, name)));
    const hasPages = existsSync(path.join(repositoryRoot, "pages"));
    if (!requiresCore && !hasAnyCore && !hasPages) continue;

    verifiedRepositories += 1;
    const structure = await readPayload(path.join(repositoryRoot, "structure.json"), "structure", problems, { required: requiresCore });
    const overview = await readPayload(path.join(repositoryRoot, "overview.json"), "overview", problems, { required: requiresCore });
    if (structure) verifiedPayloads += 1;
    if (overview) verifiedPayloads += 1;

    const pageResult = await verifyPagesDirectory({
      repository,
      repositoryRoot,
      structure,
      overview,
      requireOverviewPage: requiresCore,
      requireAllPages: requiresCore && (strict || requireManifestAllPages),
      problems,
    });
    verifiedPayloads += pageResult.payloads;
  }

  if (problems.length) {
    throw new Error(`ZRead cache verification failed:\n- ${problems.join("\n- ")}`);
  }
  return {
    selectedRepositories: selected.length,
    declaredRepositories: declared.size,
    verifiedRepositories,
    verifiedPayloads,
    strict,
  };
}
