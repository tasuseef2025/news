import { absoluteUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

export function GET() {
  const body = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/
Disallow: /auth/
Disallow: /search
Sitemap: ${absoluteUrl("/sitemap.xml")}
Sitemap: ${absoluteUrl("/news-sitemap.xml")}
`;
  return new Response(body, { headers: { "Content-Type": "text/plain", "Cache-Control": "s-maxage=3600" } });
}
