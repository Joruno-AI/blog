import { spawnSync } from "node:child_process";

const mode = process.argv.includes("--remote") ? "--remote" : "--local";
const database = process.env.D1_DATABASE_NAME || "blog-cms-db";

const statements = [
  ["legacy posts", "SELECT count(*) AS value FROM posts", 550],
  ["legacy categories", "SELECT count(*) AS value FROM categories", 23],
  ["legacy albums", "SELECT count(*) AS value FROM albums", 55],
  ["legacy songs", "SELECT count(*) AS value FROM songs", 634],
  ["songs with lyrics", "SELECT count(*) AS value FROM songs WHERE lyrics IS NOT NULL AND trim(lyrics) <> ''", 355],
  ["legacy media", "SELECT count(*) AS value FROM media", 638],
  ["platform resources", "SELECT count(*) AS value FROM resources", 1255],
  ["resource revisions", "SELECT count(*) AS value FROM resource_revisions", 1255],
  ["canonical routes", "SELECT count(*) AS value FROM resource_routes WHERE canonical = 1", 1255],
  ["assets", "SELECT count(*) AS value FROM assets", 638],
  ["articles", "SELECT count(*) AS value FROM articles", 550],
  ["albums", "SELECT count(*) AS value FROM resource_albums", 55],
  ["tracks", "SELECT count(*) AS value FROM tracks", 634],
  ["photos", "SELECT count(*) AS value FROM resources WHERE type = 'photo'", 16],
  ["search rows", "SELECT count(*) AS value FROM resource_search", 1255],
  [
    "unmapped legacy posts",
    "SELECT count(*) AS value FROM posts p LEFT JOIN resources r ON r.id = 'article:' || p.id WHERE r.id IS NULL",
    0,
  ],
  [
    "unmapped legacy albums",
    "SELECT count(*) AS value FROM albums a LEFT JOIN resources r ON r.id = 'album:' || a.id WHERE r.id IS NULL",
    0,
  ],
  [
    "unmapped legacy songs",
    "SELECT count(*) AS value FROM songs s LEFT JOIN resources r ON r.id = 'track:' || s.id WHERE r.id IS NULL",
    0,
  ],
  [
    "unmapped legacy media",
    "SELECT count(*) AS value FROM media m LEFT JOIN assets a ON a.id = 'asset:' || m.id WHERE a.id IS NULL",
    0,
  ],
  [
    "missing current revisions",
    "SELECT count(*) AS value FROM resources r LEFT JOIN resource_revisions rev ON rev.id = r.current_revision_id WHERE rev.id IS NULL",
    0,
  ],
  [
    "missing published revisions",
    "SELECT count(*) AS value FROM resources r LEFT JOIN resource_revisions rev ON rev.id = r.published_revision_id WHERE r.status = 'published' AND rev.id IS NULL",
    0,
  ],
  [
    "published resources without routes",
    "SELECT count(*) AS value FROM resources r LEFT JOIN resource_routes rr ON rr.resource_id = r.id AND rr.canonical = 1 WHERE r.status = 'published' AND rr.resource_id IS NULL",
    0,
  ],
  [
    "duplicate canonical paths",
    "SELECT count(*) AS value FROM (SELECT path FROM resource_routes WHERE canonical = 1 GROUP BY path HAVING count(*) > 1)",
    0,
  ],
  [
    "orphan migrated assets",
    "SELECT count(*) AS value FROM assets a LEFT JOIN media m ON a.id = 'asset:' || m.id WHERE json_extract(a.metadata_json, '$.legacyMediaId') IS NOT NULL AND m.id IS NULL",
    0,
  ],
];

function queryAll(entries) {
  const sql = entries.map(([, statement]) => `${statement};`).join("\n");
  const result = spawnSync(
    "pnpm",
    ["exec", "wrangler", "d1", "execute", database, mode, "--json", "--command", sql],
    { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 }
  );
  if (result.status !== 0) {
    process.stderr.write(result.stderr || result.stdout);
    process.exit(result.status || 1);
  }
  const payload = JSON.parse(result.stdout);
  if (!Array.isArray(payload) || payload.length !== entries.length) {
    throw new Error(`Expected ${entries.length} D1 result sets, received ${payload?.length ?? 0}.`);
  }
  return payload.map((entry, index) => {
    const row = entry?.results?.[0];
    if (!row || typeof row.value !== "number") {
      throw new Error(`Unexpected D1 response for: ${entries[index][1]}`);
    }
    return row.value;
  });
}

let failures = 0;
const values = queryAll(statements);
for (const [index, [name, , expected]] of statements.entries()) {
  const actual = values[index];
  const exact = expected === 0;
  const passed = exact ? actual === expected : actual >= expected;
  if (!passed) {
    failures += 1;
    console.error(`FAIL ${name}: expected ${exact ? "exactly" : "at least"} ${expected}, received ${actual}`);
  } else {
    console.log(`PASS ${name}: ${actual}${exact ? "" : ` (minimum ${expected})`}`);
  }
}

if (failures > 0) {
  throw new Error(`${failures} D1 migration invariant(s) failed.`);
}

console.log(`Verified ${statements.length} D1 migration invariants in ${mode.slice(2)} mode.`);
