import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title") || "Newsroom";
  const category = searchParams.get("category") || "Breaking News";
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#020617", color: "white", padding: 72 }}>
      <div style={{ color: "#ef4444", fontSize: 34, fontWeight: 900, textTransform: "uppercase" }}>{category}</div>
      <div style={{ fontSize: 76, lineHeight: 1.05, fontWeight: 900 }}>{title}</div>
      <div style={{ fontSize: 28, fontWeight: 800 }}>Newsroom</div>
    </div>,
    { width: 1200, height: 630 }
  );
}
