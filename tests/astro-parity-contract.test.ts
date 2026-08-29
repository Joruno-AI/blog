import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { astroPublicRouteContract, excludedMemberRoutes, excludedProductRoutes } from "../lib/parity/route-contract";

const app = path.resolve(process.cwd(), "app");
const filesByRoute: Record<string, string> = {
  "/": "(site)/page.tsx", "/404": "(site)/404/page.tsx",
  "/blog": "(site)/blog/page.tsx", "/blog/[...slug]": "(site)/blog/[...slug]/page.tsx",
  "/docs": "(site)/docs/page.tsx", "/docs/read": "(site)/docs/read/page.tsx",
  "/docs/course/[id]": "(site)/docs/course/[id]/page.tsx", "/docs/catalog.json": "(site)/docs/catalog.json/route.ts",
  "/projects": "(site)/projects/page.tsx", "/photos": "(site)/photos/page.tsx",
  "/photos/photos.[hash].json": "(site)/photos/[file]/route.ts",
  "/shorts": "(site)/shorts/page.tsx", "/shorts/[...slug]": "(site)/shorts/[...slug]/page.tsx",
  "/music": "(site)/music/page.tsx", "/music/data.json": "(site)/music/data.json/route.ts",
  "/music/lyrics/[album].json": "(site)/music/lyrics/[file]/route.ts",
  "/streams": "(site)/streams/page.tsx", "/agent": "(site)/agent/page.tsx",
  "/agent/[...id]": "(site)/agent/[...id]/page.tsx", "/agent/about": "(site)/agent/about/page.tsx",
  "/agent/all": "(site)/agent/all/page.tsx", "/agent/analyzer": "(site)/agent/analyzer/page.tsx",
  "/agent/compare": "(site)/agent/compare/page.tsx", "/agent/masters": "(site)/agent/masters/page.tsx",
  "/agent/repository": "(site)/agent/repository/page.tsx", "/agent/trending": "(site)/agent/trending/page.tsx",
  "/agent/scenes": "(site)/agent/scenes/page.tsx", "/agent/scenes/[slug]": "(site)/agent/scenes/[slug]/page.tsx",
  "/agent/suggest-index.json": "(site)/agent/suggest-index.json/route.ts",
  "/changelog": "(site)/changelog/page.tsx", "/changelog/[slug]": "(site)/changelog/[slug]/page.tsx",
  "/feeds": "(site)/feeds/page.tsx", "/prs": "(site)/prs/page.tsx", "/releases": "(site)/releases/page.tsx",
  "/rss.xml": "(site)/rss.xml/route.ts", "/search-index.json": "(site)/search-index.json/route.ts",
  "/og-images/[...slug].png": "(site)/og-images/[...file]/route.tsx",
  "/giscus/[theme].css": "(site)/giscus/[file]/route.ts", "/app.webmanifest": "(site)/app.webmanifest/route.ts",
};

test("every Astro public route has a Next App Router owner", () => {
  assert.deepEqual(Object.keys(filesByRoute).sort(), [...astroPublicRouteContract].sort());
  for (const [route, file] of Object.entries(filesByRoute)) assert.ok(existsSync(path.join(app, file)), `${route} -> ${file}`);
});

test("removed product routes are absent", () => {
  for (const route of excludedProductRoutes) {
    const candidate = route === "/products" ? "(site)/products/page.tsx" : "api/products/route.ts";
    assert.equal(existsSync(path.join(app, candidate)), false, route);
  }
});

test("removed member registration is absent and server-side sign-up is disabled", () => {
  for (const route of excludedMemberRoutes) {
    assert.equal(existsSync(path.join(app, "(auth)", route.slice(1), "page.tsx")), false, route);
  }
  const authSource = readFileSync(path.resolve(process.cwd(), "lib/auth/index.ts"), "utf8");
  assert.match(authSource, /disableSignUp:\s*true/);
});
