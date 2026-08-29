import type { MetadataRoute } from "next";

import { getPublicResourceRoutes } from "@/modules/resources/application/queries";

export const dynamic = "force-dynamic";

const origin = "https://wangshengliang.cn";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const routes = await getPublicResourceRoutes();
  return [
    { url: origin, changeFrequency: "weekly", priority: 1 },
    { url: `${origin}/blog`, changeFrequency: "daily", priority: 0.9 },
    ...routes
      .filter((route) => route.type === "article")
      .map((route) => ({
        url: `${origin}${route.path}`,
        lastModified: route.updatedAt,
        changeFrequency: "monthly" as const,
        priority: 0.7,
      })),
  ];
}
