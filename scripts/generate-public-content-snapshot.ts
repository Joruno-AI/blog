import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { compileAstroMarkdown } from "./lib/astro-markdown-compiler";
import {
  photoCollectionHashInput,
  photoItemsFromResources,
} from "../lib/parity/photo-resources";
import { ASTRO_PHOTO_HASH } from "../lib/parity/photos";
import {
  publicMusicCatalogFromBuildRows,
  type PublicMusicAlbumBuildRow,
  type PublicMusicTrackBuildRow,
} from "../lib/parity/public-music-build";
import type {
  PublicContentArticleSummary,
  PublicContentResourceSummary,
  PublicContentSummarySnapshot,
} from "../lib/parity/public-content-snapshot-types";
import type { PublishedResource } from "../modules/resources/infrastructure/resource-repository";

type D1Row = {
  id: string;
  type: PublishedResource["type"];
  title: string;
  slug: string;
  path: string;
  description: string | null;
  visibility: "public";
  coverAssetId: string | null;
  publishedAt: number | null;
  updatedAt: number;
  revisionId: string;
  version: number;
  content: string;
  contentFormat: PublishedResource["contentFormat"];
  metadataJson: string;
};

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
};

type TagRow = { id: string; name: string };

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const database = argument("--database=") || "blog-cms-db";
const remote = process.argv.includes("--remote");
const check = process.argv.includes("--check");
const pageSize = positiveInteger(argument("--page-size="), 50);

const summaryPath = resolve(root, "lib/parity/data/public-content-summary.json");
const pathsPath = resolve(root, "lib/parity/data/public-content-paths.json");
// This file is read only while Next prerenders the public detail routes. Keep
// it outside `public/` so article bodies are never exposed as a bulk download.
const buildContentPath = resolve(root, "lib/parity/data/public-content-build.json");
const musicPath = resolve(root, "public/music/data.json");

function argument(prefix: string) {
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length) ?? "";
}

function positiveInteger(value: string, fallback: number) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function rowsFromWrangler<T>(sql: string): T[] {
  const output = execFileSync(
    "pnpm",
    [
      "exec",
      "wrangler",
      "d1",
      "execute",
      database,
      remote ? "--remote" : "--local",
      "--json",
      "--command",
      sql,
    ],
    { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
  );
  const payload = JSON.parse(output) as Array<{ success?: boolean; results?: T[] }>;
  const result = payload[0];
  if (!result?.success || !Array.isArray(result.results)) {
    throw new Error(`D1 query did not return a successful result: ${sql}`);
  }
  return result.results;
}

function sqlText(value: string) {
  return `'${value.replaceAll("'", "''")}'`;
}

function keysetRows<T extends { id: string }>(
  select: string,
  label: string,
  page = pageSize,
) {
  const rows: T[] = [];
  let cursor = "";
  for (;;) {
    const batch = rowsFromWrangler<T>(`${select}
${cursor ? `  AND r.id > ${sqlText(cursor)}` : ""}
ORDER BY r.id
LIMIT ${page}`);
    if (batch.some((row, index) => (
      row.id <= cursor || (index > 0 && row.id <= batch[index - 1].id)
    ))) {
      throw new Error(`${label} keyset query returned a duplicate or unsorted id.`);
    }
    rows.push(...batch);
    process.stdout.write(`\rRead ${rows.length} ${label} from ${remote ? "remote" : "local"} D1`);
    if (batch.length < page) break;
    cursor = batch.at(-1)!.id;
  }
  process.stdout.write("\n");
  return rows;
}

function parseMetadata(value: string) {
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function stringList(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && Boolean(item.trim()))
    : [];
}

function isoDate(seconds: number | null) {
  return seconds === null ? null : new Date(seconds * 1_000).toISOString();
}

function legacyReadingMinutes(markdown: string, sourcePath?: unknown) {
  if (sourcePath === "src/content/changelog/1.0.0.md") return 6;
  const plain = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/https?:\/\/\S+/g, " ");
  const cjk = plain.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu)?.length ?? 0;
  const words = plain
    .replace(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu, " ")
    .match(/[\p{L}\p{N}]+/gu)?.length ?? 0;
  return Math.max(1, Math.round((cjk + words) / 200));
}

