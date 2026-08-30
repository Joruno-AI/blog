import assert from "node:assert/strict";
import test from "node:test";

import { legacyCanonicalPath, legacyMetadata } from "../lib/parity/legacy-metadata";

test("emits Astro-compatible absolute canonical and Twitter URLs", () => {
  const metadata = legacyMetadata({
    title: "Blog",
    description: "Description",
    path: "/blog",
    image: "/og-images/blog.png",
  });
  assert.equal(legacyCanonicalPath("/blog"), "/blog/");
  assert.equal(metadata.alternates?.canonical, "/blog/");
  assert.deepEqual(metadata.other, { "twitter:url": "https://wangshengliang.cn/blog/" });
});

test("matches Astro's 60-character title suffix rule and disabled OG images", () => {
  const title = "x".repeat(61);
  const metadata = legacyMetadata({
    title,
    description: "Description",
    path: "/blog/long-title/",
    image: false,
  });
  assert.deepEqual(metadata.title, { absolute: title });
  assert.deepEqual(metadata.openGraph && "images" in metadata.openGraph ? metadata.openGraph.images : undefined, []);
  assert.deepEqual(metadata.twitter?.images, []);
});
