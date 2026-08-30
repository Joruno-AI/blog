import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { reviewReadOnlyResponse } from "../lib/platform/review-read-only";

const root = process.cwd();

test("review Worker explicitly disables the inherited production cron", () => {
  const config = readFileSync(path.join(root, "wrangler.toml"), "utf8");
  assert.match(config, /\[env\.review\.triggers\]\s+crons\s*=\s*\[\]/m);
  assert.match(config, /\[env\.review\.vars\][\s\S]*?REVIEW_READ_ONLY\s*=\s*"true"/m);
  assert.match(
    config,
    /\[\[env\.review\.services\]\][\s\S]*?binding\s*=\s*"WORKER_SELF_REFERENCE"[\s\S]*?service\s*=\s*"personal-platform-review"/m,
  );
});

test("review mode rejects every state-changing request before OpenNext", async () => {
  for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
    const response = reviewReadOnlyResponse(
      new Request("https://review.example/api/posts", { method }),
      { REVIEW_READ_ONLY: "true" },
    );
    assert.ok(response, method);
    assert.equal(response.status, 423, method);
    assert.equal(response.headers.get("x-review-read-only"), "true", method);
    assert.deepEqual(await response.json(), { error: "The review deployment is read-only." }, method);
  }

  for (const method of ["GET", "HEAD", "OPTIONS"]) {
    assert.equal(
      reviewReadOnlyResponse(new Request("https://review.example/", { method }), { REVIEW_READ_ONLY: "true" }),
      null,
      method,
    );
  }
  for (const method of ["GET", "HEAD"]) {
    for (const pathname of [
      "/api/auth/get-session",
      "/api/auth/verify-email?token=test",
      "/api/auth/callback/provider",
      "/api/%61uth/get-session",
      "/api%2Fauth/get-session",
    ]) {
      const response = reviewReadOnlyResponse(
        new Request(`https://review.example${pathname}`, { method }),
        { REVIEW_READ_ONLY: "true" },
      );
      assert.ok(response, `${method} ${pathname}`);
      assert.equal(response.status, 423, `${method} ${pathname}`);
    }
  }
  assert.equal(
    reviewReadOnlyResponse(
      new Request("https://review.example/api/public/posts", { method: "GET" }),
      { REVIEW_READ_ONLY: "true" },
    ),
    null,
  );
  assert.equal(
    reviewReadOnlyResponse(new Request("https://production.example/api/posts", { method: "DELETE" }), {}),
    null,
  );
});

test("route-local GET authorization disables Better Auth rolling-session writes", () => {
  const source = readFileSync(
    path.join(root, "lib/auth/require-platform-editor.ts"),
    "utf8",
  );
  assert.match(source, /query:\s*\{\s*disableRefresh:\s*true\s*\}/);
});

test("custom Worker applies the review guard before R2 and OpenNext", () => {
  const source = readFileSync(path.join(root, "custom-worker.ts"), "utf8");
  const guard = source.indexOf("reviewReadOnlyResponse(request, env)");
  const legacy = source.indexOf("serveLegacyStaticAsset(request, env.R2_BUCKET)");
  const openNext = source.indexOf("openNextWorker.fetch(request, env, ctx)");
  assert.ok(guard > 0);
  assert.ok(legacy > guard);
  assert.ok(openNext > legacy);
});
