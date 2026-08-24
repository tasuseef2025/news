import "dotenv/config";
import mongoose from "mongoose";
import { extractSourceArticle } from "../../src/lib/source-extraction";

async function run() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not configured");
  const sampleSize = Number(process.argv.find((arg) => arg.startsWith("--limit="))?.split("=")[1] || 25);
  await mongoose.connect(process.env.MONGODB_URI, { dbName: "news_website", bufferCommands: false });

  const hostFilter = process.argv.find((arg) => arg.startsWith("--host="))?.split("=")[1];
  const match: Record<string, unknown> = {
    status: "draft",
    reviewStatus: "needs_review",
    sourceUrl: { $exists: true, $ne: "" }
  };
  if (hostFilter) match.sourceUrl = { $regex: hostFilter.replace(/\./g, "\\."), $options: "i" };

  const docs = await mongoose.connection.db.collection("articles").aggregate([
    { $match: match },
    { $sample: { size: sampleSize } },
    { $project: { title: 1, sourceUrl: 1, originalSourceUrl: 1, sourceName: 1, content: 1 } }
  ]).toArray();

  const results: Array<{
    host: string;
    currentWords: number;
    ok: boolean;
    extractedWords: number;
    reason?: string;
  }> = [];
  for (const doc of docs) {
    const url = String(doc.originalSourceUrl || doc.sourceUrl);
    const extracted = await extractSourceArticle(url);
    results.push({
      host: (() => { try { return new URL(url).hostname; } catch { return "invalid"; } })(),
      currentWords: String(doc.content || "").trim().split(/\s+/).filter(Boolean).length,
      ok: extracted.ok,
      extractedWords: extracted.wordCount,
      reason: extracted.reason
    });
  }

  const ok = results.filter((item) => item.ok);
  const byHost = new Map<string, { tried: number; ok: number; words: number[] }>();
  for (const item of results) {
    const entry = byHost.get(item.host) || { tried: 0, ok: 0, words: [] };
    entry.tried += 1;
    if (item.ok) { entry.ok += 1; entry.words.push(item.extractedWords); }
    byHost.set(item.host, entry);
  }

  console.log(JSON.stringify({
    sampled: results.length,
    extractionSucceeded: ok.length,
    successRate: results.length ? `${Math.round((ok.length / results.length) * 100)}%` : "0%",
    extractedWordStats: ok.length ? {
      min: Math.min(...ok.map((item) => item.extractedWords)),
      median: ok.map((item) => item.extractedWords).sort((a, b) => a - b)[Math.floor(ok.length / 2)],
      max: Math.max(...ok.map((item) => item.extractedWords)),
      atLeast400Words: ok.filter((item) => item.extractedWords >= 400).length
    } : null,
    byHost: Object.fromEntries([...byHost].map(([host, entry]) => [host, {
      tried: entry.tried,
      ok: entry.ok,
      medianWords: entry.words.length ? entry.words.sort((a, b) => a - b)[Math.floor(entry.words.length / 2)] : 0
    }])),
    failureReasons: Object.fromEntries(
      [...new Set(results.filter((item) => !item.ok).map((item) => item.reason))]
        .map((reason) => [reason, results.filter((item) => item.reason === reason).length])
    )
  }, null, 2));
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}).finally(() => mongoose.disconnect());
