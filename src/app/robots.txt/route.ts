export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { absoluteUrl } from "@/lib/utils";

export async function GET() {
  const body = `User-agent: *\nAllow: /\nDisallow: /admin\nSitemap: ${absoluteUrl("/sitemap.xml")}\nSitemap: ${absoluteUrl("/news-sitemap.xml")}\n`;
  return new Response(body, { headers: { "Content-Type": "text/plain", "Cache-Control": "s-maxage=86400" } });
}


