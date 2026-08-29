import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export async function GET(_request: Request, { params }: { params: Promise<{ file: string[] }> }) { const parts = (await params).file; const title = decodeURIComponent((parts.at(-1) || "Joruno").replace(/\.png$/, "")); return new ImageResponse(<div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "white", color: "black", fontFamily: "sans-serif" }}><span style={{ fontSize: 30 }}>JORUNO</span><strong style={{ fontSize: 72, maxWidth: 1000 }}>{title}</strong><span style={{ fontSize: 28, color: "#666" }}>Web / Design / Agent</span></div>, { width: 1200, height: 630 }); }
