import themes from "@/lib/parity/giscus-themes.json";

export const dynamic = "force-static";

export function generateStaticParams() {
  return [{ file: "dark.css" }, { file: "light.css" }];
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ file: string }> }
) {
  const { file } = await params;
  const theme = file === "dark.css" ? "dark" : file === "light.css" ? "light" : null;
  if (!theme) return new Response("Not found", { status: 404 });

  return new Response(themes[theme], {
    headers: {
      "Content-Type": "text/css; charset=utf-8",
      "Access-Control-Allow-Origin": "https://giscus.app",
    },
  });
}
