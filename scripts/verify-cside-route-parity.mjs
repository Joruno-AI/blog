import { performance } from "node:perf_hooks";

import {
  EXPECTED_AUDITED_ROUTE_COUNT,
  EXPECTED_SITEMAP_ROUTE_COUNT,
  decodeHtml,
  exactBodyResult,
  normalizeCloudflareManagedRobots,
  semanticBodyContract,
} from "./cside-parity-core.mjs";
import { isolatedRequest } from "./isolated-http.mjs";

const args = new Map(
  process.argv.slice(2).map((argument) => {
    const [key, ...value] = argument.replace(/^--/, "").split("=");
    return [key, value.join("=") || true];
  }),
);

function positiveInteger(value, fallback, name) {
  const number = value === undefined ? fallback : Number(value);
  if (!Number.isSafeInteger(number) || number < 1) throw new Error(`${name} must be a positive integer.`);
  return number;
}

const referenceBase = String(args.get("reference") || "https://www.wangshengliang.cn").replace(/\/$/, "");
const candidateArg = args.get("candidate") || process.env.PARITY_CANDIDATE_URL;

if (!candidateArg || candidateArg === true) {
  throw new Error("Pass --candidate=https://HOST (or PARITY_CANDIDATE_URL) to select the review deployment.");
}

const candidateBase = String(candidateArg).replace(/\/$/, "");
const concurrency = positiveInteger(args.get("concurrency"), 12, "concurrency");
const attempts = positiveInteger(args.get("attempts"), 5, "attempts");
const timeoutMs = positiveInteger(args.get("timeout-ms"), 30_000, "timeout-ms");
const progressEvery = positiveInteger(args.get("progress-every"), 25, "progress-every");
const limit = args.has("limit") ? positiveInteger(args.get("limit"), null, "limit") : Number.POSITIVE_INFINITY;
const userAgent = "personal-platform-cside-parity/2.0";
const auditStartedAt = performance.now();
let networkRetries = 0;

function elapsed() {
  return `${((performance.now() - auditStartedAt) / 1_000).toFixed(1)}s`;
}

function progress(stage, message) {
  console.error(`[cside-parity ${elapsed()}] ${stage}: ${message}`);
}

