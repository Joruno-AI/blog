import assert from "node:assert/strict";
import test from "node:test";

import {
  canRetryStaleClientAsset,
  isNextStaticAssetPath,
  isStaleClientAssetError,
  STALE_ASSET_RELOAD_COOLDOWN_MS,
} from "../lib/platform/stale-client-assets";

test("recognizes stale Next chunks without treating ordinary data failures as deploy drift", () => {
  assert.equal(isStaleClientAssetError({
    name: "ChunkLoadError",
    message: "Loading chunk 38034 failed.",
    stack: "https://HOST/_next/static/chunks/app/page-old.js",
  }), true);
  assert.equal(isStaleClientAssetError({
    name: "SyntaxError",
    message: "Unexpected token '<'",
    stack: "https://HOST/_next/static/chunks/app/page-old.js",
  }), true);
  assert.equal(isStaleClientAssetError({
    name: "TypeError",
    message: "error loading dynamically imported module",
    stack: "https://HOST/_next/static/chunks/app/page-old.js",
  }), true);
  assert.equal(isStaleClientAssetError({
    name: "TypeError",
    message: "Data service returned HTTP 502",
    stack: "fetchContent",
  }), false);
});

test("limits automatic stale-asset recovery to one hard reload per cooldown", () => {
  const now = 2_000_000;
  assert.equal(canRetryStaleClientAsset(null, now), true);
  assert.equal(canRetryStaleClientAsset("invalid", now), true);
  assert.equal(canRetryStaleClientAsset(String(now - 1_000), now), false);
  assert.equal(canRetryStaleClientAsset(String(now - STALE_ASSET_RELOAD_COOLDOWN_MS), now), true);
});

test("classifies only Next immutable static asset paths", () => {
  assert.equal(isNextStaticAssetPath("/_next/static/chunks/app/page-old.js"), true);
  assert.equal(isNextStaticAssetPath("/_next/static/css/site.css"), true);
  assert.equal(isNextStaticAssetPath("/_next/data/build/page.json"), false);
  assert.equal(isNextStaticAssetPath("/blog/_next/static/example"), false);
});
