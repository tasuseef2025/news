export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { connectDB } from "@/lib/db";
import { absoluteUrl } from "@/lib/utils";
import { Article } from "@/models/Article";
import { categories, categorySlug } from "@/lib/categories";
import { safeArticleOgImage } from "@/lib/article-images";

type SitemapUrl = {
  loc: string;
  lastmod: string;
  image?: string;
};

type SitemapArticle = {
  slug: string;
  title: string;
  category: string;
  image?: string | null;
  updatedAt?: Date;
  publishedAt?: Date;
};

function escapeXml(value = "") {
  return value.replace(/[<>&'"]/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[char] || char));
}

const staticRoutes = ["/about", "/contact", "/privacy-policy", "/terms", "/editorial-policy", "/cookie-policy", "/advertise", "/careers", "/author/abdul-basit", "/live-scores"] as const;

function validImageUrl(value?: string | null) {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed || trimmed.toLowerCase() === "undefined" || trimmed.toLowerCase() === "null") return "";

  const resolved = trimmed.startsWith("/") ? absoluteUrl(trimmed) : trimmed;
  try {
    const url = new URL(resolved);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : "";
  } catch {
    return "";
  }
}

export async function GET() {
  await connectDB();
  const articles = await Article.find({ status: "published" })
    .select("slug title category image updatedAt publishedAt")
    .sort({ publishedAt: -1 })
    .limit(5000)
    .lean<SitemapArticle[]>();

  const urls: SitemapUrl[] = [
    { loc: absoluteUrl("/"), lastmod: new Date().toISOString() },
    ...staticRoutes.map((route) => ({ loc: absoluteUrl(route), lastmod: new Date().toISOString() })),
    ...categories.map((category) => ({ loc: absoluteUrl(`/category/${categorySlug(category)}`), lastmod: new Date().toISOString() })),
    ...articles.map((article) => ({
      loc: absoluteUrl(`/news/${article.slug}`),
      lastmod: new Date(article.updatedAt || article.publishedAt || new Date()).toISOString(),
      image: validImageUrl(safeArticleOgImage({ image: article.image || undefined, title: article.title, category: article.category }))
    }))
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">${urls
    .map((url) => `<url><loc>${escapeXml(url.loc)}</loc><lastmod>${url.lastmod}</lastmod>${url.image ? `<image:image><image:loc>${escapeXml(url.image)}</image:loc></image:image>` : ""}</url>`)
    .join("")}</urlset>`;

  return new Response(xml, { headers: { "Content-Type": "application/xml", "Cache-Control": "s-maxage=3600, stale-while-revalidate=86400" } });
}



