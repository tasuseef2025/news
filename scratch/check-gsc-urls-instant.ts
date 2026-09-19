import "dotenv/config";
import mongoose from "mongoose";
import fs from "fs";
import { isArticleIndexable, articleIndexabilityIssues } from "../src/lib/public-articles";

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  if (!db) throw new Error("Database connection not established");
  const articlesCol = db.collection("news_website");

  const allDbArticles = await articlesCol.find({}, {
    projection: {
      slug: 1,
      title: 1,
      status: 1,
      reviewStatus: 1,
      generationMode: 1,
      content: 1,
      htmlContent: 1,
      publishedAt: 1
    }
  }).toArray();

  const dbSlugMap = new Map(allDbArticles.map(doc => [doc.slug, doc]));

  const csvPath = "C:/Users/Ehtesham Ali/.gemini/antigravity-ide/brain/0c6d457e-5859-4346-a80e-46b93f56f00b/.user_uploaded/media_1789395762780.csv";
  const rawContent = fs.readFileSync(csvPath, "utf-8");
  const lines = rawContent.trim().split("\n").slice(1);
  const rawUrls = lines.map(line => line.split(",")[0].trim()).filter(Boolean);

  const categoryUrls: string[] = [];
  const homepageUrls: string[] = [];
  const articleUrls: { rawUrl: string; slug: string }[] = [];

  for (const rawUrl of rawUrls) {
    if (rawUrl === "https://www.novexa.news/" || rawUrl === "https://www.novexa.news") {
      homepageUrls.push(rawUrl);
    } else if (rawUrl.includes("/category/")) {
      categoryUrls.push(rawUrl);
    } else {
      const slug = rawUrl.replace("https://www.novexa.news/news/", "").replace(/\/$/, "").trim();
      articleUrls.push({ rawUrl, slug });
    }
  }

  const missingUrls: { rawUrl: string; slug: string }[] = [];
  const draftArticles: any[] = [];
  const unindexablePublished: any[] = [];
  const validPublished: any[] = [];

  for (const item of articleUrls) {
    const doc = dbSlugMap.get(item.slug);
    if (!doc) {
      missingUrls.push({ rawUrl: item.rawUrl, slug: item.slug });
    } else {
      const indexable = isArticleIndexable(doc);
      const issues = articleIndexabilityIssues(doc);

      if (doc.status !== "published" || doc.reviewStatus === "rejected") {
        draftArticles.push({ url: item.rawUrl, slug: item.slug, id: doc._id, status: doc.status, reviewStatus: doc.reviewStatus, title: doc.title });
      } else if (!indexable) {
        unindexablePublished.push({ url: item.rawUrl, slug: item.slug, id: doc._id, issues, title: doc.title });
      } else {
        validPublished.push({ url: item.rawUrl, slug: item.slug });
      }
    }
  }

  console.log("================ GSC EXPORT AUDIT SUMMARY ================");
  console.log(`Total URLs in file: ${rawUrls.length}`);
  console.log(`Homepage URLs (200 OK): ${homepageUrls.length}`);
  console.log(`Category Page URLs (200 OK): ${categoryUrls.length}`);
  console.log(`Article URLs analyzed: ${articleUrls.length}`);
  console.log(`  -> 🟢 Fully Valid Published & Indexable (200 OK): ${validPublished.length}`);
  console.log(`  -> 🟡 Draft / Unpublished Articles in DB (Returns 404): ${draftArticles.length}`);
  console.log(`  -> 🟠 Published Articles with Quality/Boilerplate Issues (Returns 404): ${unindexablePublished.length}`);
  console.log(`  -> 🔴 Completely Missing Slugs in DB (Returns 404): ${missingUrls.length}`);
  console.log("=========================================================\n");

  fs.writeFileSync("scratch/audit-results.json", JSON.stringify({
    stats: {
      total: rawUrls.length,
      homepage: homepageUrls.length,
      category: categoryUrls.length,
      validPublished: validPublished.length,
      draftArticles: draftArticles.length,
      unindexablePublished: unindexablePublished.length,
      missingUrls: missingUrls.length
    },
    draftArticles,
    unindexablePublished,
    missingUrls
  }, null, 2));
  console.log("Full detailed results saved to scratch/audit-results.json");
}

run().catch(console.error).finally(() => mongoose.disconnect());
