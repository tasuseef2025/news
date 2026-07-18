export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { connectDB } from "@/lib/db";
import { absoluteUrl } from "@/lib/utils";
import { siteConfig } from "@/lib/site";
import { Article } from "@/models/Article";

function escapeXml(value = "") {
  return value.replace(/[<>&'"]/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[char] || char));
}

export async function GET() {
  await connectDB();
  const articles = await Article.find({ status: "published" }).sort({ publishedAt: -1 }).limit(50).lean();
  const items = articles.map((article) => `<item><title>${escapeXml(article.title)}</title><link>${absoluteUrl(`/news/${article.slug}`)}</link><guid>${absoluteUrl(`/news/${article.slug}`)}</guid><pubDate>${new Date(article.publishedAt).toUTCString()}</pubDate><description>${escapeXml(article.excerpt)}</description></item>`).join("");
  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${escapeXml(siteConfig.name)}</title><link>${absoluteUrl("/")}</link><description>${escapeXml(siteConfig.description)}</description>${items}</channel></rss>`;
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml", "Cache-Control": "s-maxage=900, stale-while-revalidate=3600" } });
}
