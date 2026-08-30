import { docsCatalogSummary, docsCourseById } from "@/lib/docs/catalog";
import { docsReaderUrl } from "@/lib/parity/docs";

type Context = { params: Promise<{ id: string }> };

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return docsCatalogSummary.categories.flatMap((category) =>
    category.courses.map((course) => ({ id: course.id })),
  );
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export async function GET(_request: Request, { params }: Context) {
  const id = decodeURIComponent((await params).id);
  const course = docsCourseById(id);
  const firstArticle = course?.firstArticle;
  if (!course || !firstArticle) {
    return new Response("Not Found", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const target = docsReaderUrl(firstArticle.path, course.sourceId, course.id);
  const escapedTarget = escapeHtml(target);
  const canonical = escapeHtml(new URL(target, "https://wangshengliang.cn").toString());
  const source = escapeHtml(`/docs/course/${id}/`);
  const html = `<!doctype html><title>Redirecting to: ${escapedTarget}</title><meta http-equiv="refresh" content="2;url=${escapedTarget}"><meta name="robots" content="noindex"><link rel="canonical" href="${canonical}"><body>\t<a href="${escapedTarget}">Redirecting from <code>${source}</code> to <code>${escapedTarget}</code></a>`;

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
