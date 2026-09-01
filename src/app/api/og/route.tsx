import { ImageResponse } from "next/og";
import { siteConfig } from "@/lib/site";

export const runtime = "edge";
export const revalidate = 86400;
export const maxDuration = 10;

function clampText(value: string, max: number) {
  return value.length > max ? `${value.slice(0, max).replace(/\s+\S*$/, "")}...` : value;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = clampText(searchParams.get("title") || siteConfig.name, 118);
  const category = clampText(searchParams.get("category") || "Breaking News", 34);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        overflow: "hidden",
        background: "#f8fafc",
        color: "#07111f",
        fontFamily: "Inter, Arial, sans-serif"
      }}
    >
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 48%, #fee2e2 100%)" }} />
      <div style={{ position: "absolute", right: -120, top: -160, width: 520, height: 520, borderRadius: 999, background: "#dc2626", opacity: 0.18 }} />
      <div style={{ position: "absolute", left: -90, bottom: -140, width: 470, height: 470, borderRadius: 999, background: "#0f172a", opacity: 0.12 }} />
      <div style={{ position: "absolute", left: 70, top: 70, width: 1060, height: 490, border: "2px solid rgba(15, 23, 42, 0.12)", borderRadius: 34 }} />

      <div style={{ position: "relative", display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%", padding: 76 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div style={{ width: 62, height: 62, borderRadius: 16, background: "#dc2626", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34, fontWeight: 900 }}>N</div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 34, fontWeight: 900, letterSpacing: 0 }}>{siteConfig.name}</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#dc2626", letterSpacing: 8, textTransform: "uppercase" }}>{siteConfig.tagline}</div>
            </div>
          </div>
          <div style={{ border: "2px solid #dc2626", color: "#dc2626", borderRadius: 999, padding: "12px 22px", fontSize: 24, fontWeight: 900, textTransform: "uppercase" }}>{category}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
          <div style={{ width: 150, height: 10, background: "#dc2626", borderRadius: 999 }} />
          <div style={{ fontSize: title.length > 82 ? 58 : 66, lineHeight: 1.04, fontWeight: 900, maxWidth: 980 }}>{title}</div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 24, fontWeight: 800, color: "#334155" }}>
          <div>Original Novexa News brief</div>
          <div>www.novexa.news</div>
        </div>
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
      headers: {
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
        "X-Robots-Tag": "noindex, nofollow, noarchive"
      }
    }
  );
}
