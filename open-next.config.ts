import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

// Public C-end routes are prerendered from the build snapshot. Keep their route
// cache entries in Workers Static Assets and intercept cache hits before the
// NextServer is loaded; dynamic CMS/API routes still fall through to the Worker.
// The cache is intentionally read-only and is replaced atomically by the
// publish-triggered production deployment pipeline.
export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
  enableCacheInterception: true,
});
