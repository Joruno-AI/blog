const base = (process.env.SMOKE_BASE_URL || process.argv[2] || "http://127.0.0.1:8788").replace(/\/$/, "");

const checks = [
  ["/", 200],
  ["/404", 200],
  ["/404/", 308],
  ["/blog/", 200],
  ["/music/", 200],
  ["/photos/", 200],
  ["/docs/", 200],
  ["/agent/", 200],
  ["/agent/all/", 200],
  ["/agent/scenes/", 200],
  ["/agent/anthropics/skills/", 200],
  ["/projects/", 200],
  ["/feeds/", 200],
  ["/prs/", 200],
  ["/releases/", 200],
  ["/login/", 200],
  ["/studio", 307],
  ["/knowledge/", 404],
  ["/tools/", 404],
  ["/search/?q=Next", 404],
  ["/music/albums/__removed_public_route__/", 404],
  ["/projects/__removed_public_route__/", 404],
  ["/docs/__removed_public_route__/", 404],
  ["/rss.xml", 200],
  ["/sitemap-index.xml", 200],
  ["/sitemap-0.xml", 200],
  ["/sitemap.xml", 404],
  ["/blog/__smoke_missing_resource__/", 404],
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

const ackWithoutSecret = await fetch(`${base}/api/jobs/public-content-rebuild/ack`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ generation: 1 }),
  redirect: "manual",
});
if (ackWithoutSecret.status !== 401) {
  throw new Error(
    `/api/jobs/public-content-rebuild/ack without secret: expected 401, received ${ackWithoutSecret.status}`,
  );
}
console.log("PASS 401 /api/jobs/public-content-rebuild/ack without secret");

const cronSecret = process.env.CRON_SECRET;
if (!cronSecret) {
  throw new Error("CRON_SECRET is required so smoke can verify the production rebuild configuration");
}
const configuredScheduler = await fetch(`${base}/api/jobs/run`, {
  method: "POST",
  headers: { authorization: `Bearer ${cronSecret}` },
  redirect: "manual",
});
const configuredSchedulerBody = await configuredScheduler.json().catch(() => null);
if (configuredScheduler.status !== 200) {
  throw new Error(
    `/api/jobs/run with secret: expected success, received ${configuredScheduler.status}`,
  );
}
const rebuildState = configuredSchedulerBody?.publicContentRebuild;
if (!rebuildState || rebuildState.status === "failed" || rebuildState.status === "disabled") {
  throw new Error(
    `Production public rebuild configuration is unhealthy: ${JSON.stringify(rebuildState)}`,
  );
}
console.log(`PASS configured public rebuild runner (${rebuildState.status})`);

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

const missingOgImage = await fetch(`${base}/og-images/__smoke_missing__.png`);
if (
  missingOgImage.status !== 200
  || missingOgImage.headers.get("content-type") !== "image/png"
  || missingOgImage.headers.get("x-og-image-fallback") !== "generic"
) {
  throw new Error(
    `Missing OG image: expected generic image/png fallback, received ${missingOgImage.status}`,
  );
}
console.log("PASS generic fallback for missing .png OG image");

const invalidOgImage = await fetch(`${base}/og-images/__smoke_invalid__.svg`);
if (invalidOgImage.status !== 404) {
  throw new Error(`Invalid OG path: expected 404, received ${invalidOgImage.status}`);
}
console.log("PASS 404 invalid non-PNG OG path");

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
