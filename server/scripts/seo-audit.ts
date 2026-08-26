import "dotenv/config";
import { writeFileSync } from "fs";
import mongoose from "mongoose";
import { articleIndexabilityIssues } from "../../src/lib/public-articles";
import { cleanText, generateStructuredData } from "../../src/lib/content-automation";
import { inspectArticleContent, normalizedText, textSimilarity } from "../../src/lib/article-quality";

type Recommendation = "KEEP" | "IMPROVE" | "REVIEW" | "CONSOLIDATE" | "REMOVE";
type AuditRow = {
  url: string; status: string; title: string; titleLength: number; metaDescription: string;
  metaDescriptionLength: number; h1: string; wordCount: number; author: string; category: string;
  publishedDate: string; modifiedDate: string; canonical: string; image: string; structuredData: boolean;
  potentialDuplicate: string; promptLeakage: string; placeholderDetection: string; brokenHtml: string;
  qualityWarnings: string; recommendation: Recommendation;
};

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.novexa.news").replace(/\/$/, "");
const outputArg = process.argv.find((item) => item.startsWith("--output="))?.slice(9);
const format = process.argv.find((item) => item.startsWith("--format="))?.slice(9) || (outputArg?.endsWith(".csv") ? "csv" : "json");
const printAll = process.argv.includes("--all");

function iso(value: unknown) {
  const date = value ? new Date(String(value)) : null;
  return date && Number.isFinite(date.getTime()) ? date.toISOString() : "";
}

function csvCell(value: unknown) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function toCsv(rows: AuditRow[]) {
  const fields = Object.keys(rows[0] || {}) as Array<keyof AuditRow>;
  return [fields.map(csvCell).join(","), ...rows.map((row) => fields.map((field) => csvCell(row[field])).join(","))].join("\n");
}

function titleTokens(value: string) {
  return [...new Set(normalizedText(value).split(" ").filter((word) => word.length > 3))];
}

