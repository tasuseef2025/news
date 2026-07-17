export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { connectDB } from "@/lib/db";
import { absoluteUrl } from "@/lib/utils";
import { Article } from "@/models/Article";

function escapeXml(value = "") {
  return value.replace(/[<>&'"]/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[char] || char));
}

export async function GET() {
  await connectDB();
  const since = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const articles = await Article.find({ status: "published", publishedAt: { $gte: since } })
    .select("title slug publishedAt")
    .sort({ publishedAt: -1 })
    .limit(1000)
    .lean();

  const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">${articles
    .map(
      (article) => `<url><loc>${absoluteUrl(`/news/${article.slug}`)}</loc><news:news><news:publication><news:name>Newsroom</news:name><news:language>en</news:language></news:publication><news:publication_date>${new Date(article.publishedAt).toISOString()}</news:publication_date><news:title>${escapeXml(article.title)}</news:title></news:news></url>`
    )
    .join("")}</urlset>`;

  return new Response(xml, { headers: { "Content-Type": "application/xml", "Cache-Control": "s-maxage=900, stale-while-revalidate=3600" } });
}
