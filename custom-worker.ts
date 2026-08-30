// The OpenNext worker is generated before Wrangler bundles this entrypoint.
// @ts-ignore Generated at build time and absent in a clean checkout.
import openNextWorker from "./.open-next/worker.js";
import { agentRateLimitResponse } from "./lib/platform/agent-rate-limit";
import { reviewReadOnlyResponse } from "./lib/platform/review-read-only";
import { serveLegacyStaticAsset } from "./lib/r2/legacy-static-assets";
import {
  asInternalNotFoundRequest,
  INTERNAL_NOT_FOUND_RESPONSE_HEADER,
  isDocumentNotFoundResponse,
  isInternalNotFoundPath,
  responseWithNotFoundStatus,
} from "./lib/platform/internal-not-found";

const worker = {
  async fetch(
    request: Parameters<typeof openNextWorker.fetch>[0],
    env: Parameters<typeof openNextWorker.fetch>[1],
    ctx: Parameters<typeof openNextWorker.fetch>[2]
  ) {
    const url = new URL(request.url);
    if (url.hostname === "www.wangshengliang.cn") {
      url.hostname = "wangshengliang.cn";
      return Response.redirect(url.toString(), 308);
    }

    const readOnlyResponse = reviewReadOnlyResponse(request, env);
    if (readOnlyResponse) return readOnlyResponse;

    const rateLimitResponse = await agentRateLimitResponse(request, env);
    if (rateLimitResponse) return rateLimitResponse;

    const legacyStaticAsset = await serveLegacyStaticAsset(request, env.R2_BUCKET);
    if (legacyStaticAsset) return legacyStaticAsset;

    // Next reserves `/404` for its framework fallback, so changing only the
    // status would still expose Next's default body. Render the private custom
    // view and restore Astro's ordinary-page status only for the
    // original public `/404` request.
    if (
      (request.method === "GET" || request.method === "HEAD")
      && url.pathname === "/404"
    ) {
      const response = await openNextWorker.fetch(asInternalNotFoundRequest(request), env, ctx);
      if (response.status >= 500) return response;
      return responseWithNotFoundStatus(response, 200);
    }

    const response = await openNextWorker.fetch(request, env, ctx);
    if (request.method !== "GET" && request.method !== "HEAD") return response;

    const isPrivateRenderPath = isInternalNotFoundPath(url.pathname);
    const isRewrittenNotFound = response.headers.get(INTERNAL_NOT_FOUND_RESPONSE_HEADER) === "1";
    if (isPrivateRenderPath || isRewrittenNotFound) {
      if (response.status >= 500) return response;
      return responseWithNotFoundStatus(response, 404);
    }

    // Some dynamic App Router routes can still call notFound() directly. If
    // Next produced its built-in HTML fallback, replace that body with the same
    // private custom view while retaining the missing document's HTTP status.
    if (isDocumentNotFoundResponse(request, response)) {
      const custom = await openNextWorker.fetch(asInternalNotFoundRequest(request), env, ctx);
      if (custom.status >= 500) return response;
      return responseWithNotFoundStatus(custom, 404);
    }

    return response;
  },

  async scheduled(_event: unknown, env: CloudflareEnv) {
    const response = await env.WORKER_SELF_REFERENCE.fetch(
      new Request("https://personal-platform.internal/api/jobs/run", {
        method: "POST",
        headers: { authorization: `Bearer ${env.CRON_SECRET}` },
      })
    );

    if (response.status !== 200) {
      throw new Error(`Scheduled publication failed with HTTP ${response.status}.`);
    }

    // The route deliberately uses 207 so successful scheduled publications
    // remain observable even when the independent rebuild dispatch fails.
    // A 207 is still `ok` to fetch, so surface that operational failure to
    // Cloudflare Cron rather than silently waiting for the next invocation.
    const result = await response.json() as {
      publicContentRebuild?: { status?: string; error?: string };
    };
    if (result.publicContentRebuild?.status === "failed") {
      throw new Error(
        `Public content rebuild dispatch failed: ${result.publicContentRebuild.error ?? "unknown failure"}`,
      );
    }
  },
};

export default worker;
