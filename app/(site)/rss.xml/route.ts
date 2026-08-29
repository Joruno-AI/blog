import { getPublishedResources } from "@/modules/resources/application/queries";

export const dynamic = "force-dynamic";

const origin = "https://wangshengliang.cn";

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export async function GET() {
  const articles = await getPublishedResources({ type: "article", limit: 50 });
  const items = articles.map((article) => `
    <item>
      <title>${escapeXml(article.title)}</title>
      <link>${origin}${escapeXml(article.path)}</link>
      <guid isPermaLink="true">${origin}${escapeXml(article.path)}</guid>
      ${article.description ? `<description>${escapeXml(article.description)}</description>` : ""}
      ${article.publishedAt ? `<pubDate>${article.publishedAt.toUTCString()}</pubDate>` : ""}
    </item>`).join("");

  const xml = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
  <channel>
    <title>王胜良 · 个人数字产品平台</title>
    <link>${origin}</link>
    <description>写作、知识、音乐、工具与数字作品。</description>
    <language>zh-CN</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    ${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
