import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  legacyStaticAssetKey,
  serveLegacyStaticAsset,
  type LegacyR2Bucket,
  type LegacyR2Object,
  type LegacyR2ObjectBody,
} from "../lib/r2/legacy-static-assets";
import {
  buildManifest,
  listSourceAssets,
  parseArguments,
  resolveR2BucketName,
  retry,
} from "../scripts/sync-astro-static-assets.mjs";

const root = process.cwd();

const restoredRootAssets = {
  "favicon.ico": [915, "f489a68656b0322cc032db133d524705d9694e0ac501740bd6145eb70400bb0f"],
  "favicon.svg": [1311, "a1718404cfad08292ce8a26572035da1fe26d032fe50dc43f94fe81469065a4e"],
  "apple-touch-icon.png": [4985, "2bdf29165175136c1b756461bebbd2a45cadde6ea4af74cf592c61ab859eb72d"],
  "icon-192.png": [4960, "3e0dd854b9c66d3376ce1b347de7c990d9b123e13b5669013407fd90020718a1"],
  "icon-512.png": [14571, "5c6c45ae48cbfae2dda4d8549199175f77f06d68738503fa36dea650fc3c404e"],
  "icon-mask.png": [14571, "5c6c45ae48cbfae2dda4d8549199175f77f06d68738503fa36dea650fc3c404e"],
  "joruno.ico": [4286, "098f00a6af7194b95b4aac6fa1cfbf170a899ad58e0941196a0934c4446cea06"],
  "joruno.png": [240207, "f210be580ad57ac2a3cc048efdba718ebcda6a6b4c05ebbd356397d0623d0845"],
  "joruno.svg": [23771, "12ef95d6c19441bbf05575985b53fd078d87599ea269b3f830579043f9afe6fd"],
  "rss-styles.xsl": [80494, "d6ac03fbeaf54908011ba72988179ee1c077c61bd2d719167caf209a02eb5839"],
} as const;

test("restores the exact small root assets from Astro commit d1ec7b0", () => {
  for (const [file, [expectedSize, expectedHash]] of Object.entries(restoredRootAssets)) {
    const bytes = readFileSync(path.join(root, "public", file));
    assert.equal(bytes.byteLength, expectedSize, file);
    assert.equal(createHash("sha256").update(bytes).digest("hex"), expectedHash, file);
  }

  assert.equal(existsSync(path.join(root, "public", "_headers")), false);
  assert.equal(existsSync(path.join(root, "public", "_routes.json")), false);
});

test("pins every generated Astro OG image in R2 instead of bundling next/og", () => {
  const manifest = JSON.parse(
    readFileSync(path.join(root, "lib/parity/data/og-images.manifest.json"), "utf8"),
  ) as {
    count: number;
    totalBytes: number;
    files: Array<{ key: string; bytes: number; sha256: string }>;
  };
  assert.equal(manifest.count, 559);
  assert.equal(manifest.totalBytes, 66_913_092);
  assert.equal(manifest.files.length, manifest.count);
  assert.equal(new Set(manifest.files.map((file) => file.key)).size, manifest.count);
  assert.ok(manifest.files.every((file) => /^og-images\/.+\.png$/u.test(file.key)));
  assert.ok(manifest.files.every((file) => file.bytes > 0 && /^[a-f\d]{64}$/.test(file.sha256)));

  const route = readFileSync(path.join(root, "app/(site)/og-images/[...file]/route.ts"), "utf8");
  assert.doesNotMatch(route, /next\/og|ImageResponse|resvg/);
  assert.match(route, /serveLegacyStaticAsset/);
  assert.match(route, /GENERIC_OG_PATH = "\/og-images\/og-image\.png"/);
  assert.match(route, /x-og-image-fallback/);
});

test("sync CLI is dry-run by default and resolves the existing R2 binding", () => {
  const defaults = parseArguments([]);
  assert.equal(defaults.remote, false);
  assert.equal(defaults.commit, "d1ec7b0");
  assert.equal(defaults.binding, "R2_BUCKET");

  const remote = parseArguments(["--remote", "--concurrency=4", "--retries=2"]);
  assert.equal(remote.remote, true);
  assert.equal(remote.concurrency, 4);
  assert.equal(remote.retries, 2);

  const wranglerToml = readFileSync(path.join(root, "wrangler.toml"), "utf8");
  assert.equal(resolveR2BucketName(wranglerToml, "R2_BUCKET"), "blog-cms-media");
  assert.throws(() => parseArguments(["--local"]), /Unknown argument/);
});

