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
  content: string;
  duplicateRisk?: number;
  generationMode?: "manual" | "ai" | "feed";
  reviewStatus?: "pending" | "approved" | "rejected" | "needs_review";
  status?: string;
  image?: string | null;
  updatedAt?: Date;
  publishedAt?: Date;
};

function escapeXml(value = "") {
  return value.replace(/[<>&'"]/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[char] || char));
}

const staticRoutes = ["/about", "/contact", "/privacy-policy", "/terms", "/editorial-policy", "/cookie-policy", "/advertise", "/careers", "/author/abdul-basit", "/author/syeda-manal-tirmizi", "/live-scores"] as const;

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
  const [articles, categoryCounts] = await Promise.all([
    Article.find(publishedFilter)
    .select("slug title category content image updatedAt publishedAt duplicateRisk generationMode reviewStatus status")
    .sort({ publishedAt: -1 })
    .limit(5000)
    .lean<SitemapArticle[]>(),
    Article.aggregate<{ _id: string; count: number; lastmod?: Date }>([
      { $match: publishedFilter },
      { $group: { _id: "$category", count: { $sum: 1 }, lastmod: { $max: { $ifNull: ["$updatedAt", "$publishedAt"] } } } },
      { $match: { count: { $gte: 2 } } }
    ])
  ]);
  const knownCategories = new Set(categories.map((category) => category.toLowerCase()));
  const indexableCategories = categoryCounts
    .map((entry) => entry._id)
    .filter((category): category is string => typeof category === "string" && knownCategories.has(category.toLowerCase()));

  const indexableArticles = articles.filter(isArticleIndexable);
  const urls: SitemapUrl[] = [
    { loc: absoluteUrl("/"), lastmod: indexableArticles[0] ? new Date(indexableArticles[0].updatedAt || indexableArticles[0].publishedAt || new Date()).toISOString() : undefined },
    ...staticRoutes.map((route) => ({ loc: absoluteUrl(route) })),
    ...indexableCategories.map((category) => {
      const stats = categoryCounts.find((entry) => entry._id === category);
      return {
        loc: absoluteUrl(`/category/${categorySlug(category)}`),
        lastmod: stats?.lastmod ? new Date(stats.lastmod).toISOString() : undefined
      };
    }),
    ...indexableArticles.map((article) => ({
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



