import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import mongoose from "mongoose";

const apply = process.argv.includes("--apply");
const templates = [
  "The story falls under the",
  "This newsroom brief was automatically prepared from a monitored public feed",
  "indexed archive",
  "refreshed version keeps the original",
  "preserving the original topic",
  "indexed page active"
];
const backupDirectory = path.resolve("backups");
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupPath = path.join(backupDirectory, "fallback-articles-" + timestamp + ".json");

async function quarantineFallbackArticles() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not configured");

  await mongoose.connect(process.env.MONGODB_URI, { dbName: "news_website", bufferCommands: false });
  const articles = mongoose.connection.db.collection("articles");
  const query = { status: "published", $or: templates.map((template) => ({ content: { $regex: template } })) };
  const matches = await articles.find(query).sort({ publishedAt: -1 }).toArray();

  if (!apply) {
    console.log(JSON.stringify({ mode: "dry-run", matches: matches.length }, null, 2));
    return;
  }

  await mkdir(backupDirectory, { recursive: true });
  await writeFile(backupPath, JSON.stringify(matches, null, 2), "utf8");

  const result = await articles.updateMany(query, {
    $set: {
      status: "draft",
      generationMode: "feed",
      seoQuarantinedAt: new Date()
    },
    $unset: { scheduledAt: "" }
  });

  console.log(JSON.stringify({
    mode: "applied",
    matched: result.matchedCount,
    modified: result.modifiedCount,
    backupPath
  }, null, 2));
}

quarantineFallbackArticles()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });