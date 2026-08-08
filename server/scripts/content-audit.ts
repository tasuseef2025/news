import "dotenv/config";
import mongoose from "mongoose";

function normalize(value: unknown) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function similarity(left: string, right: string) {
  const a = new Set(normalize(left).split(" ").filter((word) => word.length > 2));
  const b = new Set(normalize(right).split(" ").filter((word) => word.length > 2));
  if (!a.size || !b.size) return 0;
  const shared = [...a].filter((word) => b.has(word)).length;
  return shared / Math.min(a.size, b.size);
}

function finding<T>(values: T[]) {
  return { count: values.length, samples: values.slice(0, 20) };
}

async function run() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not configured");
  await mongoose.connect(process.env.MONGODB_URI, { dbName: "news_website", bufferCommands: false });
  const docs = await mongoose.connection.db.collection("articles").find({ status: "published" }).project({
    title: 1, slug: 1, content: 1, excerpt: 1, category: 1, tags: 1, sourceUrl: 1,
    originalSourceUrl: 1, contentHash: 1, sourceContentHash: 1, qualityScore: 1,
    originalityScore: 1, factualConfidence: 1, duplicateRisk: 1
  }).sort({ publishedAt: -1 }).toArray();

  const similarTitles: Array<{ first: string; second: string; score: number }> = [];
  for (let i = 0; i < docs.length; i += 1) {
    for (let j = i + 1; j < Math.min(docs.length, i + 100); j += 1) {
      const score = similarity(String(docs[i].title), String(docs[j].title));
      if (score >= 0.72) similarTitles.push({ first: String(docs[i].slug), second: String(docs[j].slug), score: Number(score.toFixed(2)) });
    }
  }

  const hashGroups = new Map<string, string[]>();
  for (const doc of docs) {
    if (!doc.contentHash) continue;
    hashGroups.set(doc.contentHash, [...(hashGroups.get(doc.contentHash) || []), String(doc.slug)]);
  }

  console.log(JSON.stringify({
    generatedAt: new Date().toISOString(),
    mode: "read-only",
    totalPublished: docs.length,
    thinContent: finding(docs.filter((doc) => normalize(doc.content).split(" ").length < 500).map((doc) => doc.slug)),
    missingSource: finding(docs.filter((doc) => !doc.originalSourceUrl && !doc.sourceUrl).map((doc) => doc.slug)),
    exactContentDuplicates: finding([...hashGroups].filter(([, slugs]) => slugs.length > 1).map(([hash, slugs]) => ({ hash, slugs }))),
    similarTitles: finding(similarTitles),
    highDuplicateRisk: finding(docs.filter((doc) => Number(doc.duplicateRisk || 0) > 72).map((doc) => ({ slug: doc.slug, duplicateRisk: doc.duplicateRisk }))),
    unscoredLegacyArticles: finding(docs.filter((doc) => doc.qualityScore === undefined).map((doc) => doc.slug))
  }, null, 2));
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}).finally(() => mongoose.disconnect());
