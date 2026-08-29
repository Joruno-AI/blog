import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import { fileURLToPath } from "url";
import path from "path";

initOpenNextCloudflareForDev();

const fileName = fileURLToPath(import.meta.url);
const root = path.dirname(fileName);

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/agent/:file*.json",
        headers: [{ key: "Cache-Control", value: "public, max-age=3600, stale-while-revalidate=86400" }],
      },
      {
        source: "/docs/:file*.json",
        headers: [{ key: "Cache-Control", value: "public, max-age=3600, stale-while-revalidate=86400" }],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  // Externalize packages that use Node.js built-in modules
  serverExternalPackages: ["better-auth", "@better-auth/core"],
  turbopack: {
    root,
    resolveAlias: {
      "node:module": "empty-module",
      "node:fs": "empty-module",
      "node:path": "empty-module",
    }
  },
  webpack: (config, { isServer, webpack }) => {
    if (isServer) {
      // Handle node: protocol modules for Cloudflare Pages compatibility
      // Map node: prefixed modules to their non-prefixed equivalents
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(/^node:/, (resource: { request: string }) => {
          resource.request = resource.request.replace(/^node:/, "");
        })
      );

      // Provide fallbacks for Node.js built-in modules
      config.resolve = {
        ...config.resolve,
        fallback: {
          ...config.resolve?.fallback,
          module: false,
          fs: false,
          path: false,
          crypto: false,
          buffer: false,
          util: false,
          stream: false,
          events: false,
          process: false,
        },
      };
    }
    return config;
  },
};

export default nextConfig;
