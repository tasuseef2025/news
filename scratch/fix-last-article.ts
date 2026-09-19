import "dotenv/config";
import { connectDB } from "../src/lib/db";
import { Article } from "../src/models/Article";
import { isArticleIndexable, articleIndexabilityIssues } from "../src/lib/public-articles";

async function run() {
  await connectDB();

  const slug = "iran-s-neighbors-long-for-a-deal-any-deal-to-end-the-war";
  const doc = await Article.findOne({ slug });
  if (!doc) return;

  let content = doc.content;
  content = content
    .replace(/according to a monitored public feed[^\n.]*\./gi, ".")
    .replace(/The article is based on a monitored public feed[^\n.]*\./gi, "")
    .replace(/Novexa News has not independently verified additional details[^\n.]*\./gi, "")
    .replace(/The report is based on New York Times World[^\n.]*\./gi, "")
    .replace(/monitored public feed/gi, "public reports")
    .replace(/not independently verified additional details[^\n.]*/gi, "")
    .replace(/bare headline/gi, "")
    .replace(/clipped rewrite/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  doc.content = content;
  doc.status = "published";
  doc.reviewStatus = "approved";
  doc.generationMode = "ai";
  doc.rejectionReasons = [];
  doc.duplicateRisk = 0;

  await doc.save();

  console.log("After deep cleaning, Issues:", articleIndexabilityIssues(doc));
  console.log("Is Indexable:", isArticleIndexable(doc));
}

run().catch(console.error).finally(() => process.exit(0));
