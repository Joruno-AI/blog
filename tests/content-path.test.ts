import assert from "node:assert/strict";
import test from "node:test";

import { normalizeContentPath } from "@/lib/parity/content-path";

test("decodes non-ASCII Astro paths before querying D1", () => {
  assert.equal(normalizeContentPath("/blog/%E5%8C%85%E7%AE%A1%E7%90%86%E5%B7%A5%E5%85%B7/bun"), "/blog/包管理工具/bun");
});

test("normalizes Astro trailing slashes without changing root", () => {
  assert.equal(normalizeContentPath("/blog/css/1-selectors/"), "/blog/css/1-selectors");
  assert.equal(normalizeContentPath("/"), "/");
});
