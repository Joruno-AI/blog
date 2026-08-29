export function GET() {
  return Response.json({ name: "Joruno", short_name: "Joruno", description: "Joruno 的个人博客", start_url: "/", display: "standalone", background_color: "#ffffff", theme_color: "#ffffff", icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }] }, { headers: { "Content-Type": "application/manifest+json; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