function attributes(tag) {
  const result = {};
  for (const match of tag.matchAll(/([:\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
    result[match[1].toLowerCase()] = decodeHtml(match[2] ?? match[3] ?? "");
  }
  return result;
}

function headContract(html) {
  const title = decodeHtml(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() || "");
  const meta = {};
  for (const tag of html.match(/<meta\b[^>]*>/gi) || []) {
    const attrs = attributes(tag);
    const key = attrs.name || attrs.property;
    if (key && attrs.content !== undefined) meta[key.toLowerCase()] = attrs.content;
  }
  const links = {};
  for (const tag of html.match(/<link\b[^>]*>/gi) || []) {
    const attrs = attributes(tag);
    if (attrs.rel && attrs.href) links[attrs.rel.toLowerCase()] = attrs.href;
  }
  return {
    title,
    description: meta.description || "",
    canonical: links.canonical || "",
    generator: meta.generator || "",
    ogType: meta["og:type"] || "",
    ogUrl: meta["og:url"] || "",
    ogTitle: meta["og:title"] || "",
    ogDescription: meta["og:description"] || "",
    ogImage: meta["og:image"] || "",
    twitterCard: meta["twitter:card"] || "",
    twitterUrl: meta["twitter:url"] || "",
    twitterTitle: meta["twitter:title"] || "",
    twitterDescription: meta["twitter:description"] || "",
    twitterImage: meta["twitter:image"] || "",
  };
}

async function request(url, options = {}) {
  return isolatedRequest(url, {
    attempts,
    timeoutMs,
    redirect: options.redirect || "follow",
    headers: { "User-Agent": userAgent, ...options.headers },
    onRetry({ attempt, attempts: maximumAttempts, error }) {
      networkRetries += 1;
      if (networkRetries <= 10 || networkRetries % 25 === 0) {
        progress(
          "network retry",
          `event ${networkRetries}; attempt ${attempt}/${maximumAttempts - 1} ${url} (${error.message})`,
        );
      }
    },
  });
}

async function sitemapPaths() {
  progress("sitemap", `fetching ${referenceBase}/sitemap-index.xml`);
  const index = await request(`${referenceBase}/sitemap-index.xml`);
  if (!index.response.ok) throw new Error(`Reference sitemap index returned HTTP ${index.response.status}`);
  const sitemapUrls = [...index.body.toString().matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => decodeHtml(match[1]));
  const paths = [];
  for (const [index, sitemapUrl] of sitemapUrls.entries()) {
    progress("sitemap", `fetching child ${index + 1}/${sitemapUrls.length}: ${sitemapUrl}`);
    const sitemap = await request(sitemapUrl);
    if (!sitemap.response.ok) throw new Error(`${sitemapUrl} returned HTTP ${sitemap.response.status}`);
    for (const match of sitemap.body.toString().matchAll(/<loc>([^<]+)<\/loc>/g)) {
      paths.push(new URL(decodeHtml(match[1])).pathname);
    }
  }
  return [...new Set(paths)];
}

async function mapConcurrent(values, mapper, stage) {
  const output = new Array(values.length);
  let cursor = 0;
  let completed = 0;
  progress(stage, `starting ${values.length} checks at concurrency ${Math.min(concurrency, values.length)}`);
  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, async () => {
    while (cursor < values.length) {
      const index = cursor++;
      output[index] = await mapper(values[index], index);
      completed += 1;
      if (completed === values.length || completed % progressEvery === 0) {
        progress(stage, `${completed}/${values.length} complete`);
      }
    }
  }));
  return output;
}

function diffObject(reference, candidate) {
  return Object.fromEntries(
    Object.keys(reference)
      .filter((key) => reference[key] !== candidate[key])
      .map((key) => [key, { reference: reference[key], candidate: candidate[key] }]),
  );
}

function routeFamily(path) {
  if (path === "/") return "/";
  const segment = path.split("/").filter(Boolean)[0];
  return segment ? `/${segment}` : "/";
}

function familyCounts(results) {
  return Object.fromEntries([...results.reduce((counts, result) => {
    const family = routeFamily(result.path);
    counts.set(family, (counts.get(family) ?? 0) + 1);
    return counts;
  }, new Map())].sort(([left], [right]) => left.localeCompare(right)));
}

async function requestPair(path, options) {
  return Promise.all([
    request(referenceBase + path, options),
    request(candidateBase + path, options),
  ]);
}

const sitemapRoutePaths = await sitemapPaths();
if (sitemapRoutePaths.length !== EXPECTED_SITEMAP_ROUTE_COUNT) {
  throw new Error(
    `Strict route assertion failed: expected ${EXPECTED_SITEMAP_ROUTE_COUNT} unique sitemap routes, found ${sitemapRoutePaths.length}.`,
  );
}

const allRoutePaths = [...new Set([...sitemapRoutePaths, "/404", "/__cside_parity_missing__/"])];
if (allRoutePaths.length !== EXPECTED_AUDITED_ROUTE_COUNT) {
  throw new Error(
    `Strict route assertion failed: expected ${EXPECTED_AUDITED_ROUTE_COUNT} audited routes, found ${allRoutePaths.length}.`,
  );
}
const paths = allRoutePaths.slice(0, limit);
const fullRouteAudit = paths.length === EXPECTED_AUDITED_ROUTE_COUNT;
if (!fullRouteAudit) {
  progress("routes", `diagnostic --limit selected ${paths.length}/${EXPECTED_AUDITED_ROUTE_COUNT}; this run cannot pass strict parity`);
}

const routeResults = await mapConcurrent(paths, async (path) => {
  const [reference, candidate] = await requestPair(path, { redirect: "manual" });
  const statusMismatch = reference.response.status !== candidate.response.status;
  const contentType = reference.response.headers.get("content-type") || "";
  const referenceHead = contentType.includes("text/html") ? headContract(reference.body.toString()) : null;
  const candidateHead = referenceHead ? headContract(candidate.body.toString()) : null;
  const metadataDiff = referenceHead && candidateHead ? diffObject(referenceHead, candidateHead) : {};
  const referenceBody = referenceHead ? semanticBodyContract(reference.body.toString(), path) : null;
  const candidateBody = referenceBody ? semanticBodyContract(candidate.body.toString(), path) : null;
  const semanticDiff = referenceBody && candidateBody ? diffObject(referenceBody, candidateBody) : {};
  return {
    path,
    referenceStatus: reference.response.status,
    candidateStatus: candidate.response.status,
    statusMismatch,
    metadataDiff,
    semanticDiff,
  };
}, "routes + metadata");

const exactEndpoints = [
  "/rss-styles.xsl",
  "/sitemap-index.xml",
  "/sitemap-0.xml",
  "/app.webmanifest",
  "/search-index.json",
  "/agent/full-index.json",
  "/agent/suggest-index.json",
  "/giscus/light.css",
  "/giscus/dark.css",
  "/music/data.json",
  "/joruno.ico",
  "/joruno.png",
  "/joruno.svg",
  "/apple-touch-icon.png",
  "/favicon.ico",
  "/favicon.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-mask.png",
  "/og-images/og-image.png",
];

progress("dynamic endpoint discovery", "locating the content-addressed Photos data file");
const referencePhotos = await request(`${referenceBase}/photos/`);
const photoHtml = referencePhotos.body.toString();
const photoHash = photoHtml.match(/data-hash=["']([\da-f]+)["']/i)?.[1];
const photoDataPath = photoHtml.match(/\/photos\/photos\.[\da-f]+\.json/i)?.[0]
  || (photoHash ? `/photos/photos.${photoHash}.json` : null);
if (photoDataPath) exactEndpoints.push(photoDataPath);

const exactResults = await mapConcurrent(exactEndpoints, async (path) => {
  const [reference, candidate] = await requestPair(path);
  return exactBodyResult(path, reference, candidate);
}, "exact static endpoints");

progress("robots.txt", "comparing application policy after scoped Cloudflare Managed Content removal");
const [referenceRobots, candidateRobots] = await requestPair("/robots.txt");
const robotsResult = exactBodyResult(
  "/robots.txt",
  referenceRobots,
  candidateRobots,
  normalizeCloudflareManagedRobots,
);

progress("Review docs catalog", "performing dedicated byte-for-byte comparison with production");
const [referenceDocsCatalog, candidateDocsCatalog] = await requestPair("/docs/catalog.json");
const docsCatalogResult = exactBodyResult(
  "/docs/catalog.json",
  referenceDocsCatalog,
  candidateDocsCatalog,
);

const absentEndpoints = [
  "/404/",
  "/sitemap.xml",
  "/agent/scenes.json",
  "/agent/suggest-index.static.json",
  "/docs/catalog.static.json",
  "/knowledge/",
  "/tools/",
  "/search/?q=parity",
  "/music/albums/__removed_public_route__/",
  "/projects/__removed_public_route__/",
  "/docs/__removed_public_route__/",
];
const absentResults = await mapConcurrent(absentEndpoints, async (path) => {
  const [reference, candidate] = await requestPair(path, { redirect: "manual" });
  return {
    path,
    referenceStatus: reference.response.status,
    candidateStatus: candidate.response.status,
    equal: reference.response.status === candidate.response.status,
  };
}, "absent/removed endpoints");

const routeMismatches = routeResults.filter((result) => (
  result.statusMismatch
  || Object.keys(result.metadataDiff).length
  || Object.keys(result.semanticDiff).length
));
const endpointMismatches = exactResults.filter((result) => !result.equal);
const absentEndpointMismatches = absentResults.filter((result) => !result.equal);
const semanticMismatches = routeResults.filter((result) => Object.keys(result.semanticDiff).length);
const routeMismatchFamilies = familyCounts(routeMismatches);
const semanticMismatchFamilies = familyCounts(semanticMismatches);
const familySamples = Object.fromEntries(
  [...new Set(routeMismatches.map((result) => routeFamily(result.path)))]
    .sort()
    .map((family) => [family, routeMismatches.find((result) => routeFamily(result.path) === family)]),
);
const report = {
  referenceBase,
  candidateBase,
  durationSeconds: Number(((performance.now() - auditStartedAt) / 1_000).toFixed(3)),
  networkRetries,
  strictRouteAssertion: {
    expectedSitemapRoutes: EXPECTED_SITEMAP_ROUTE_COUNT,
    discoveredSitemapRoutes: sitemapRoutePaths.length,
    expectedAuditedRoutes: EXPECTED_AUDITED_ROUTE_COUNT,
    checkedRoutes: routeResults.length,
    passed: fullRouteAudit,
  },
  routeMismatches: routeMismatches.length,
  routeMismatchFamilies,
  semanticRouteMismatches: semanticMismatches.length,
  semanticMismatchFamilies,
  exactEndpoints: exactResults.length,
  endpointMismatches: endpointMismatches.length,
  robots: robotsResult,
  reviewDocsCatalog: docsCatalogResult,
  absentEndpoints: absentResults.length,
  absentEndpointMismatches: absentEndpointMismatches.length,
  samples: {
    routes: routeMismatches.slice(0, 30),
    routesByFamily: familySamples,
    endpoints: endpointMismatches,
    absentEndpoints: absentEndpointMismatches,
  },
};

progress("complete", `${routeResults.length} routes checked; writing JSON report`);
console.log(JSON.stringify(report, null, 2));
if (
  !fullRouteAudit
  || routeMismatches.length
  || endpointMismatches.length
  || !robotsResult.equal
  || !docsCatalogResult.equal
  || absentEndpointMismatches.length
) process.exitCode = 1;
