import "dotenv/config";
import { writeFileSync } from "fs";
import mongoose from "mongoose";
import { validatePublishReadiness, inspectArticleContent } from "../../src/lib/article-quality";
import { isArticleIndexable, articleIndexabilityIssues } from "../../src/lib/public-articles";

/**
 * Republishes hand-rewritten articles over their existing records.
 *
 * The slug is never touched: these URLs are already indexed, and the point of
 * the exercise is to keep them. Only the copy and the fields that gate
 * publication change.
 *
 * Every article is run through the same publish gate the editor uses before
 * anything is written. An article that fails is reported and skipped, never
 * partially applied.
 *
 * Dry run by default. Pass --apply to write.
 */

type Rewrite = {
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  excerpt: string;
  content: string;
};

const flag = (name: string) => process.argv.includes(`--${name}`);

async function loadRewrites(): Promise<Rewrite[]> {
  const batches = ["_rewrites-1.mjs", "_rewrites-2.mjs", "_rewrites-3.mjs", "_rewrites-4.mjs", "_rewrites-5.mjs"];
  const all: Rewrite[] = [];
  for (const file of batches) {
    const mod = await import(`./${file}`);
    all.push(...(mod.default as Rewrite[]));
  }
  return all;
}

async function run() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not configured");
  const apply = flag("apply");

  const rewrites = await loadRewrites();
  await mongoose.connect(process.env.MONGODB_URI, { dbName: "news_website", bufferCommands: false });
  const col = mongoose.connection.db.collection("articles");

  const ready: Array<{ slug: string; set: Record<string, unknown>; words: number }> = [];
  const rejected: Array<{ slug: string; reasons: string[] }> = [];

  for (const rewrite of rewrites) {
    const existing = await col.findOne({ slug: rewrite.slug });
    if (!existing) {
      rejected.push({ slug: rewrite.slug, reasons: ["article no longer exists in the database"] });
      continue;
    }

    // These records carried Pexels stock photos assigned by category rather than
    // by subject, and several were plainly wrong for their story - a globe on a
    // film premiere, an empty Europa League stand on an NFL engagement. Rather
    // than write alt text describing a picture that does not match the article,
    // each now uses Novexa's own generated headline card, which does. The
    // original image URL is kept in previousImage so this is reversible.
    const category = String(existing.category || "News");
    const card = `/api/og?title=${encodeURIComponent(rewrite.title)}&category=${encodeURIComponent(category)}`;

    const set: Record<string, unknown> = {
      title: rewrite.title,
      content: rewrite.content,
      excerpt: rewrite.excerpt,
      metaTitle: rewrite.metaTitle,
      metaDescription: rewrite.metaDescription,
      image: card,
      ogImage: card,
      imageAlt: `Novexa News cover graphic showing the headline of this ${category} report`,
      // The publisher's own name must never be the byline.
      author: "Novexa News Desk",
      status: "published",
      reviewStatus: "approved",
      generationMode: "manual",
      duplicateRisk: 0,
      contentUpdatedAt: new Date(),
      // Clear the quarantine marker; this record is no longer the template.
      seoQuarantinedAt: null,
      quarantineReason: null,
      // Keep a pointer back to the replaced stock photo.
      previousImage: existing.image || null
    };

    const candidate = { ...existing, ...set };

    // Gate 1: the same check the editor API runs before publishing.
    const gate = validatePublishReadiness(candidate as never);
    // Gate 2: the check that decides whether the page may be indexed.
    const indexIssues = articleIndexabilityIssues(candidate);
    // Gate 3: belt and braces on the prose itself.
    const contentIssues = inspectArticleContent(rewrite.content).map((issue) => issue.message);

    const reasons = [...new Set([...gate.reasons, ...indexIssues, ...contentIssues])];
    if (reasons.length || !isArticleIndexable(candidate)) {
      rejected.push({ slug: rewrite.slug, reasons: reasons.length ? reasons : ["failed isArticleIndexable"] });
      continue;
    }

    ready.push({ slug: rewrite.slug, set, words: rewrite.content.split(/\s+/).filter(Boolean).length });
  }

  console.log("=".repeat(76));
  console.log(apply ? "MODE: APPLY (writes to MongoDB)" : "MODE: DRY RUN (no writes)");
  console.log("=".repeat(76));
  console.log(`rewrites supplied : ${rewrites.length}`);
  console.log(`pass every gate   : ${ready.length}`);
  console.log(`rejected          : ${rejected.length}`);

  if (rejected.length) {
    console.log("\nrejected:");
    for (const item of rejected) {
      console.log(`  /news/${item.slug}`);
      for (const reason of item.reasons) console.log(`      - ${reason}`);
    }
  }

  console.log("\nready to publish:");
  for (const item of ready) console.log(`  ${String(item.words).padStart(4)}w  /news/${item.slug}`);

  writeFileSync(
    `exports/rewrites-${apply ? "applied" : "dryrun"}-${Date.now()}.json`,
    JSON.stringify({ generatedAt: new Date().toISOString(), ready: ready.map((r) => r.slug), rejected }, null, 2)
  );

  if (!apply) {
    console.log("\nDry run only. Nothing was written. Re-run with --apply to publish.");
    await mongoose.disconnect();
    return;
  }

  let modified = 0;
  for (const item of ready) {
    const result = await col.updateOne({ slug: item.slug }, { $set: item.set });
    modified += result.modifiedCount;
  }
  console.log(`\npublished ${modified} rewritten articles. Slugs and URLs unchanged.`);

  await mongoose.disconnect();
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}).finally(() => mongoose.disconnect());
