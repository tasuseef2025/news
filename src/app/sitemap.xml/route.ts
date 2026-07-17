export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { connectDB } from "@/lib/db";
import { absoluteUrl } from "@/lib/utils";
import { Article } from "@/models/Article";
import { categories, categorySlug } from "@/lib/categories";

export async function GET() {
  await connectDB();
  const articles = await Article.find({ status: "published" }).select("slug image updatedAt publishedAt").sort({ publishedAt: -1 }).limit(5000).lean();
  const urls = [
    { loc: absoluteUrl("/"), lastmod: new Date().toISOString() },
    ...categories.map((category) => ({ loc: absoluteUrl(`/category/${categorySlug(category)}`), lastmod: new Date().toISOString() })),
    ...articles.map((article) => ({ loc: absoluteUrl(`/news/${article.slug}`), lastmod: new Date(article.updatedAt || article.publishedAt).toISOString(), image: article.image }))
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">${urls
    .map((url) => `<url><loc>${url.loc}</loc><lastmod>${url.lastmod}</lastmod>${"image" in url && url.image ? `<image:image><image:loc>${url.image}</image:loc></image:image>` : ""}</url>`)
    .join("")}</urlset>`;
  return new Response(xml, { headers: { "Content-Type": "application/xml", "Cache-Control": "s-maxage=3600, stale-while-revalidate=86400" } });
}



