export const runtime = "nodejs";

export async function GET(request: Request) {
  return Response.redirect(new URL("/og-images/og-image.png", request.url), 307);
}
