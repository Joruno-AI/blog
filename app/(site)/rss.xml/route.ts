import rssTemplateData from "@/lib/parity/data/rss-template.json";
import { renderRssTemplate } from "@/lib/parity/rss-template";

export const dynamic = "force-dynamic";

export function GET() {
  return new Response(renderRssTemplate(rssTemplateData.template), {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}
