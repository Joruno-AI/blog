import assert from "node:assert/strict";
import test from "node:test";

import { safeInternalCallbackUrl } from "../lib/auth/callback-url";
import { articleResourceIdCandidates, normalizeArticleResourceId } from "../modules/articles/domain/id";
import { normalizeMusicResourceId } from "../modules/music/domain/id";

import { verifySignedSessionToken } from "../lib/auth/session-cookie";
import { matchesBearerSecret } from "../lib/auth/bearer-secret";
import { canAccessResource } from "../modules/resources/domain/access";
import { normalizeResourcePath } from "../modules/resources/domain/path";
import { resourceSlug } from "../modules/resources/domain/slug";

test("normalizes canonical resource paths", () => {
  assert.equal(normalizeResourcePath(" blog//hello/?draft=1#x "), "/blog/hello");
  assert.equal(normalizeResourcePath("/"), "/");
});

test("normalizes multilingual article slugs", () => {
  assert.equal(resourceSlug("  Next.js 与 Cloudflare：发布流程  "), "nextjs-与-cloudflare发布流程");
});

test("applies public and private visibility rules", async () => {
  const admin = { id: "admin", role: "admin" as const };
  const viewer = { id: "viewer", role: "viewer" as const };
  assert.equal(await canAccessResource(null, { id: "r", visibility: "public" }), true);
  assert.equal(await canAccessResource(viewer, { id: "r", visibility: "private" }), false);
  assert.equal(await canAccessResource(admin, { id: "r", visibility: "private" }), true);
});

test("verifies Better Auth HMAC session cookie and rejects tampering", async () => {
  const token = "session-token";
  const secret = "test-secret";
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const bytes = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(token)));
  const signature = btoa(String.fromCharCode(...bytes));
  const cookie = `${token}.${signature}`;
  assert.equal(await verifySignedSessionToken(cookie, secret), token);
  assert.equal(await verifySignedSessionToken(encodeURIComponent(cookie), secret), token);
  assert.equal(await verifySignedSessionToken(`${token}x.${signature}`, secret), null);
});

test("compares scheduler bearer secrets without exposing the raw value", async () => {
  assert.equal(await matchesBearerSecret("Bearer scheduler-secret", "scheduler-secret"), true);
  assert.equal(await matchesBearerSecret("Bearer scheduler-secrex", "scheduler-secret"), false);
  assert.equal(await matchesBearerSecret(null, "scheduler-secret"), false);
  assert.equal(await matchesBearerSecret("Bearer scheduler-secret", undefined), false);
});

test("keeps login callbacks on the current origin", () => {
  assert.equal(safeInternalCallbackUrl("/studio/content?page=2"), "/studio/content?page=2");
  assert.equal(safeInternalCallbackUrl("https://attacker.invalid"), "/studio");
  assert.equal(safeInternalCallbackUrl("//attacker.invalid/path"), "/studio");
  assert.equal(safeInternalCallbackUrl(null), "/studio");
});

test("normalizes encoded and legacy article ids for Studio routes", () => {
  assert.equal(normalizeArticleResourceId("article%3Aabc123"), "article:abc123");
  assert.equal(normalizeArticleResourceId("abc123"), "article:abc123");
  assert.deepEqual(articleResourceIdCandidates("abc123"), ["abc123", "article:abc123"]);
});

test("normalizes encoded and legacy music ids for Studio routes", () => {
  assert.equal(normalizeMusicResourceId("album%3Aabc123", "album"), "album:abc123");
  assert.equal(normalizeMusicResourceId("abc123", "album"), "album:abc123");
  assert.equal(normalizeMusicResourceId("track%3Axyz", "track"), "track:xyz");
});