test("sync source is restricted to the 423 legacy R2 keys", async () => {
  const assets = await listSourceAssets({ projectRoot: root });
  assert.equal(assets.length, 423);
  assert.equal(assets.reduce((sum, asset) => sum + asset.size, 0), 133_169_664);
  assert.deepEqual(
    assets.reduce<Record<string, number>>((counts, asset) => {
      const prefix = asset.key.split("/", 1)[0];
      counts[prefix] = (counts[prefix] || 0) + 1;
      return counts;
    }, {}),
    { "docs-assets": 29, img: 384, music: 10 }
  );
  assert.ok(assets.every((asset) => !asset.key.startsWith("public/")));
  assert.ok(assets.every((asset) => /^(docs-assets|img|music)\//.test(asset.key)));
});

test("manifest hashes git blobs with deterministic SHA256 under concurrency", async () => {
  const assets = await listSourceAssets({ projectRoot: root });
  const selected = [
    "docs-assets/nuggets/xitu/0dde757284550e46e8b9.webp",
    "img/david-tao.png",
    "music/david-tao/流沙.mp3",
  ].map((key) => {
    const asset = assets.find((candidate) => candidate.key === key);
    assert.ok(asset, key);
    return asset;
  });

  const manifest = await buildManifest({
    assets: selected,
    concurrency: 3,
    projectRoot: root,
  });

  assert.equal(manifest.fileCount, 3);
  assert.equal(manifest.totalBytes, 6_267_693);
  assert.equal(manifest.sha256, "aaa6dcd355e7f52798dc2be4b8f0921fe1e74fb767382d82ca7302a76a595320");
  assert.deepEqual(
    manifest.files.map((file) => [file.key, file.sha256]),
    [
      [
        "docs-assets/nuggets/xitu/0dde757284550e46e8b9.webp",
        "5f839a25bb6ca4ac8e8cd99af51de3fef1de60fed3bee2deeff26993fccb3b9f",
      ],
      ["img/david-tao.png", "2a14fff63ebe0dbe10b499f3f1640e24201bfd63b2ca5ef9cb816a9190b1f668"],
      [
        "music/david-tao/流沙.mp3",
        "7992bd774aa8bb8eb5f8b347b1c221290a84d7f5c62deb7ee8a12013c5165541",
      ],
    ]
  );
});

test("upload retry performs the configured number of retries", async () => {
  let attempts = 0;
  const result = await retry(async () => {
    attempts += 1;
    if (attempts < 3) throw new Error("transient");
    return "ok";
  }, 2);
  assert.equal(result, "ok");
  assert.equal(attempts, 3);
});

test("legacy URL mapper decodes original Unicode keys and rejects unsafe paths", () => {
  assert.equal(
    legacyStaticAssetKey("/music/david-tao/%E6%B5%81%E6%B2%99.mp3"),
    "music/david-tao/流沙.mp3"
  );
  assert.equal(legacyStaticAssetKey("/img/david-tao.png"), "img/david-tao.png");
  assert.equal(legacyStaticAssetKey("/docs-assets/nuggets/x.webp"), "docs-assets/nuggets/x.webp");
  assert.equal(legacyStaticAssetKey("/og-images/blog/中文.png"), "og-images/blog/中文.png");
  assert.equal(legacyStaticAssetKey("/image/david-tao.png"), null);
  assert.equal(legacyStaticAssetKey("/img/%2e%2e/secret"), null);
  assert.equal(legacyStaticAssetKey("/img/%E0%A4%A"), null);
});

function bodyObject(
  body: string,
  options: { size?: number; range?: { offset: number; length: number }; contentType?: string } = {}
): LegacyR2ObjectBody {
  return {
    size: options.size ?? Buffer.byteLength(body),
    httpEtag: '"astro-etag"',
    range: options.range,
    body: new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(body));
        controller.close();
      },
    }),
    writeHttpMetadata(headers) {
      if (options.contentType) headers.set("content-type", options.contentType);
    },
  };
}

function metadataObject(): LegacyR2Object {
  return {
    size: 10,
    httpEtag: '"astro-etag"',
    writeHttpMetadata() {},
  };
}

