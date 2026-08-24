import "dotenv/config";
import { readFileSync } from "fs";
import { resolve } from "path";
import mongoose from "mongoose";

const TEMPLATE_MARKERS = [
  "the story falls under the",
  "novexa news will continue",
  "editorial review is recommended",
  "the available feed detail is limited",
  "readers following public affairs",
  "what to watch next",
  "this newsroom brief was automatically prepared",
  "a developing story is being tracked from"
];

type BacklogDoc = {
  _id: mongoose.Types.ObjectId;
  title?: string;
  slug?: string;
  content?: string;
  excerpt?: string;
  category?: string;
  status?: string;
  reviewStatus?: string;
  generationMode?: string;
  rejectionReasons?: string[];
  aiFailureReason?: string;
  sourceName?: string;
  sourceUrl?: string;
  originalSourceUrl?: string;
  references?: Array<{ name?: string; url?: string }>;
  sourcePublishedAt?: Date;
  publishedAt?: Date;
  createdAt?: Date;
  aiAttemptedAt?: Date;
  duplicateRisk?: number;
  qualityScore?: number;
  parentStoryId?: mongoose.Types.ObjectId;
};

function words(value = "") {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function tally<T>(items: T[], key: (item: T) => string) {
  const counts = new Map<string, number>();
  for (const item of items) {
    const value = key(item);
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return Object.fromEntries([...counts].sort((left, right) => right[1] - left[1]));
}

function csvIds() {
  try {
    const file = readFileSync(resolve(process.cwd(), "exports/needs-review-article-links.csv"), "utf8");
    return [...file.matchAll(/articleId=([a-f0-9]{24})/gi)].map((match) => match[1]);
  } catch {
    return [];
  }
}

async function run() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not configured");
  await mongoose.connect(process.env.MONGODB_URI, { dbName: "news_website", bufferCommands: false });
  const collection = mongoose.connection.db.collection<BacklogDoc>("articles");

  const total = await collection.countDocuments({});
  const published = await collection.countDocuments({ status: "published" });

  const backlog = await collection
    .find({
      $or: [
        { status: { $ne: "published" } },
        { reviewStatus: { $in: ["pending", "rejected", "needs_review"] } }
      ]
    })
    .project<BacklogDoc>({
      title: 1, slug: 1, content: 1, excerpt: 1, category: 1, status: 1, reviewStatus: 1,
      generationMode: 1, rejectionReasons: 1, aiFailureReason: 1, sourceName: 1, sourceUrl: 1,
      originalSourceUrl: 1, references: 1, sourcePublishedAt: 1, publishedAt: 1, createdAt: 1,
      aiAttemptedAt: 1, duplicateRisk: 1, qualityScore: 1, parentStoryId: 1
    })
    .toArray();

  const wordBuckets = { "0-99": 0, "100-299": 0, "300-499": 0, "500-599": 0, "600+": 0 };
  const reasonCounts = new Map<string, number>();
  let templated = 0;
  let hasSourceUrl = 0;
  let hasReferences = 0;
  let developingDuplicates = 0;
  let thinExcerptSource = 0;
  let oldest: Date | null = null;
  let newest: Date | null = null;

  for (const doc of backlog) {
    const count = words(doc.content);
    if (count < 100) wordBuckets["0-99"] += 1;
    else if (count < 300) wordBuckets["100-299"] += 1;
    else if (count < 500) wordBuckets["300-499"] += 1;
    else if (count < 600) wordBuckets["500-599"] += 1;
    else wordBuckets["600+"] += 1;

    const normalized = String(doc.content || "").toLowerCase();
    if (TEMPLATE_MARKERS.some((marker) => normalized.includes(marker))) templated += 1;
    if (doc.sourceUrl || doc.originalSourceUrl) hasSourceUrl += 1;
    if (doc.references?.length) hasReferences += 1;
    if (doc.parentStoryId) developingDuplicates += 1;
    if (words(doc.excerpt) < 40) thinExcerptSource += 1;

    for (const reason of doc.rejectionReasons || []) {
      const key = reason.replace(/\d+/g, "N").slice(0, 90);
      reasonCounts.set(key, (reasonCounts.get(key) || 0) + 1);
    }
    if (doc.aiFailureReason) {
      const key = `AI: ${doc.aiFailureReason.replace(/\d+/g, "N").slice(0, 80)}`;
      reasonCounts.set(key, (reasonCounts.get(key) || 0) + 1);
    }

    const stamp = doc.createdAt || doc.publishedAt;
    if (stamp) {
      if (!oldest || stamp < oldest) oldest = stamp;
      if (!newest || stamp > newest) newest = stamp;
    }
  }

  const hostCounts = new Map<string, number>();
  for (const doc of backlog) {
    let host = "invalid";
    try {
      host = new URL(String(doc.originalSourceUrl || doc.sourceUrl || "")).hostname.replace(/^www\./, "");
    } catch {
      host = "invalid";
    }
    hostCounts.set(host, (hostCounts.get(host) || 0) + 1);
  }
  const sortedHosts = [...hostCounts].sort((left, right) => right[1] - left[1]);

  const ids = csvIds();
  const uniqueIds = [...new Set(ids)];
  const csvDocs = uniqueIds.length
    ? await collection
        .find({ _id: { $in: uniqueIds.map((id) => new mongoose.Types.ObjectId(id)) } })
        .project<BacklogDoc>({ status: 1, reviewStatus: 1, generationMode: 1, content: 1 })
        .toArray()
    : [];

  console.log(JSON.stringify({
    generatedAt: new Date().toISOString(),
    mode: "read-only",
    database: {
      totalArticles: total,
      published,
      backlog: backlog.length
    },
    backlogBreakdown: {
      byStatus: tally(backlog, (doc) => String(doc.status || "missing")),
      byReviewStatus: tally(backlog, (doc) => String(doc.reviewStatus || "missing")),
      byGenerationMode: tally(backlog, (doc) => String(doc.generationMode || "missing")),
      wordCounts: wordBuckets,
      dateRange: {
        oldest: oldest ? new Date(oldest).toISOString() : null,
        newest: newest ? new Date(newest).toISOString() : null
      }
    },
    sourceMaterial: {
      hasSourceUrl,
      hasReferences,
      templatedFallbackContent: templated,
      thinExcerpt: thinExcerptSource,
      linkedDevelopingDuplicates: developingDuplicates
    },
    topRejectionReasons: Object.fromEntries(
      [...reasonCounts].sort((left, right) => right[1] - left[1]).slice(0, 20)
    ),
    topCategories: Object.fromEntries(
      Object.entries(tally(backlog, (doc) => String(doc.category || "missing"))).slice(0, 20)
    ),
    sourceHosts: {
      distinct: sortedHosts.length,
      top30: Object.fromEntries(sortedHosts.slice(0, 30))
    },
    exportCsv: {
      linksInFile: ids.length,
      uniqueIds: uniqueIds.length,
      foundInDatabase: csvDocs.length,
      missingFromDatabase: uniqueIds.length - csvDocs.length,
      byStatus: tally(csvDocs, (doc) => String(doc.status || "missing")),
      byReviewStatus: tally(csvDocs, (doc) => String(doc.reviewStatus || "missing")),
      under600Words: csvDocs.filter((doc) => words(doc.content) < 600).length
    }
  }, null, 2));
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}).finally(() => mongoose.disconnect());
