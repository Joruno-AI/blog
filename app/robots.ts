import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/studio/", "/api/"],
    },
    sitemap: "https://wangshengliang.cn/sitemap.xml",
    host: "https://wangshengliang.cn",
  };
}