test("Worker streams a legacy R2 object with the original static headers", async () => {
  const calls: Array<{ key: string; options: { onlyIf: Headers; range: Headers } }> = [];
  const bucket: LegacyR2Bucket = {
    async get(key, options) {
      calls.push({ key, options });
      return bodyObject("image", { contentType: "image/png" });
    },
  };

  const request = new Request("https://example.test/img/david-tao.png");
  const response = await serveLegacyStaticAsset(request, bucket);
  assert.ok(response);
  assert.equal(response.status, 200);
  assert.equal(await response.text(), "image");
  assert.equal(response.headers.get("content-type"), "image/png");
  assert.equal(response.headers.get("content-length"), "5");
  assert.equal(response.headers.get("etag"), '"astro-etag"');
  assert.equal(response.headers.get("accept-ranges"), "bytes");
  assert.equal(response.headers.get("access-control-allow-origin"), "*");
  assert.equal(response.headers.get("cache-control"), "public, max-age=14400, must-revalidate");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(calls[0].key, "img/david-tao.png");
  assert.equal(calls[0].options.onlyIf, request.headers);
  assert.equal(calls[0].options.range, request.headers);
});

test("Worker preserves byte ranges for MP3 seeking and strips HEAD bodies", async () => {
  const rangeBucket: LegacyR2Bucket = {
    async get() {
      return bodyObject("234", { size: 10, range: { offset: 2, length: 3 } });
    },
  };
  const ranged = await serveLegacyStaticAsset(
    new Request("https://example.test/music/david-tao/流沙.mp3", {
      headers: { range: "bytes=2-4" },
    }),
    rangeBucket
  );
  assert.ok(ranged);
  assert.equal(ranged.status, 206);
  assert.equal(ranged.headers.get("content-range"), "bytes 2-4/10");
  assert.equal(ranged.headers.get("content-length"), "3");
  assert.equal(ranged.headers.get("content-type"), "audio/mpeg");
  assert.equal(await ranged.text(), "234");

  const head = await serveLegacyStaticAsset(
    new Request("https://example.test/music/david-tao/流沙.mp3", { method: "HEAD" }),
    {
      async get() {
        return bodyObject("0123456789", { size: 10 });
      },
    }
  );
  assert.ok(head);
  assert.equal(head.status, 200);
  assert.equal(head.headers.get("content-length"), "10");
  assert.equal(await head.text(), "");
});

test("Worker ignores an invalid R2 range marker on ordinary reads", async () => {
  const response = await serveLegacyStaticAsset(
    new Request("https://example.test/og-images/og-image.png"),
    {
      async get() {
        return bodyObject("image", {
          size: 5,
          range: { offset: Number.NaN, length: Number.NaN },
          contentType: "image/png",
        });
      },
    },
  );
  assert.ok(response);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-range"), null);
  assert.equal(response.headers.get("content-length"), "5");
});

test("Worker falls through on a missing/non-legacy object and honors conditional reads", async () => {
  let reads = 0;
  const missingBucket: LegacyR2Bucket = {
    async get() {
      reads += 1;
      return null;
    },
  };

  assert.equal(
    await serveLegacyStaticAsset(new Request("https://example.test/img/missing.png"), missingBucket),
    null
  );
  assert.equal(
    await serveLegacyStaticAsset(new Request("https://example.test/api/public/music"), missingBucket),
    null
  );
  assert.equal(
    await serveLegacyStaticAsset(
      new Request("https://example.test/img/file.png", { method: "POST" }),
      missingBucket
    ),
    null
  );
  assert.equal(reads, 1);

  const notModified = await serveLegacyStaticAsset(
    new Request("https://example.test/img/cached.png", {
      headers: { "if-none-match": '"astro-etag"' },
    }),
    {
      async get() {
        return metadataObject();
      },
    }
  );
  assert.ok(notModified);
  assert.equal(notModified.status, 304);
  assert.equal(notModified.headers.get("etag"), '"astro-etag"');
});

test("custom Worker checks legacy R2 compatibility before OpenNext", () => {
  const source = readFileSync(path.join(root, "custom-worker.ts"), "utf8");
  const legacyCall = source.indexOf("await serveLegacyStaticAsset(request, env.R2_BUCKET)");
  const openNextCall = source.indexOf("await openNextWorker.fetch(request, env, ctx)");
  assert.ok(legacyCall > 0);
  assert.ok(openNextCall > legacyCall);
});
