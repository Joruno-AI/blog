// The OpenNext worker is generated before Wrangler bundles this entrypoint.
// @ts-ignore Generated at build time and absent in a clean checkout.
import openNextWorker from "./.open-next/worker.js";

export default {
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

    return openNextWorker.fetch(request, env, ctx);
  },

  async scheduled(_event: unknown, env: CloudflareEnv) {
    const response = await env.WORKER_SELF_REFERENCE.fetch(
      new Request("https://personal-platform.internal/api/jobs/run", {
        method: "POST",
        headers: { authorization: `Bearer ${env.CRON_SECRET}` },
      })
    );

    if (!response.ok) {
      throw new Error(`Scheduled publication failed with HTTP ${response.status}.`);
    }
  },
};
