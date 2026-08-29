const base = (process.env.SMOKE_BASE_URL || process.argv[2] || "http://127.0.0.1:8788").replace(/\/$/, "");

const checks = [
  ["/", 200],
  ["/blog", 200],
  ["/music", 200],
  ["/photos", 200],
  ["/docs", 200],
  ["/agent", 200],
  ["/agent/all", 200],
  ["/agent/scenes", 200],
  ["/agent/anthropics/skills", 200],
  ["/knowledge", 200],
  ["/projects", 200],
  ["/feeds", 200],
  ["/prs", 200],
  ["/releases", 200],
  ["/login", 200],
  ["/studio", 307],
  ["/search?q=Next", 200],
  ["/rss.xml", 200],
  ["/sitemap.xml", 200],
  ["/og-images/smoke.png", 307],
  ["/blog/__smoke_missing_resource__", 404],
];

for (const [path, expected] of checks) {
  const response = await fetch(base + path, { redirect: "manual" });
  if (response.status !== expected) {
    throw new Error(`${path}: expected ${expected}, received ${response.status}`);
  }
  console.log(`PASS ${response.status} ${path}`);
}

const fakeAuth = await fetch(`${base}/api/posts?limit=1`, {
  headers: { cookie: "better-auth.session_token=fake.invalid" },
  redirect: "manual",
});
if (fakeAuth.status !== 401) {
  throw new Error(`/api/posts fake auth: expected 401, received ${fakeAuth.status}`);
}
console.log("PASS 401 /api/posts fake auth");

const schedulerWithoutSecret = await fetch(`${base}/api/jobs/run`, {
  method: "POST",
  redirect: "manual",
});
if (schedulerWithoutSecret.status !== 401) {
  throw new Error(`/api/jobs/run without secret: expected 401, received ${schedulerWithoutSecret.status}`);
}
console.log("PASS 401 /api/jobs/run without secret");

const music = await fetch(`${base}/api/public/music`).then((response) => response.json());
if (!Array.isArray(music.albums) || music.albums.length === 0) {
  throw new Error("Public music API returned no migrated albums");
}
const albumResponse = await fetch(`${base}/music/albums/${encodeURIComponent(music.albums[0].id)}`);
if (albumResponse.status !== 200) {
  throw new Error(`First album page: expected 200, received ${albumResponse.status}`);
}
console.log(`PASS 200 /music/albums/${music.albums[0].id}`);

const photosHtml = await fetch(`${base}/photos`).then((response) => response.text());
const photoUrl = photosHtml.match(/\\"url\\":\\"(https:[^"\\]+)/)?.[1];
if (!photoUrl || !photosHtml.includes('aria-label="查看')) {
  throw new Error("Photo gallery returned no migrated photos");
}
const photoResponse = await fetch(photoUrl);
if (!photoResponse.ok || !photoResponse.headers.get("content-type")?.startsWith("image/")) {
  throw new Error(`First photo asset: expected an image, received ${photoResponse.status}`);
}
console.log("PASS migrated photo gallery and R2 asset");

const ogImageResponse = await fetch(`${base}/og-images/og-image.png`);
if (!ogImageResponse.ok || ogImageResponse.headers.get("content-type") !== "image/png") {
  throw new Error(`Fallback OG image: expected image/png, received ${ogImageResponse.status}`);
}
console.log("PASS 200 /og-images/og-image.png");

const docsCatalog = await fetch(`${base}/docs/catalog.json`).then((response) => response.json());
if (docsCatalog.stats?.courses !== 349 || docsCatalog.stats?.articles !== 13_034) {
  throw new Error("Docs catalog did not preserve the complete Astro course index");
}
console.log("PASS 13034 /docs/catalog.json chapters");

const agentIndex = await fetch(`${base}/agent/full-index.json`).then((response) => response.json());
if (!Array.isArray(agentIndex.items) || agentIndex.items.length !== 28_868) {
  throw new Error("Agent catalog did not preserve the complete Astro project index");
}
console.log("PASS 28868 /agent/full-index.json projects");
