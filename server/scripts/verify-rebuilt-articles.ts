import "dotenv/config";
import mongoose from "mongoose";
import { publicArticleFilter, isArticleIndexable } from "../../src/lib/public-articles";

function words(value = "") {
  return value.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").split(/\s+/).filter(Boolean).length;
}

async function run() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not configured");
  await mongoose.connect(process.env.MONGODB_URI, { dbName: "news_website", bufferCommands: false });
  const collection = mongoose.connection.db.collection("articles");

  const rebuilt = await collection.find({ rebuiltAt: { $exists: true } }).toArray();
  const ids = rebuilt.map((doc) => doc._id);

  // Does the live public query actually return them?
  const visible = await collection
    .find({ ...publicArticleFilter(), _id: { $in: ids } })
    .project({ _id: 1 })
    .toArray();
  const visibleIds = new Set(visible.map((doc) => String(doc._id)));

  const problems: Array<{ slug: string; issue: string }> = [];
  let totalLinks = 0;
  let totalWords = 0;

  for (const doc of rebuilt) {
    const slug = String(doc.slug);
    const content = String(doc.content || "");
    const linkCount = [...content.matchAll(/\[[^\]]+\]\(https?:\/\/[^)\s]+\)/g)].length;
    totalLinks += linkCount;
    totalWords += words(content);

    if (!visibleIds.has(String(doc._id))) problems.push({ slug, issue: "excluded by publicArticleFilter" });
    if (!isArticleIndexable(doc)) problems.push({ slug, issue: "isArticleIndexable() returns false" });
    if (words(content) < 600) problems.push({ slug, issue: `only ${words(content)} words` });
    if (!linkCount) problems.push({ slug, issue: "no external links in body" });
    if (String(doc.metaDescription || "").length < 120) problems.push({ slug, issue: "meta description under 120 chars" });
    if (!doc.image) problems.push({ slug, issue: "missing image" });
    if (!doc.schemaMarkup) problems.push({ slug, issue: "missing schema markup" });
    if (doc.canonicalUrl !== `https://www.novexa.news/news/${slug}`) {
      problems.push({ slug, issue: `canonical mismatch: ${doc.canonicalUrl}` });
    }
  }

  const slugCounts = new Map<string, number>();
  for (const doc of rebuilt) slugCounts.set(String(doc.slug), (slugCounts.get(String(doc.slug)) || 0) + 1);

  console.log(JSON.stringify({
    rebuiltArticles: rebuilt.length,
    visibleToPublicQueries: visible.length,
    indexable: rebuilt.filter(isArticleIndexable).length,
    averageWords: rebuilt.length ? Math.round(totalWords / rebuilt.length) : 0,
    averageExternalLinks: rebuilt.length ? Number((totalLinks / rebuilt.length).toFixed(2)) : 0,
    duplicateSlugs: [...slugCounts].filter(([, count]) => count > 1).map(([slug]) => slug),
    publishedDateRange: {
      oldest: rebuilt.length ? new Date(Math.min(...rebuilt.map((doc) => new Date(doc.publishedAt).getTime()))).toISOString() : null,
      newest: rebuilt.length ? new Date(Math.max(...rebuilt.map((doc) => new Date(doc.publishedAt).getTime()))).toISOString() : null
    },
    problems
  }, null, 2));
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}).finally(() => mongoose.disconnect());