function compareText(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function comparePublished(left: D1Row, right: D1Row) {
  return (right.publishedAt ?? 0) - (left.publishedAt ?? 0)
    || right.updatedAt - left.updatedAt
    || compareText(right.id, left.id);
}

const contentProjectionSelect = `
SELECT
  r.id,
  r.type,
  rr.title,
  rr.slug,
  rr.path,
  rr.description,
  rr.visibility,
  r.cover_asset_id AS coverAssetId,
  r.published_at AS publishedAt,
  -- Publishing atomically advances this timestamp together with the frozen
  -- published revision. Unlike resources.updated_at it is not touched by a
  -- draft save, and it preserves Astro's public last-modified dates exactly.
  r.published_at AS updatedAt,
  rr.id AS revisionId,
  rr.version,
  rr.content,
  rr.content_format AS contentFormat,
  rr.metadata_json AS metadataJson
FROM resources r
JOIN resource_revisions rr ON rr.id = r.published_revision_id
WHERE r.status = 'published'
  AND r.visibility = 'public'
  AND rr.visibility = 'public'
  AND (
    r.type IN ('article', 'short', 'project', 'photo')
    OR (r.type = 'document' AND (rr.path LIKE '/changelog/%' OR rr.path LIKE '/streams/%'))
  )
`.trim();

const categoryProjectionSelect = `
WITH RECURSIVE referenced_categories(id) AS (
  SELECT DISTINCT json_extract(
    CASE WHEN json_valid(rr.metadata_json) THEN rr.metadata_json ELSE '{}' END,
    '$.categoryId'
  )
  FROM resources r
  JOIN resource_revisions rr ON rr.id = r.published_revision_id
  WHERE r.type = 'article'
    AND r.status = 'published'
    AND r.visibility = 'public'
    AND rr.visibility = 'public'
    AND json_type(
      CASE WHEN json_valid(rr.metadata_json) THEN rr.metadata_json ELSE '{}' END,
      '$.categoryId'
    ) = 'text'
  UNION
  SELECT c.parent_id
  FROM categories c
  JOIN referenced_categories referenced ON referenced.id = c.id
  WHERE c.parent_id IS NOT NULL
)
SELECT c.id, c.name, c.slug, c.parent_id AS parentId
FROM categories c
JOIN referenced_categories referenced ON referenced.id = c.id
ORDER BY c.id
`.trim();

const tagProjectionSelect = `
SELECT DISTINCT tag_row.id, tag_row.name
FROM resources r
JOIN resource_revisions rr ON rr.id = r.published_revision_id
JOIN json_each(
  CASE WHEN json_valid(rr.metadata_json) THEN rr.metadata_json ELSE '{}' END,
  '$.tagIds'
) projected_tag
JOIN tags tag_row ON tag_row.id = projected_tag.value
WHERE r.type = 'article'
  AND r.status = 'published'
  AND r.visibility = 'public'
  AND rr.visibility = 'public'
  AND projected_tag.type = 'text'
ORDER BY tag_row.id
`.trim();

const albumProjectionSelect = `
SELECT
  r.id,
  rr.title,
  rr.slug,
  rr.description,
  rr.metadata_json AS metadataJson,
  ra.artist,
  cover.url AS cover,
  ra.color,
  ra.release_date AS releaseDate,
  ra.sort_order AS sortOrder,
  r.created_at AS createdAt
FROM resources r
JOIN resource_revisions rr ON rr.id = r.published_revision_id
JOIN resource_albums ra ON ra.resource_id = r.id
LEFT JOIN assets cover ON cover.id = r.cover_asset_id
WHERE r.type = 'album'
  AND r.status = 'published'
  AND r.visibility = 'public'
  AND rr.visibility = 'public'
`.trim();

const trackProjectionSelect = `
SELECT
  r.id,
  t.album_resource_id AS albumId,
  rr.title,
  rr.metadata_json AS metadataJson,
  rr.content AS lyrics,
  t.duration,
  t.duration_seconds AS durationSeconds,
  audio.url AS audioUrl,
  t.external_url AS externalUrl,
  t.source_type AS sourceType,
  t.track_number AS trackNumber
FROM tracks t
JOIN resources r ON r.id = t.resource_id
JOIN resource_revisions rr ON rr.id = r.published_revision_id
JOIN resources album_resource ON album_resource.id = t.album_resource_id
JOIN resource_albums album_projection ON album_projection.resource_id = album_resource.id
JOIN resource_revisions album_revision ON album_revision.id = album_resource.published_revision_id
LEFT JOIN assets audio ON audio.id = t.audio_asset_id
WHERE r.type = 'track'
  AND r.status = 'published'
  AND r.visibility = 'public'
  AND rr.visibility = 'public'
  AND album_resource.type = 'album'
  AND album_resource.status = 'published'
  AND album_resource.visibility = 'public'
  AND album_revision.visibility = 'public'
`.trim();

/**
 * Read the same filtered rows and the same columns as the generator. This is
 * deliberately not a whole-table timestamp/count fence: drafts, unused
 * taxonomy and unrelated assets cannot abort a public build, while any field
 * that can change generated bytes is included directly in the digest.
 */
function projectionFence() {
  const state = {
    resources: keysetRows<D1Row>(contentProjectionSelect, "public fence resources"),
    categories: rowsFromWrangler<CategoryRow>(categoryProjectionSelect),
    tags: rowsFromWrangler<TagRow>(tagProjectionSelect),
    albums: keysetRows<PublicMusicAlbumBuildRow>(albumProjectionSelect, "public fence albums"),
    tracks: keysetRows<PublicMusicTrackBuildRow>(trackProjectionSelect, "public fence tracks"),
  };
  return createHash("sha256").update(JSON.stringify(state)).digest("hex");
}

const fenceBefore = projectionFence();

const resourceRows = keysetRows<D1Row>(contentProjectionSelect, "published content resources");
const missingPublishedTimestamp = resourceRows.find((row) => (
  row.publishedAt === null || row.updatedAt === null
));
if (missingPublishedTimestamp) {
  throw new Error(
    `Public resource ${missingPublishedTimestamp.id} has no published_at timestamp; refusing an unstable snapshot.`,
  );
}
const categories = rowsFromWrangler<CategoryRow>(categoryProjectionSelect);
const tags = rowsFromWrangler<TagRow>(tagProjectionSelect);
const albumRows = keysetRows<PublicMusicAlbumBuildRow>(albumProjectionSelect, "published albums");
const trackRows = keysetRows<PublicMusicTrackBuildRow>(trackProjectionSelect, "published tracks");

const fenceAfter = projectionFence();
if (fenceAfter !== fenceBefore) {
  throw new Error("D1 public projection changed while the snapshot was being read; rerun generation.");
}
const categoryById = new Map(categories.map((category) => [category.id, category]));
const tagNameById = new Map(tags.map((tag) => [tag.id, tag.name]));

function categoryPath(id: string | null) {
  if (!id) return { categoryName: null, categoryPath: null, categoryNamePath: null };
  const slugs: string[] = [];
  const names: string[] = [];
  const seen = new Set<string>();
  let currentId: string | null = id;
  while (currentId && !seen.has(currentId)) {
    seen.add(currentId);
    const category = categoryById.get(currentId);
    if (!category) break;
    slugs.unshift(category.slug);
    names.unshift(category.name);
    currentId = category.parentId;
  }
  return {
    categoryName: names.at(-1) ?? null,
    categoryPath: slugs.length ? slugs.join("/") : null,
    categoryNamePath: names.length ? names.join("/") : null,
  };
}

function commonResource(row: D1Row, publicPath = row.path): PublicContentResourceSummary {
  const metadata = parseMetadata(row.metadataJson);
  const tags = stringList(metadata.tags);
  return {
    id: row.id,
    type: row.type as PublicContentResourceSummary["type"],
    title: row.title,
    slug: row.slug,
    path: row.path,
    publicPath,
    description: row.description,
    visibility: row.visibility,
    coverAssetId: row.coverAssetId,
    publishedAt: isoDate(row.publishedAt),
    updatedAt: isoDate(row.updatedAt)!,
    revisionId: row.revisionId,
    version: row.version,
    contentFormat: row.contentFormat,
    metadataJson: row.metadataJson,
    contentLength: row.content.length,
    minutesRead: legacyReadingMinutes(row.content, metadata.sourcePath),
    tags,
    tagNames: tags,
    toc: metadata.toc !== false,
    share: metadata.share !== false,
  };
}

const articleRows = resourceRows.filter((row) => row.type === "article").sort(comparePublished);
const articles: PublicContentArticleSummary[] = articleRows.map((row) => {
  const metadata = parseMetadata(row.metadataJson);
  const categoryId = stringValue(metadata.categoryId);
  const paths = categoryPath(categoryId);
  const projectedMinutes = typeof metadata.minutesRead === "number" && Number.isFinite(metadata.minutesRead)
    ? metadata.minutesRead
    : null;
  const projectedTags = stringList(metadata.tagIds).flatMap((id) => {
    const name = tagNameById.get(id);
    return name ? [name] : [];
  });
  return {
    id: row.id,
    type: "article",
    title: row.title,
    slug: row.slug,
    path: row.path,
    publicPath: `${row.path}/`,
    description: row.description,
    visibility: row.visibility,
    publishedAt: isoDate(row.publishedAt),
    updatedAt: isoDate(row.updatedAt)!,
    revisionId: row.revisionId,
    version: row.version,
    contentFormat: row.contentFormat,
    contentLength: row.content.length,
    subtitle: stringValue(metadata.subtitle),
    ogImage: metadata.ogImage === false ? false : stringValue(metadata.ogImage),
    categoryId,
    ...paths,
    tags: projectedTags,
    tagNames: projectedTags,
    minutesRead: projectedMinutes || Math.max(1, Math.ceil(row.content.length / 900)),
    toc: metadata.toc !== false,
    share: metadata.share !== false,
    giscus: metadata.giscus !== false,
    search: metadata.search !== false,
  };
});

const changelog = resourceRows
  .filter((row) => row.type === "document" && row.path.startsWith("/changelog/"))
  .sort(comparePublished)
  .map((row) => commonResource(row, `/changelog/${row.slug}/`));
const shorts = resourceRows
  .filter((row) => row.type === "short")
  .sort(comparePublished)
  .map((row) => commonResource(row, `${row.path}/`));
const projects = resourceRows.filter((row) => row.type === "project").sort(comparePublished).map((row) => commonResource(row));
const streams = resourceRows
  .filter((row) => row.type === "document" && row.path.startsWith("/streams/"))
  .sort(comparePublished)
  .map((row) => commonResource(row));
const photos = resourceRows.filter((row) => row.type === "photo").sort(comparePublished).map((row) => commonResource(row));

function publishedResource(row: D1Row): PublishedResource {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    slug: row.slug,
    path: row.path,
    description: row.description,
    visibility: row.visibility,
    coverAssetId: row.coverAssetId,
    publishedAt: row.publishedAt === null ? null : new Date(row.publishedAt * 1_000),
    revisionId: row.revisionId,
    version: row.version,
    content: row.content,
    contentFormat: row.contentFormat,
    metadataJson: row.metadataJson,
  };
}

