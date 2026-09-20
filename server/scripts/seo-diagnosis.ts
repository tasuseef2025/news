import "dotenv/config";
import mongoose from "mongoose";
import { publicArticleFilter, isArticleIndexable } from "../../src/lib/public-articles";

async function diagnose() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not set");
  await mongoose.connect(process.env.MONGODB_URI, { dbName: "news_website", bufferCommands: false });
  const db = mongoose.connection.db;

  const totalArticles = await db.collection("articles").countDocuments({});
  const publishedArticles = await db.collection("articles").countDocuments({ status: "published" });
  const approvedArticles = await db.collection("articles").countDocuments({ status: "published", reviewStatus: "approved" });
  const publicFiltered = await db.collection("articles").countDocuments(publicArticleFilter());

  const docs = await db.collection("articles").find({ status: "published" }).project({
    slug: 1, title: 1, category: 1, author: 1, status: 1, reviewStatus: 1, generationMode: 1,
    duplicateRisk: 1, canonicalUrl: 1, originalSourceUrl: 1, sourceUrl: 1, content: 1
  }).sort({ publishedAt: -1 }).limit(1000).toArray();

  let indexableCount = 0;
  let externalCanonicalCount = 0;
  let missingCanonicalCount = 0;
  let selfCanonicalCount = 0;

  for (const doc of docs) {
    if (isArticleIndexable(doc)) indexableCount++;
    
    if (doc.canonicalUrl) {
      if (doc.canonicalUrl.includes("novexa.news")) selfCanonicalCount++;
      else externalCanonicalCount++;
    } else {
      missingCanonicalCount++;
    }
  }

  const sampleArticles = docs.slice(0, 5).map(d => ({
    slug: d.slug,
    title: d.title,
    canonicalUrl: d.canonicalUrl,
    genMode: d.generationMode,
    reviewStatus: d.reviewStatus,
    wordCount: d.content ? d.content.split(/\s+/).length : 0
  }));

  console.log(JSON.stringify({
    counts: {
      totalArticles,
      publishedArticles,
      approvedArticles,
      publicFiltered,
      sample1000Indexable: indexableCount,
      sample1000SelfCanonical: selfCanonicalCount,
      sample1000ExternalCanonical: externalCanonicalCount,
      sample1000MissingCanonical: missingCanonicalCount
    },
    sampleArticles
  }, null, 2));

  await mongoose.disconnect();
}

diagnose().catch(console.error);
