import assert from "node:assert/strict";
import test from "node:test";

import { NextRequest } from "next/server";

import { middleware } from "@/middleware";
import { isKnownAgentScenePath } from "@/lib/agent/scene-paths";
import scenesData from "@/lib/parity/data/agent-scenes.json";
import {
  asInternalNotFoundRequest,
  isDocumentNotFoundResponse,
  isInternalNotFoundPath,
  INTERNAL_NOT_FOUND_PATH,
  INTERNAL_NOT_FOUND_RESPONSE_HEADER,
  responseWithNotFoundStatus,
} from "@/lib/platform/internal-not-found";

test("builds the private 404 render request without changing query or method", () => {
  const request = new Request("https://fixture.test/404?source=parity", {
    method: "HEAD",
  });
  const internal = asInternalNotFoundRequest(request);
  assert.equal(new URL(internal.url).pathname, INTERNAL_NOT_FOUND_PATH);
  assert.equal(new URL(internal.url).search, "?source=parity");
  assert.equal(internal.method, "HEAD");
  assert.equal(isInternalNotFoundPath(new URL(internal.url).pathname), true);
  assert.equal(isInternalNotFoundPath(`${INTERNAL_NOT_FOUND_PATH}/`), true);
});

test("keeps the custom body and metadata headers while changing only the public status", async () => {
  const source = new Response("<title>404 - Joruno</title><p>Nice to meet you tho!</p>", {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      [INTERNAL_NOT_FOUND_RESPONSE_HEADER]: "1",
      link: '<https://wangshengliang.cn/404/>; rel="canonical"',
    },
  });
  const notFound = responseWithNotFoundStatus(source, 404);
  assert.equal(notFound.status, 404);
  assert.equal(notFound.headers.get(INTERNAL_NOT_FOUND_RESPONSE_HEADER), null);
  assert.match(notFound.headers.get("link") ?? "", /\/404\//);
  assert.match(await notFound.text(), /Nice to meet you tho!/);
});

test("only replaces document-shaped Next 404 responses", () => {
  const request = new Request("https://fixture.test/missing");
  assert.equal(isDocumentNotFoundResponse(request, new Response("missing", {
    status: 404,
    headers: { "content-type": "text/html" },
  })), true);
  assert.equal(isDocumentNotFoundResponse(request, Response.json({ error: "missing" }, { status: 404 })), false);
});

test("rewrites every unknown document to the private view with HTTP 404", async () => {
  const response = await middleware(new NextRequest("https://fixture.test/definitely-missing"));
  assert.equal(response.status, 200);
  assert.equal(
    new URL(response.headers.get("x-middleware-rewrite") ?? "https://fixture.test/bad").pathname,
    INTERNAL_NOT_FOUND_PATH,
  );
  assert.equal(response.headers.get(INTERNAL_NOT_FOUND_RESPONSE_HEADER), "1");
});

test("keeps the private render target inside the normal site route tree", async () => {
  const response = await middleware(new NextRequest(`https://fixture.test${INTERNAL_NOT_FOUND_PATH}`));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-middleware-next"), "1");
});

test("keeps URL-encoded aliases of the private render target private", () => {
  assert.equal(isInternalNotFoundPath("/%5Flegacy-404"), true);
  assert.equal(isInternalNotFoundPath("/%5flegacy-404/"), true);
  assert.equal(isInternalNotFoundPath("/%255Flegacy-404"), false);
});

test("keeps the public trailing-slash exception for /404/", async () => {
  const response = await middleware(new NextRequest("https://fixture.test/404/"));
  assert.equal(response.status, 308);
  assert.equal(response.headers.get("location"), "https://fixture.test/404");
});

test("classifies all migrated Agent scene paths before OpenNext static fallback", async () => {
  assert.equal(scenesData.scenes.length, 56);
  for (const scene of scenesData.scenes) {
    assert.equal(isKnownAgentScenePath(`/agent/scenes/${scene.slug}`), true);
    assert.equal(isKnownAgentScenePath(`/agent/scenes/${scene.slug}/`), true);
  }
  assert.equal(isKnownAgentScenePath("/agent/scenes/mcp-database"), true);
  assert.equal(isKnownAgentScenePath("/agent/scenes/mcp-database/"), true);
  assert.equal(isKnownAgentScenePath("/agent/scenes/definitely-missing"), false);
  assert.equal(isKnownAgentScenePath("/agent/scenes/definitely-missing/"), false);
  assert.equal(isKnownAgentScenePath("/agent/scenes/"), null);

  for (const path of [
    "/agent/scenes/definitely-missing",
    "/agent/scenes/definitely-missing/",
  ]) {
    const response = await middleware(new NextRequest(`https://fixture.test${path}`));
    assert.equal(response.headers.get(INTERNAL_NOT_FOUND_RESPONSE_HEADER), "1");
    assert.equal(
      new URL(response.headers.get("x-middleware-rewrite") ?? "https://fixture.test/bad").pathname,
      INTERNAL_NOT_FOUND_PATH,
    );
  }
});
