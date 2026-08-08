import "dotenv/config";
import mongoose from "mongoose";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.novexa.news").replace(/\/$/, "");

function validHttpUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return false;
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

function finding<T>(values: T[]) {
  return { count: values.length, samples: values.slice(0, 20) };
}

async function run() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not configured");
  await mongoose.connect(process.env.MONGODB_URI, { dbName: "news_website", bufferCommands: false });
  const articles = mongoose.connection.db.collection("articles");
  const published = await articles.find({ status: "published" }).project({
    title: 1, slug: 1, content: 1, excerpt: 1, category: 1, tags: 1, author: 1, image: 1,
    metaTitle: 1, metaDescription: 1, canonicalUrl: 1, schemaMarkup: 1, publishedAt: 1,
    updatedAt: 1, reviewStatus: 1
  }).toArray();

  const slugCounts = new Map<string, number>();
  const canonicalCounts = new Map<string, number>();
  const categoryCounts = new Map<string, number>();
  for (const article of published) {
    slugCounts.set(String(article.slug || ""), (slugCounts.get(String(article.slug || "")) || 0) + 1);
    canonicalCounts.set(String(article.canonicalUrl || ""), (canonicalCounts.get(String(article.canonicalUrl || "")) || 0) + 1);
    categoryCounts.set(String(article.category || ""), (categoryCounts.get(String(article.category || "")) || 0) + 1);
  }

  const report = {
    generatedAt: new Date().toISOString(),
    mode: "read-only",
    totals: { published: published.length },
    indexability: {
      explicitlyRejectedButPublished: finding(published.filter((item) => item.reviewStatus === "rejected").map((item) => item.slug)),
      thinArticles: finding(published.filter((item) => String(item.content || "").trim().split(/\s+/).length < 500).map((item) => item.slug)),
      missingOrInvalidCanonical: finding(published.filter((item) => item.canonicalUrl !== `${siteUrl}/news/${item.slug}` || !validHttpUrl(item.canonicalUrl)).map((item) => item.slug)),
      duplicateSlugs: finding([...slugCounts].filter(([slug, count]) => slug && count > 1).map(([slug, count]) => ({ slug, count }))),
      duplicateCanonicals: finding([...canonicalCounts].filter(([url, count]) => url && count > 1).map(([url, count]) => ({ url, count })))
    },
    metadata: {
      missingTitle: finding(published.filter((item) => !item.title).map((item) => item.slug)),
      missingMetaTitle: finding(published.filter((item) => !item.metaTitle).map((item) => item.slug)),
      missingMetaDescription: finding(published.filter((item) => !item.metaDescription).map((item) => item.slug)),
      missingImage: finding(published.filter((item) => !validHttpUrl(item.image) && !String(item.image || "").startsWith("/")).map((item) => item.slug)),
      missingAuthor: finding(published.filter((item) => !item.author).map((item) => item.slug)),
      missingPublishedDate: finding(published.filter((item) => !item.publishedAt).map((item) => item.slug)),
      missingSchema: finding(published.filter((item) => !item.schemaMarkup).map((item) => item.slug))
    },
    taxonomy: {
      thinCategories: finding([...categoryCounts].filter(([, count]) => count < 2).map(([category, count]) => ({ category, count }))),
      missingCategory: finding(published.filter((item) => !item.category).map((item) => item.slug)),
      missingTags: finding(published.filter((item) => !Array.isArray(item.tags) || item.tags.length === 0).map((item) => item.slug))
    }
  };

  console.log(JSON.stringify(report, null, 2));
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}).finally(() => mongoose.disconnect());
