import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildSnapshotRssXml,
  buildSnapshotSearchIndexJson,
  buildSnapshotSitemapXml,
  PUBLIC_CONTENT_ENDPOINT_REVISION,
} from "../lib/parity/public-content-endpoints";
import { RSS_LAST_BUILD_DATE_TOKEN } from "../lib/parity/rss-template";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const check = process.argv.includes("--check");
const rssTemplatePath = resolve(root, "lib/parity/data/rss-template.json");
const sentinel = new Date(0);
const sentinelText = sentinel.toUTCString();
const rssXml = buildSnapshotRssXml(sentinel);
const marker = `<lastBuildDate>${sentinelText}</lastBuildDate>`;

if (rssXml.split(marker).length !== 2) {
  throw new Error("Generated RSS must contain exactly one lastBuildDate element");
}

const rssTemplate = rssXml.replace(
  marker,
  `<lastBuildDate>${RSS_LAST_BUILD_DATE_TOKEN}</lastBuildDate>`,
);
const output = `${JSON.stringify({
  contentRevision: PUBLIC_CONTENT_ENDPOINT_REVISION,
  template: rssTemplate,
})}\n`;

if (check) {
  if (readFileSync(rssTemplatePath, "utf8") !== output) {
    throw new Error("RSS template is stale; run data:generate:public-endpoints");
  }
} else {
  writeFileSync(rssTemplatePath, output);
}

for (const [name, value] of [
  ["sitemap-0.xml", buildSnapshotSitemapXml()],
  ["search-index.json", buildSnapshotSearchIndexJson()],
  ["rss-template.xml", rssTemplate],
] as const) {
  const hash = createHash("sha256").update(value).digest("hex");
  console.log(`${name}: ${Buffer.byteLength(value)} bytes sha256=${hash}`);
}