async function run() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not configured");
  await mongoose.connect(process.env.MONGODB_URI, { dbName: "news_website", bufferCommands: false });
  const docs = await mongoose.connection.db.collection("articles").find({ status: "published" }).project({
    title: 1, slug: 1, excerpt: 1, content: 1, category: 1, author: 1, image: 1, imageAlt: 1,
    metaTitle: 1, metaDescription: 1, canonicalUrl: 1, publishedAt: 1, updatedAt: 1,
    reviewStatus: 1, generationMode: 1, duplicateRisk: 1, contentHash: 1, sourceName: 1,
    sourceUrl: 1, originalSourceName: 1, originalSourceUrl: 1, references: 1, tags: 1,
    ogImage: 1, readingTime: 1, status: 1
  }).sort({ publishedAt: -1 }).toArray();

  const exactGroups = new Map<string, number[]>();
  docs.forEach((doc, index) => {
    const hash = String(doc.contentHash || "");
    if (hash) exactGroups.set(hash, [...(exactGroups.get(hash) || []), index]);
  });
  const duplicateMatches = new Map<number, Set<number>>();
  const tokenIndex = new Map<string, number[]>();
  docs.forEach((doc, index) => {
    const candidates = new Set<number>();
    for (const token of titleTokens(String(doc.title || ""))) {
      for (const candidate of tokenIndex.get(token) || []) candidates.add(candidate);
    }
    for (const candidate of candidates) {
      if (textSimilarity(String(doc.title || ""), String(docs[candidate].title || "")) >= 0.72) {
        duplicateMatches.set(index, new Set([...(duplicateMatches.get(index) || []), candidate]));
        duplicateMatches.set(candidate, new Set([...(duplicateMatches.get(candidate) || []), index]));
      }
    }
    for (const token of titleTokens(String(doc.title || ""))) tokenIndex.set(token, [...(tokenIndex.get(token) || []), index]);
  });
  for (const indexes of exactGroups.values()) {
    if (indexes.length < 2) continue;
    for (const index of indexes) duplicateMatches.set(index, new Set([...(duplicateMatches.get(index) || []), ...indexes.filter((item) => item !== index)]));
  }

  const rows: AuditRow[] = docs.map((doc, index) => {
    const title = cleanText(String(doc.title || ""));
    const content = String(doc.content || "");
    const metaDescription = cleanText(String(doc.metaDescription || ""));
    const expectedCanonical = `${siteUrl}/news/${doc.slug}`;
    const contentIssues = inspectArticleContent(content);
    const indexIssues = articleIndexabilityIssues(doc);
    const duplicateSlugs = [...(duplicateMatches.get(index) || [])].map((item) => String(docs[item].slug)).slice(0, 5);
    const wordCount = cleanText(content).split(/\s+/).filter(Boolean).length;
    const warnings: string[] = [];
    if (title.length < 30 || title.length > 70) warnings.push("Review headline length");
    if (metaDescription.length < 120 || metaDescription.length > 170) warnings.push("Review meta description length");
    if (!doc.author) warnings.push("Missing author");
    if (!doc.category) warnings.push("Missing category");
    if (!doc.image || !doc.imageAlt) warnings.push("Missing image or alt text");
    if (!doc.publishedAt) warnings.push("Missing publication date");
    if (doc.canonicalUrl !== expectedCanonical) warnings.push("Canonical mismatch");
    if (wordCount < 300) warnings.push("Concise article needs usefulness review");
    warnings.push(...indexIssues);
    const externallyBased = doc.generationMode !== "manual" || doc.sourceName || doc.originalSourceName;
    const sources = [doc.sourceUrl, doc.originalSourceUrl, ...(doc.references || []).map((item: { url?: string }) => item.url)].filter(Boolean);
    if (externallyBased && !sources.length) warnings.push("Externally based article lacks source URL");
    const externalPublisherByline = Boolean(doc.sourceName && normalizedText(String(doc.author || "")) === normalizedText(String(doc.sourceName)));
    if (externalPublisherByline) {
      warnings.push("External publisher is assigned as the Novexa author");
    }

    let recommendation: Recommendation = "KEEP";
    if (!title || !doc.slug || wordCount < 30) recommendation = "REMOVE";
    else if (duplicateSlugs.length) recommendation = "CONSOLIDATE";
    else if (contentIssues.length || Number(doc.duplicateRisk || 0) > 72 || doc.reviewStatus !== "approved" || externalPublisherByline) recommendation = "REVIEW";
    else if (warnings.length) recommendation = "IMPROVE";

    let structuredData = false;
    try {
      const parsed = JSON.parse(generateStructuredData({
        ...doc, title, slug: String(doc.slug || ""), publishedAt: iso(doc.publishedAt),
        updatedAt: iso(doc.updatedAt), content
      }));
      structuredData = parsed["@type"] === "NewsArticle" && Boolean(parsed.headline && parsed.datePublished && parsed.author && parsed.publisher && parsed.mainEntityOfPage);
    } catch {
      structuredData = false;
    }
    if (!structuredData) warnings.push("Structured data cannot be generated");

    return {
      url: expectedCanonical, status: String(doc.status || ""), title, titleLength: title.length,
      metaDescription, metaDescriptionLength: metaDescription.length, h1: title, wordCount,
      author: String(doc.author || ""), category: String(doc.category || ""),
      publishedDate: iso(doc.publishedAt), modifiedDate: iso(doc.updatedAt || doc.publishedAt),
      canonical: String(doc.canonicalUrl || ""), image: String(doc.image || ""), structuredData,
      potentialDuplicate: duplicateSlugs.join(" | "),
      promptLeakage: contentIssues.filter((issue) => issue.code === "prompt_leakage").map((issue) => issue.message).join(" | "),
      placeholderDetection: contentIssues.filter((issue) => ["placeholder", "raw_json", "malformed_heading"].includes(issue.code)).map((issue) => issue.message).join(" | "),
      brokenHtml: contentIssues.filter((issue) => issue.code === "broken_markup").map((issue) => issue.message).join(" | "),
      qualityWarnings: [...new Set(warnings)].join(" | "), recommendation
    };
  });

  const recommendations = Object.fromEntries((["KEEP", "IMPROVE", "REVIEW", "CONSOLIDATE", "REMOVE"] as Recommendation[])
    .map((name) => [name, rows.filter((row) => row.recommendation === name).length]));
  const report = {
    generatedAt: new Date().toISOString(), mode: "read-only", totalPublished: rows.length, recommendations,
    findings: {
      promptLeakage: rows.filter((row) => row.promptLeakage).length,
      placeholdersOrMalformedContent: rows.filter((row) => row.placeholderDetection).length,
      brokenMarkup: rows.filter((row) => row.brokenHtml).length,
      potentialDuplicates: rows.filter((row) => row.potentialDuplicate).length,
      conciseUnder300Words: rows.filter((row) => row.wordCount < 300).length,
      nonIndexable: rows.filter((_, index) => articleIndexabilityIssues(docs[index]).length > 0).length
    },
    samplesNeedingAttention: rows.filter((row) => row.recommendation !== "KEEP").slice(0, 25),
    ...(printAll ? { articles: rows } : {})
  };

  if (outputArg) writeFileSync(outputArg, format === "csv" ? toCsv(rows) : JSON.stringify({ ...report, articles: rows }, null, 2), "utf8");
  console.log(JSON.stringify({ ...report, output: outputArg || null }, null, 2));
}

run().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exitCode = 1;
}).finally(() => mongoose.disconnect());
