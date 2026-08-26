export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { connectDB } from "@/lib/db";
import { absoluteUrl } from "@/lib/utils";
import { Article } from "@/models/Article";
import { categories, categorySlug } from "@/lib/categories";
import { safeArticleOgImage } from "@/lib/article-images";
import { isArticleIndexable, publicArticleFilter } from "@/lib/public-articles";

type SitemapUrl = {
  loc: string;
  lastmod?: string;
  image?: string;
};

type SitemapArticle = {
  slug: string;
  title: string;
  category: string;
  image?: string | null;
  content: string;
  generationMode?: "manual" | "ai" | "feed";
  reviewStatus?: "pending" | "approved" | "rejected" | "needs_review";
  duplicateRisk?: number;
  status: string;
  updatedAt?: Date;
  publishedAt?: Date;
};

function escapeXml(value = "") {
  return value.replace(/[<>&'"]/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[char] || char));
}

const staticRoutes = ["/latest", "/about", "/contact", "/privacy-policy", "/terms", "/editorial-policy", "/cookie-policy", "/advertise", "/careers", "/author/abdul-basit", "/author/syeda-manal-tirmizi", "/live-scores"] as const;

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
  const publishedFilter = publicArticleFilter();
  const candidates = await Article.find(publishedFilter)
      .select("slug title category image content generationMode reviewStatus duplicateRisk status updatedAt publishedAt")
      .sort({ publishedAt: -1 })
      .limit(5000)
      .lean<SitemapArticle[]>();
  const articles = candidates.filter(isArticleIndexable);
  const categoryStats = new Map<string, { count: number; lastmod?: Date }>();
  for (const article of articles) {
    const current = categoryStats.get(article.category) || { count: 0, lastmod: undefined };
    const modified = article.updatedAt || article.publishedAt;
    categoryStats.set(article.category, {
      count: current.count + 1,
      lastmod: !current.lastmod || (modified && modified > current.lastmod) ? modified : current.lastmod
    });
  }
  const knownCategories = new Set(categories.map((category) => category.toLowerCase()));
  const indexableCategories = [...categoryStats]
    .filter(([category, stats]) => stats.count >= 2 && knownCategories.has(category.toLowerCase()))
    .map(([category]) => category);

  const urls: SitemapUrl[] = [
    { loc: absoluteUrl("/"), lastmod: articles[0] ? new Date(articles[0].updatedAt || articles[0].publishedAt || new Date()).toISOString() : undefined },
    ...staticRoutes.map((route) => ({ loc: absoluteUrl(route) })),
    ...indexableCategories.map((category) => {
      const stats = categoryStats.get(category);
      return {
        loc: absoluteUrl(`/category/${categorySlug(category)}`),
        lastmod: stats?.lastmod ? new Date(stats.lastmod).toISOString() : undefined
      };
    }),
    ...articles.map((article) => ({
      loc: absoluteUrl(`/news/${article.slug}`),
      lastmod: new Date(article.updatedAt || article.publishedAt || new Date()).toISOString(),
      image: validImageUrl(safeArticleOgImage({ image: article.image || undefined, title: article.title, category: article.category }))
    }))
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">${urls
    .map((url) => `<url><loc>${escapeXml(url.loc)}</loc>${url.lastmod ? `<lastmod>${url.lastmod}</lastmod>` : ""}${url.image ? `<image:image><image:loc>${escapeXml(url.image)}</image:loc></image:image>` : ""}</url>`)
    .join("")}</urlset>`;

  return new Response(xml, { headers: { "Content-Type": "application/xml", "Cache-Control": "s-maxage=300, stale-while-revalidate=600" } });
}



