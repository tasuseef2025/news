import { absoluteUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

export function GET() {
  const body = `User-agent: *\nAllow: /\nDisallow: /admin\nSitemap: ${absoluteUrl("/sitemap.xml")}\nSitemap: ${absoluteUrl("/news-sitemap.xml")}\n`;
  return new Response(body, { headers: { "Content-Type": "text/plain", "Cache-Control": "s-maxage=3600" } });
}
