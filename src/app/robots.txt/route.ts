import { absoluteUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

export function GET() {
  // /search is intentionally crawlable. It serves robots: noindex, and blocking
  // it here would stop Googlebot ever reading that directive — leaving the
  // footer's /search?q=... tag links eligible for URL-only indexing instead of
  // being dropped cleanly.
  const body = `User-agent: *
Allow: /
Allow: /api/og
Disallow: /admin
Disallow: /api/
Disallow: /auth/
Sitemap: ${absoluteUrl("/sitemap.xml")}
Sitemap: ${absoluteUrl("/news-sitemap.xml")}
`;
  return new Response(body, { headers: { "Content-Type": "text/plain", "Cache-Control": "s-maxage=3600" } });
}
