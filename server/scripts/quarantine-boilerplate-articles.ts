import "dotenv/config";
import { mkdirSync, writeFileSync } from "fs";
import { resolve } from "path";
import mongoose from "mongoose";
import { pipelineBoilerplateMatches } from "../../src/lib/article-quality";

/**
 * Unpublishes articles whose copy leaked publishing-pipeline boilerplate.
 *
 * Soft action only: sets status to "draft" so the page 404s and drops out of
 * every listing and the sitemap. Nothing is ever deleted, and the original
 * status is recorded so the change can be reversed.
 *
 * Dry run by default. Pass --apply to write.
 */

const FIELDS = ["title", "excerpt", "content", "metaDescription", "metaTitle"] as const;

type Doc = {
  _id: mongoose.Types.ObjectId;
  slug?: string;
  title?: string;
  status?: string;
  reviewStatus?: string;
  excerpt?: string;
  content?: string;
  metaDescription?: string;
  metaTitle?: string;
};

function flag(name: string) {
  return process.argv.includes(`--${name}`);
}

async function run() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not configured");
  const apply = flag("apply");

  await mongoose.connect(process.env.MONGODB_URI, { dbName: "news_website", bufferCommands: false });
  const col = mongoose.connection.db.collection<Doc>("articles");

  // Match in the database on the broad marker, then confirm in application code
  // with the exact shared patterns so the script and the publish gate agree.
  const coarse = await col
    .find({
      status: "published",
      $or: [
        { content: { $regex: "RSS feeds|human-readable article|bare headline|clipped rewrite|MongoDB", $options: "i" } },
        { excerpt: { $regex: "RSS feeds|human-readable article|bare headline|clipped rewrite|MongoDB", $options: "i" } },
        { metaDescription: { $regex: "RSS feeds|human-readable article|bare headline|clipped rewrite|MongoDB", $options: "i" } }
      ]
    })
    .project<Doc>({ slug: 1, title: 1, status: 1, reviewStatus: 1, title_: 1, excerpt: 1, content: 1, metaDescription: 1, metaTitle: 1 })
    .toArray();

  const affected = coarse
    .map((doc) => {
      const hits = new Map<string, string[]>();
      for (const field of FIELDS) {
        const labels = pipelineBoilerplateMatches(String(doc[field] || ""));
        if (labels.length) hits.set(field, labels);
      }
      return { doc, hits };
    })
    .filter((item) => item.hits.size > 0);

  console.log("=".repeat(76));
  console.log(apply ? "MODE: APPLY (writes to MongoDB)" : "MODE: DRY RUN (no writes)");
  console.log("=".repeat(76));
  console.log(`coarse database matches : ${coarse.length}`);
  console.log(`confirmed affected      : ${affected.length}`);
  console.log("");
  console.log("fields affected:");
  for (const field of FIELDS) {
    const count = affected.filter((item) => item.hits.has(field)).length;
    if (count) console.log(`  ${field.padEnd(16)} ${count}`);
  }

  console.log("\nfirst 10 affected articles:");
  for (const { doc, hits } of affected.slice(0, 10)) {
    console.log(`  /news/${doc.slug}`);
    console.log(`    fields: ${[...hits.keys()].join(", ")}`);
  }

  const ids = affected.map((item) => item.doc._id);
  mkdirSync(resolve(process.cwd(), "exports"), { recursive: true });
  const reportPath = resolve(process.cwd(), `exports/quarantine-${apply ? "applied" : "dryrun"}-${Date.now()}.json`);
  writeFileSync(
    reportPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        mode: apply ? "apply" : "dry-run",
        affected: affected.length,
        articles: affected.map((item) => ({
          id: String(item.doc._id),
          slug: item.doc.slug,
          title: item.doc.title,
          previousStatus: item.doc.status,
          previousReviewStatus: item.doc.reviewStatus,
          fields: Object.fromEntries(item.hits)
        }))
      },
      null,
      2
    )
  );
  console.log(`\nreport written: ${reportPath}`);

  if (!apply) {
    console.log("\nDry run only. Nothing was written. Re-run with --apply to quarantine.");
    await mongoose.disconnect();
    return;
  }

  const result = await col.updateMany(
    { _id: { $in: ids } },
    {
      $set: {
        status: "draft",
        reviewStatus: "needs_review",
        quarantinedAt: new Date(),
        quarantineReason: "Published copy contained publishing-pipeline boilerplate (SEO trust cleanup)"
      }
    }
  );

  console.log(`\nmatched ${result.matchedCount}, modified ${result.modifiedCount}`);
  console.log("Articles are now drafts: /news/<slug> returns 404 and they are out of the sitemap.");
  console.log("Nothing was deleted. Find them later with:");
  console.log('  db.articles.find({ quarantinedAt: { $exists: true } })');

  await mongoose.disconnect();
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}).finally(() => mongoose.disconnect());
