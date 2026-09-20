import { siteConfig } from "@/lib/site";

export const dynamic = "force-static";
export const revalidate = false;

export function GET() {
  const body = `User-agent: *
Allow: /
# Allow OG image endpoint used for social preview cards and Google News thumbnails
Allow: /api/og
# Allow RSS feed for feed readers and Google News
Allow: /rss.xml
Disallow: /admin/
Disallow: /api/
Disallow: /auth/
Sitemap: ${siteConfig.domain}/sitemap.xml
Sitemap: ${siteConfig.domain}/news-sitemap.xml
`;
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400, s-maxage=86400, immutable"
    }
  });
}
