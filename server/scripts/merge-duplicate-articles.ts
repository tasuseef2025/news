import "dotenv/config";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import mongoose from "mongoose";
import { Article } from "../../src/models/Article";

const CLUSTER_THRESHOLD = 0.72;
const DIRECT_MERGE_THRESHOLD = 0.8;
const apply = process.argv.includes("--apply");
const redirectMapPath = path.resolve("src/lib/duplicate-redirects.json");
const backupDirectory = path.resolve("backups");

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

type Doc = {
  _id: mongoose.Types.ObjectId;
  title: string;
  slug: string;
  category: string;
  content: string;
  qualityScore?: number;
  publishedAt?: Date;
  views?: number;
};

class UnionFind {
  parent = new Map<string, string>();
  find(x: string): string {
    if (!this.parent.has(x)) this.parent.set(x, x);
    if (this.parent.get(x) !== x) this.parent.set(x, this.find(this.parent.get(x)!));
    return this.parent.get(x)!;
  }
  union(a: string, b: string) {
    const rootA = this.find(a);
    const rootB = this.find(b);
    if (rootA !== rootB) this.parent.set(rootA, rootB);
  }
}

async function run() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not configured");
  await mongoose.connect(process.env.MONGODB_URI, { dbName: "news_website", bufferCommands: false });

  const docs = await mongoose.connection.db.collection("articles").find({ status: "published" }).project({
    title: 1, slug: 1, category: 1, content: 1, qualityScore: 1, publishedAt: 1, views: 1
  }).sort({ publishedAt: -1 }).toArray() as unknown as Doc[];

  // Loose clustering to find candidate groups (transitive chains at CLUSTER_THRESHOLD).
  const uf = new UnionFind();
  for (let i = 0; i < docs.length; i += 1) {
    for (let j = i + 1; j < Math.min(docs.length, i + 100); j += 1) {
      if (similarity(docs[i].title, docs[j].title) >= CLUSTER_THRESHOLD) {
        uf.union(docs[i].slug, docs[j].slug);
      }
    }
  }

  const clusters = new Map<string, Doc[]>();
  for (const doc of docs) {
    const root = uf.find(doc.slug);
    clusters.set(root, [...(clusters.get(root) || []), doc]);
  }

  const candidateClusters = [...clusters.values()].filter((cluster) => cluster.length > 1);
  console.log(`Candidate clusters (loose, >=${CLUSTER_THRESHOLD}): ${candidateClusters.length}, ${candidateClusters.reduce((sum, c) => sum + c.length, 0)} articles.`);
  console.log(`Applying strict direct-to-winner re-check at >=${DIRECT_MERGE_THRESHOLD} to avoid merging distinct pieces that only chained together transitively (e.g. a photo gallery, a live blog and a player-ratings piece about the same event are NOT duplicates of each other).\n`);

  const losersBackup: Doc[] = [];
  const newRedirects: Array<{ source: string; destination: string }> = [];
  const skippedWeakLinks: Array<{ slug: string; winner: string; score: number }> = [];
  let totalLosers = 0;

  for (const cluster of candidateClusters) {
    const sorted = [...cluster].sort((a, b) => {
      const scoreDiff = (b.qualityScore ?? -1) - (a.qualityScore ?? -1);
      if (scoreDiff !== 0) return scoreDiff;
      const lengthDiff = (b.content?.length || 0) - (a.content?.length || 0);
      if (lengthDiff !== 0) return lengthDiff;
      return new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime();
    });
    const [winner, ...rest] = sorted;

    const losers = rest.filter((doc) => {
      const score = similarity(doc.title, winner.title);
      if (score >= DIRECT_MERGE_THRESHOLD) return true;
      skippedWeakLinks.push({ slug: doc.slug, winner: winner.slug, score: Math.round(score * 100) / 100 });
      return false;
    });

    if (!losers.length) continue;

    console.log(`${apply ? "MERGING" : "[dry-run] would merge"}: ${winner.slug} <- ${losers.map((l) => l.slug).join(", ")}`);

    for (const loser of losers) {
      losersBackup.push(loser);
      newRedirects.push({ source: `/news/${loser.slug}`, destination: `/news/${winner.slug}` });
      totalLosers += 1;
    }

    if (apply) {
      const loserViews = losers.reduce((sum, l) => sum + (l.views || 0), 0);
      if (loserViews > 0) {
        await Article.findByIdAndUpdate(winner._id, { $inc: { views: loserViews } });
      }
      await Article.deleteMany({ _id: { $in: losers.map((l) => l._id) } });
    }
  }

  if (skippedWeakLinks.length) {
    console.log(`\nSkipped ${skippedWeakLinks.length} loosely-chained articles that did not meet the direct threshold against their cluster's winner (left untouched, not merged):`);
    skippedWeakLinks.forEach((item) => console.log(`  ${item.slug} (score ${item.score} vs ${item.winner})`));
  }

  if (!apply) {
    console.log(`\n[dry-run] Would merge ${totalLosers} articles. Re-run with --apply to back up and execute.`);
    return;
  }

  if (losersBackup.length) {
    await mkdir(backupDirectory, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    await writeFile(path.join(backupDirectory, `duplicate-articles-${timestamp}.json`), JSON.stringify(losersBackup, null, 2), "utf8");
  }

  let existingRedirects: Array<{ source: string; destination: string }> = [];
  try {
    existingRedirects = JSON.parse(await readFile(redirectMapPath, "utf8"));
  } catch {
    existingRedirects = [];
  }
  const merged = [...existingRedirects];
  for (const redirect of newRedirects) {
    if (!merged.some((existing) => existing.source === redirect.source)) merged.push(redirect);
  }
  merged.sort((a, b) => a.source.localeCompare(b.source));
  await writeFile(redirectMapPath, JSON.stringify(merged, null, 2), "utf8");

  console.log(`\nMerged ${totalLosers} duplicate articles into their canonical versions.`);
  console.log(`Redirect map now has ${merged.length} entries at ${redirectMapPath}.`);
}

run()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
