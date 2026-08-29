import assert from "node:assert/strict";
import test from "node:test";

import { requiresPlatformSession } from "../lib/auth/session-scope";

test("validates sessions only for login, Studio and private APIs", () => {
  assert.equal(requiresPlatformSession("/login"), true);
  assert.equal(requiresPlatformSession("/studio"), true);
  assert.equal(requiresPlatformSession("/studio/posts/create"), true);
  assert.equal(requiresPlatformSession("/api/posts"), true);

  assert.equal(requiresPlatformSession("/"), false);
  assert.equal(requiresPlatformSession("/blog/a-post"), false);
  assert.equal(requiresPlatformSession("/agent/anthropics/skills"), false);
  assert.equal(requiresPlatformSession("/api/public/posts"), false);
  assert.equal(requiresPlatformSession("/api/auth/get-session"), false);
  assert.equal(requiresPlatformSession("/api/jobs/run"), false);
  assert.equal(requiresPlatformSession("/studio-preview"), false);
  assert.equal(requiresPlatformSession("/api/publication"), true);
});
