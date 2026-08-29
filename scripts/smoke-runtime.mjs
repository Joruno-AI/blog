const base = (process.env.SMOKE_BASE_URL || process.argv[2] || "http://127.0.0.1:8788").replace(/\/$/, "");

const checks = [
  ["/", 200],
  ["/blog", 200],
  ["/music", 200],
  ["/photos", 200],
  ["/knowledge", 200],
  ["/projects", 200],
  ["/search?q=Next", 200],
  ["/rss.xml", 200],
  ["/sitemap.xml", 200],
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
const photoPath = photosHtml.match(/href="(\/photos\/[^"]+)"/)?.[1];
if (!photoPath) throw new Error("Photo listing returned no migrated photo links");
const photoResponse = await fetch(base + photoPath);
if (photoResponse.status !== 200) {
  throw new Error(`First photo page: expected 200, received ${photoResponse.status}`);
}
console.log(`PASS 200 ${photoPath}`);
