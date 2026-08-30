import assert from "node:assert/strict";
import test from "node:test";

import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { NextRequest } from "next/server";

import { DELETE, PATCH } from "@/app/api/media/[id]/route";
import { GET as listMedia } from "@/app/api/media/route";
import { config, middleware } from "@/middleware";

const dottedMediaUrl = "https://example.test/api/media/internal-preview.png";

test("dotted API identifiers never bypass the middleware matcher", () => {
  assert.equal(
    unstable_doesMiddlewareMatch({ config, url: dottedMediaUrl }),
    true
  );
  assert.equal(
    unstable_doesMiddlewareMatch({
      config,
      url: "https://example.test/icons/search.svg",
    }),
    false
  );
});

test("anonymous GET, PATCH and DELETE requests with dotted IDs are rejected", async () => {
  for (const method of ["GET", "PATCH", "DELETE"] as const) {
    const response = await middleware(new NextRequest(dottedMediaUrl, { method }));
    assert.equal(response.status, 401, `${method} should require a session`);
  }
});

test("media handlers retain route-local authorization when middleware is bypassed", async () => {
  const params = { params: Promise.resolve({ id: "internal-preview.png" }) };
  const listResponse = await listMedia(
    new NextRequest("https://example.test/api/media", { method: "GET" })
  );
  const patchResponse = await PATCH(
    new NextRequest(dottedMediaUrl, {
      method: "PATCH",
      body: JSON.stringify({ name: "leak.png" }),
      headers: { "content-type": "application/json" },
    }),
    params
  );
  const deleteResponse = await DELETE(
    new NextRequest(dottedMediaUrl, { method: "DELETE" }),
    params
  );

  assert.equal(listResponse.status, 401);
  assert.equal(patchResponse.status, 401);
  assert.equal(deleteResponse.status, 401);
});

test("the removed public media catalog is a non-enumerable 404", async () => {
  const response = await middleware(
    new NextRequest("https://example.test/api/public/media", { method: "GET" })
  );
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: "Not found" });
});
