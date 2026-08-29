import { execFileSync } from "node:child_process";

const remote = process.argv.includes("--remote");
const sourceArg = process.argv.find((value) => value.startsWith("--source="));
const source = sourceArg?.slice("--source=".length) || "https://wangshengliang.cn/search-index.json";

const response = await fetch(source, { headers: { "User-Agent": "personal-platform-parity/1.0" } });
if (!response.ok) throw new Error(`Astro index request failed: HTTP ${response.status}`);
const index = await response.json();
if (!Array.isArray(index)) throw new Error("Astro search index must be an array");

const astro = new Map(index
  .filter((entry) => entry?.collection === "blog" && typeof entry.url === "string")
  .map((entry) => {
    const path = decodeURIComponent(new URL(entry.url, source).pathname).replace(/\/$/, "") || "/";
    return [path, { title: entry.title || "", description: entry.description || "" }];
  }));

const wrangler = execFileSync("pnpm", [
  "exec", "wrangler", "d1", "execute", "blog-cms-db",
  remote ? "--remote" : "--local", "--json",
  "--command", "SELECT path,title,description FROM resources WHERE type='article' AND status='published' ORDER BY path;",
], { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] });
const payload = JSON.parse(wrangler);
const rows = payload.flatMap((result) => result.results || []);
const d1 = new Map(rows.map((row) => [String(row.path).replace(/\/$/, "") || "/", row]));

const missing = [...astro.keys()].filter((path) => !d1.has(path));
const extra = [...d1.keys()].filter((path) => !astro.has(path));
const mismatched = [...astro].flatMap(([path, expected]) => {
  const actual = d1.get(path);
  if (!actual) return [];
  return expected.title === actual.title && expected.description === (actual.description || "")
    ? [] : [{ path, expected, actual: { title: actual.title, description: actual.description || "" } }];
});

const report = {
  source,
  database: remote ? "remote" : "local",
  astroArticles: astro.size,
  d1Articles: d1.size,
  missing: missing.length,
  extra: extra.length,
  mismatched: mismatched.length,
  samples: { missing: missing.slice(0, 10), extra: extra.slice(0, 10), mismatched: mismatched.slice(0, 5) },
};
console.log(JSON.stringify(report, null, 2));
if (missing.length || extra.length || mismatched.length) process.exitCode = 1;
