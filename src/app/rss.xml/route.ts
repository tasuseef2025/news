export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { connectDB } from "@/lib/db";
import { absoluteUrl } from "@/lib/utils";
import { siteConfig } from "@/lib/site";
import { Article } from "@/models/Article";
import { isArticleIndexable, publicArticleFilter } from "@/lib/public-articles";

function escapeXml(value = "") {
  return value.replace(/[<>&'"]/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[char] || char));
}

export async function GET() {
  await connectDB();
  const candidates = await Article.find(publicArticleFilter()).sort({ publishedAt: -1 }).limit(100).lean();
  const articles = candidates.filter(isArticleIndexable).slice(0, 50);
  const items = articles.map((article) => `<item><title>${escapeXml(article.title)}</title><link>${absoluteUrl(`/news/${article.slug}`)}</link><guid isPermaLink="true">${absoluteUrl(`/news/${article.slug}`)}</guid><pubDate>${new Date(article.publishedAt).toUTCString()}</pubDate><description>${escapeXml(article.excerpt)}</description></item>`).join("");
  const lastBuildDate = articles[0]?.publishedAt ? new Date(articles[0].publishedAt).toUTCString() : new Date().toUTCString();
  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>${escapeXml(siteConfig.name)}</title><link>${absoluteUrl("/")}</link><atom:link href="${absoluteUrl("/rss.xml")}" rel="self" type="application/rss+xml"/><description>${escapeXml(siteConfig.description)}</description><language>${siteConfig.language}</language><lastBuildDate>${lastBuildDate}</lastBuildDate>${items}</channel></rss>`;
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml", "Cache-Control": "s-maxage=900, stale-while-revalidate=3600" } });
}