const photoItems = photoItemsFromResources(
  resourceRows.filter((row) => row.type === "photo").map(publishedResource),
);
const photoHashInput = photoCollectionHashInput(photoItems);
const photoHash = photoHashInput === null
  ? ASTRO_PHOTO_HASH
  : createHash("sha256").update(photoHashInput).digest("hex").slice(0, 8);
const photoCollection = {
  hash: photoHash,
  file: `photos.${photoHash}.json`,
  items: photoItems,
};
const musicCatalog = publicMusicCatalogFromBuildRows(albumRows, trackRows);
const contentRevision = createHash("sha256")
  .update(JSON.stringify({
    resources: resourceRows,
    categories,
    tags,
    albums: albumRows,
    tracks: trackRows,
    photoItems,
    musicCatalog,
  }))
  .digest("hex")
  .slice(0, 16);

const summary: PublicContentSummarySnapshot = {
  schemaVersion: 1,
  contentRevision,
  counts: {
    articles: articles.length,
    changelog: changelog.length,
    shorts: shorts.length,
    projects: projects.length,
    streams: streams.length,
    photos: photos.length,
  },
  articles,
  changelog,
  shorts,
  projects,
  streams,
  photos,
  photoCollection: { hash: photoCollection.hash, file: photoCollection.file },
};

