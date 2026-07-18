import { ImageResponse } from "next/og";
import { siteConfig } from "@/lib/site";

export const runtime = "edge";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title") || siteConfig.name;
  const category = searchParams.get("category") || "Breaking News";
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#020617", color: "white", padding: 72 }}>
      <div style={{ color: "#e11d48", fontSize: 34, fontWeight: 900, textTransform: "uppercase" }}>{category}</div>
      <div style={{ fontSize: 76, lineHeight: 1.05, fontWeight: 900 }}>{title}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 30, fontWeight: 900 }}>
        <div style={{ width: 54, height: 54, borderRadius: 12, background: "#e11d48", display: "flex", alignItems: "center", justifyContent: "center" }}>N</div>
        {siteConfig.name}
      </div>
    </div>,
    { width: 1200, height: 630 }
  );
}
