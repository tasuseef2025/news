import "dotenv/config";
import { createHash } from "node:crypto";
import mongoose from "mongoose";

const apply = process.argv.includes("--apply");
const limitArgument = process.argv.find((argument) => argument.startsWith("--limit="));
const requestedLimit = Number(limitArgument?.split("=")[1] || 0);
const operationLimit = Number.isFinite(requestedLimit) && requestedLimit > 0 ? Math.floor(requestedLimit) : Number.POSITIVE_INFINITY;
const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.novexa.news").replace(/\/$/, "");

function hash(value: unknown) {
  return createHash("sha256").update(String(value || "").trim()).digest("hex");
}

function normalizeUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return undefined;
  try {
    const url = new URL(value.trim());
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_|at_|fbclid|gclid|mc_)/i.test(key)) url.searchParams.delete(key);
    }
    url.hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    url.pathname = url.pathname.replace(/\/$/, "") || "/";
    return url.toString();
  } catch {
    return undefined;
  }
}

async function run() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not configured");
  await mongoose.connect(process.env.MONGODB_URI, { dbName: "news_website", bufferCommands: false });
  const collection = mongoose.connection.db.collection("articles");
  const cursor = collection.find({});
  const operations: Array<Record<string, unknown>> = [];
  const samples: Array<{ slug: unknown; fields: string[] }> = [];

  for await (const article of cursor) {
    const set: Record<string, unknown> = {};
    const sourceUrl = normalizeUrl(article.originalSourceUrl || article.sourceUrl);
    if (sourceUrl && article.originalSourceUrl !== sourceUrl) set.originalSourceUrl = sourceUrl;
    if (!article.originalSourceName && article.sourceName) set.originalSourceName = article.sourceName;
    if (!article.sourceContentHash && (article.excerpt || article.content)) set.sourceContentHash = hash(article.excerpt || article.content);
    if (!article.contentHash && article.content) set.contentHash = hash(article.content);
    if (article.slug && article.canonicalUrl !== `${siteUrl}/news/${article.slug}`) set.canonicalUrl = `${siteUrl}/news/${article.slug}`;
    if (!article.importedAt && article.generationMode === "feed") set.importedAt = article.createdAt || article.publishedAt || new Date();
    if (!article.lastUpdatedAt) set.lastUpdatedAt = article.updatedAt || article.publishedAt || article.createdAt || new Date();
    if (!article.reviewStatus) {
      set.reviewStatus = article.status === "published" && article.generationMode === "manual" ? "approved" : article.status === "published" ? "needs_review" : "pending";
    }
    if (!Object.keys(set).length) continue;
    operations.push({ updateOne: { filter: { _id: article._id }, update: { $set: set } } });
    if (samples.length < 20) samples.push({ slug: article.slug, fields: Object.keys(set) });
    if (operations.length >= operationLimit) break;
  }

  if (!apply) {
    console.log(JSON.stringify({ mode: "dry-run", matched: operations.length, limit: Number.isFinite(operationLimit) ? operationLimit : null, samples, instruction: "Run npm run seo:migrate -- --apply --limit=100 after reviewing this output and taking a backup." }, null, 2));
    return;
  }

  let modified = 0;
  for (let index = 0; index < operations.length; index += 500) {
    const result = await collection.bulkWrite(operations.slice(index, index + 500) as never[], { ordered: false });
    modified += result.modifiedCount;
  }
  console.log(JSON.stringify({ mode: "applied", matched: operations.length, modified, limit: Number.isFinite(operationLimit) ? operationLimit : null }, null, 2));
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}).finally(() => mongoose.disconnect());