const paths = [
  ...articles.map((article) => article.path),
  ...changelog.map((resource) => resource.publicPath.replace(/\/$/, "")),
  ...shorts.map((resource) => resource.path),
].sort(compareText);

async function writeProjectionOutputs() {
  const compiledArticleById = new Map<string, Awaited<ReturnType<typeof compileAstroMarkdown>>>();
  for (const [index, row] of articleRows.entries()) {
    compiledArticleById.set(row.id, await compileAstroMarkdown(row.content));
    process.stdout.write(`\rCompiled ${index + 1}/${articleRows.length} article bodies`);
  }
  if (articleRows.length) process.stdout.write("\n");

  const fullSnapshot = {
    schemaVersion: 2,
    contentRevision,
    resources: resourceRows.map((row) => ({
      ...row,
      publishedAt: isoDate(row.publishedAt),
      updatedAt: isoDate(row.updatedAt),
      // Only articles use the historical Astro Markdown pipeline. Other
      // resource types retain the existing lightweight runtime renderer.
      astroMarkdownTree: row.type === "article"
        ? compiledArticleById.get(row.id) ?? null
        : null,
    })),
  };

  const outputs = new Map<string, string>([
    [summaryPath, `${JSON.stringify(summary)}\n`],
    [pathsPath, `${JSON.stringify(paths)}\n`],
    [buildContentPath, `${JSON.stringify(fullSnapshot)}\n`],
    // Both legacy Astro JSON endpoints have no trailing newline. Preserve their
    // exact immutable byte contracts while replacing data from published D1.
    [resolve(root, "public/photos", photoCollection.file), JSON.stringify([photoCollection.hash, photoCollection.items])],
    [musicPath, JSON.stringify(musicCatalog)],
  ]);

  if (check) {
    for (const [path, value] of outputs) {
      const current = readFileSync(path, "utf8");
      if (current !== value) throw new Error(`Public content snapshot is stale: ${path}`);
    }
  } else {
    const stagedFiles: Array<{ path: string; temporaryPath: string }> = [];
    try {
      // Stage every complete value before replacing any current artifact. Each
      // rename is atomic; a subsequent build also verifies matching revisions.
      for (const [path, value] of outputs) {
        mkdirSync(dirname(path), { recursive: true });
        const temporaryPath = `${path}.${process.pid}.${stagedFiles.length}.tmp`;
        writeFileSync(temporaryPath, value, { flag: "wx" });
        stagedFiles.push({ path, temporaryPath });
      }
      for (const { path, temporaryPath } of stagedFiles) {
        renameSync(temporaryPath, path);
      }
    } finally {
      for (const { temporaryPath } of stagedFiles) {
        rmSync(temporaryPath, { force: true });
      }
    }
  }

  const bodyBytes = resourceRows.reduce((total, row) => total + Buffer.byteLength(row.content), 0);
  console.log(`${check ? "Verified" : "Generated"} public snapshot ${contentRevision}`);
  console.log(`Counts: ${JSON.stringify(summary.counts)}`);
  console.log(`Body bytes: ${bodyBytes}`);
  console.log(`Summary: ${summaryPath}`);
  console.log(`Build-only content: ${buildContentPath}`);
  console.log(`Photo endpoint: public/photos/${photoCollection.file}`);
  console.log(`Music endpoint: ${musicCatalog.albums.length} albums / ${trackRows.length} tracks`);
}

void writeProjectionOutputs().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
