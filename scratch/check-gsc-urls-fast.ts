import "dotenv/config";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { isArticleIndexable, articleIndexabilityIssues } from "../src/lib/public-articles";

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  if (!db) throw new Error("Database connection not established");
  const articlesCol = db.collection("news_website");

  const csvPath = "C:/Users/Ehtesham Ali/.gemini/antigravity-ide/brain/0c6d457e-5859-4346-a80e-46b93f56f00b/.user_uploaded/media_1789395762780.csv";
  const rawContent = fs.readFileSync(csvPath, "utf-8");
  const lines = rawContent.trim().split("\n").slice(1);
  const rawUrls = lines.map(line => line.split(",")[0].trim()).filter(Boolean);

  console.log(`Analyzing ${rawUrls.length} URLs from GSC export file...`);

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

  const slugs = articleUrls.map(a => a.slug);
  
  // Single batch fetch of all articles matching any of the slugs
  const foundArticles = await articlesCol.find({ slug: { $in: slugs } }).toArray();
  const articleMap = new Map(foundArticles.map(doc => [doc.slug, doc]));

  const missingUrls: { rawUrl: string; slug: string }[] = [];
  const draftArticles: any[] = [];
  const unindexablePublished: any[] = [];
  const validPublished: any[] = [];

  for (const item of articleUrls) {
    const doc = articleMap.get(item.slug);
    if (!doc) {
      missingUrls.push(item);
    } else {
      const indexable = isArticleIndexable(doc);
      const issues = articleIndexabilityIssues(doc);

      if (doc.status !== "published" || doc.reviewStatus === "rejected") {
        draftArticles.push({ url: item.rawUrl, slug: item.slug, id: doc._id, status: doc.status, reviewStatus: doc.reviewStatus });
      } else if (!indexable) {
        unindexablePublished.push({ url: item.rawUrl, slug: item.slug, id: doc._id, issues });
      } else {
        validPublished.push({ url: item.rawUrl, slug: item.slug });
      }
    }
  }

  // For missing URLs, check if there's a partial match in DB (e.g. slug had encoded characters or small difference)
  const missingWithPartialMatches: any[] = [];
  for (const item of missingUrls) {
    const titleSearch = item.slug.replaceAll("-", " ");
    const partialDoc = await articlesCol.findOne({
      $or: [
        { slug: { $regex: item.slug.slice(0, 25), $options: "i" } },
        { title: { $regex: titleSearch.slice(0, 25), $options: "i" } }
      ]
    });
    missingWithPartialMatches.push({
      rawUrl: item.rawUrl,
      slug: item.slug,
      partialMatch: partialDoc ? { id: partialDoc._id, slug: partialDoc.slug, title: partialDoc.title, status: partialDoc.status } : null
    });
  }

  console.log("\n================ GSC EXPORT AUDIT SUMMARY ================");
  console.log(`Total URLs in file: ${rawUrls.length}`);
  console.log(`Homepage URLs: ${homepageUrls.length}`);
  console.log(`Category Page URLs: ${categoryUrls.length}`);
  console.log(`Article URLs: ${articleUrls.length}`);
  console.log(`  - Fully Valid & Indexable Published Articles (200 OK): ${validPublished.length}`);
  console.log(`  - Draft / Unpublished Articles (showing 404): ${draftArticles.length}`);
  console.log(`  - Published but Unindexable/Boilerplate Issues: ${unindexablePublished.length}`);
  console.log(`  - Completely Missing Slugs in DB: ${missingUrls.length}`);
  console.log("=========================================================\n");

  if (draftArticles.length > 0) {
    console.log("--- Draft / Unpublished Articles ---");
    console.dir(draftArticles, { depth: null });
  }

  if (unindexablePublished.length > 0) {
    console.log("\n--- Published Articles with Indexability Issues ---");
    console.dir(unindexablePublished, { depth: null });
  }

  if (missingWithPartialMatches.length > 0) {
    console.log("\n--- Missing URLs in DB (with partial match check) ---");
    console.dir(missingWithPartialMatches, { depth: null });
  }
}

run().catch(console.error).finally(() => mongoose.disconnect());
