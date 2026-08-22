import "dotenv/config";
import { mkdirSync, writeFileSync } from "fs";
import { resolve } from "path";
import mongoose from "mongoose";
import type { Collection, Document } from "mongodb";

// The shared deterministic gate reads this; the backlog rebuild targets 600 words.
process.env.FEED_MIN_PUBLISH_WORDS ||= "600";

import { extractSourceArticle } from "../../src/lib/source-extraction";
import { rebuildArticle } from "../../src/lib/article-rebuild";
import { normalizeArticlePayload, generateSlug } from "../../src/lib/content-automation";
import { findStockImage, stockImageIdentity } from "../../src/lib/stock-images";

type Options = {
  limit: number;
  apply: boolean;
  hosts: string[];
  category?: string;
  concurrency: number;
  hostDelayMs: number;
  retryFailed: boolean;
};

type Outcome = {
  id: string;
  slug: string;
  host: string;
  status: "published" | "held" | "skipped";
  reason?: string;
  wordsBefore: number;
  wordsAfter?: number;
  externalLinks?: number;
};

function flag(name: string) {
  return process.argv.includes(`--${name}`);
}

function value(name: string) {
  return process.argv.find((arg) => arg.startsWith(`--${name}=`))?.split("=").slice(1).join("=");
}

function options(): Options {
  return {
    limit: Number(value("limit") || 25),
    apply: flag("apply"),
    hosts: (value("hosts") || "").split(",").map((host) => host.trim()).filter(Boolean),
    category: value("category"),
    concurrency: Math.max(1, Math.min(6, Number(value("concurrency") || 3))),
    hostDelayMs: Math.max(0, Number(value("host-delay") || 1500)),
    retryFailed: flag("retry-failed")
  };
}

function words(value = "") {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "invalid";
  }
}

const lastHostRequest = new Map<string, number>();

async function waitForHost(host: string, delayMs: number) {
  if (!delayMs) return;
  const previous = lastHostRequest.get(host) || 0;
  const wait = previous + delayMs - Date.now();
  if (wait > 0) await new Promise((done) => setTimeout(done, wait));
  lastHostRequest.set(host, Date.now());
}

async function uniqueSlug(collection: Collection<Document>, base: string, currentId: mongoose.Types.ObjectId) {
  const root = generateSlug(base);
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const candidate = attempt === 0 ? root : `${root}-${attempt + 1}`;
    const clash = await collection.findOne({ slug: candidate, _id: { $ne: currentId } }, { projection: { _id: 1 } });
    if (!clash) return candidate;
  }
  return `${root}-${Date.now()}`;
}

async function run() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not configured");
  const config = options();

  await mongoose.connect(process.env.MONGODB_URI, { dbName: "news_website", bufferCommands: false });
  const collection = mongoose.connection.db.collection("articles");
  const revisions = mongoose.connection.db.collection("articlerevisions");

  const query: Record<string, unknown> = {
    status: "draft",
    reviewStatus: "needs_review",
    sourceUrl: { $exists: true, $nin: ["", null] }
  };
  if (!config.retryFailed) query.rebuildAttemptedAt = { $exists: false };
  if (config.category) query.category = config.category;
  if (config.hosts.length) {
    query.$or = config.hosts.map((host) => ({ sourceUrl: { $regex: host.replace(/\./g, "\\."), $options: "i" } }));
  }

  const candidates = await collection
    .find(query)
    .project({
      title: 1, slug: 1, content: 1, excerpt: 1, category: 1, sourceName: 1, sourceUrl: 1,
      originalSourceUrl: 1, originalSourceName: 1, image: 1, imageCredit: 1, imageCreditUrl: 1,
      publishedAt: 1, sourcePublishedAt: 1, createdAt: 1, tags: 1, references: 1
    })
    .sort({ createdAt: -1 })
    .limit(config.limit)
    .toArray();

  const recent = await collection
    .find({ image: { $type: "string" }, status: "published" })
    .project({ image: 1 })
    .sort({ createdAt: -1 })
    .limit(1000)
    .toArray();
  const usedImages = recent.map((doc) => String(doc.image)).filter(Boolean);

  console.error(
    `[rebuild] ${candidates.length} candidates | mode=${config.apply ? "APPLY" : "DRY-RUN"} | concurrency=${config.concurrency}`
  );

  const outcomes: Outcome[] = [];
  let cursor = 0;
  let done = 0;

  async function worker() {
    while (cursor < candidates.length) {
      const doc = candidates[cursor];
      cursor += 1;
      const sourceUrl = String(doc.originalSourceUrl || doc.sourceUrl || "");
      const host = hostOf(sourceUrl);
      const before = words(String(doc.content || ""));
      const id = doc._id as mongoose.Types.ObjectId;

      try {
        await waitForHost(host, config.hostDelayMs);
        const extracted = await extractSourceArticle(sourceUrl);

        const result = await rebuildArticle({
          title: String(doc.title || ""),
          category: String(doc.category || "World"),
          sourceName: String(doc.originalSourceName || doc.sourceName || host),
          sourceUrl,
          sourceExcerpt: String(doc.excerpt || ""),
          extracted
        });

        if (!result.ok) {
          outcomes.push({ id: String(id), slug: String(doc.slug), host, status: "held", reason: result.reason, wordsBefore: before });
          if (config.apply) {
            await collection.updateOne({ _id: id }, {
              $set: {
                rebuildAttemptedAt: new Date(),
                rebuildFailureReason: result.reason.slice(0, 400),
                ...(result.assessment
                  ? {
                      qualityScore: result.assessment.qualityScore,
                      originalityScore: result.assessment.originalityScore,
                      factualConfidence: result.assessment.factualConfidence
                    }
                  : {})
              }
            });
          }
          continue;
        }

        const rebuilt = result.article;
        // Keep the story's real chronology. Stamping a month of backlog with today's
        // date would both misdate the news and create a same-day publishing spike.
        const publicationDate = new Date(
          (doc.sourcePublishedAt as Date) || (doc.createdAt as Date) || Date.now()
        );
        const stock = await findStockImage({
          title: rebuilt.title,
          category: String(doc.category || "World"),
          excludeUrls: usedImages
        });
        if (stock?.url) usedImages.push(stock.url);

        const slug = config.apply
          ? await uniqueSlug(collection, rebuilt.slug || rebuilt.title, id)
          : generateSlug(rebuilt.slug || rebuilt.title);

        const payload = normalizeArticlePayload({
          title: rebuilt.title,
          slug,
          excerpt: rebuilt.excerpt,
          content: rebuilt.content,
          category: String(doc.category || "World"),
          author: "Novexa News Desk",
          metaTitle: rebuilt.metaTitle,
          metaDescription: rebuilt.metaDescription,
          image: stock?.url || String(doc.image || ""),
          imageAlt: rebuilt.imageAlt,
          imageCredit: stock?.credit || doc.imageCredit,
          imageCreditUrl: stock?.pageUrl || doc.imageCreditUrl,
          tags: rebuilt.tags,
          sourceUrl,
          originalSourceUrl: sourceUrl,
          sourceName: String(doc.originalSourceName || doc.sourceName || host),
          originalSourceName: String(doc.originalSourceName || doc.sourceName || host),
          references: [
            { name: String(doc.originalSourceName || doc.sourceName || host), url: sourceUrl },
            ...rebuilt.externalLinks
              .filter((link) => link.url !== sourceUrl)
              .map((link) => ({ name: link.anchorText, url: link.url }))
          ],
          publishedAt: publicationDate.toISOString()
        });

        if (config.apply) {
          await revisions.insertOne({
            articleId: id,
            title: doc.title,
            excerpt: doc.excerpt,
            content: doc.content,
            sourceName: doc.sourceName,
            sourceUrl: doc.sourceUrl,
            reason: "backlog-rebuild: replaced thin needs_review draft with sourced 600+ word article",
            createdAt: new Date()
          });

          await collection.updateOne({ _id: id }, {
            $set: {
              ...payload,
              status: "published",
              reviewStatus: "approved",
              generationMode: "ai",
              rejectionReasons: [],
              qualityScore: rebuilt.assessment.qualityScore,
              originalityScore: rebuilt.assessment.originalityScore,
              factualConfidence: rebuilt.assessment.factualConfidence,
              duplicateRisk: rebuilt.assessment.duplicateRisk,
              readingTime: Math.max(1, Math.ceil(rebuilt.wordCount / 220)),
              aiGeneratedAt: new Date(),
              rebuildAttemptedAt: new Date(),
              rebuiltAt: new Date(),
              rebuildFailureReason: "",
              lastUpdatedAt: new Date(),
              publishedAt: publicationDate
            }
          });
        }

        if (flag("print")) {
          console.error(
            [
              "",
              "================================================================",
              `TITLE:     ${rebuilt.title}`,
              `SLUG:      ${slug}`,
              `WORDS:     ${before} -> ${rebuilt.wordCount}`,
              `META DESC: ${rebuilt.metaDescription} (${rebuilt.metaDescription.length} chars)`,
              `ALLOWED:   ${[sourceUrl, ...extracted.authoritativeLinks.map((link) => link.url)].join(" | ")}`,
              `LINKS KEPT: ${rebuilt.externalLinks.map((link) => `${link.anchorText} -> ${link.url}`).join(" | ") || "(none)"}`,
              "----------------------------------------------------------------",
              rebuilt.content,
              "================================================================"
            ].join("\n")
          );
        }

        outcomes.push({
          id: String(id),
          slug,
          host,
          status: "published",
          wordsBefore: before,
          wordsAfter: rebuilt.wordCount,
          externalLinks: rebuilt.externalLinks.length
        });
      } catch (error) {
        outcomes.push({
          id: String(id),
          slug: String(doc.slug),
          host,
          status: "skipped",
          reason: error instanceof Error ? error.message.slice(0, 200) : "unknown error",
          wordsBefore: before
        });
      } finally {
        done += 1;
        if (done % 5 === 0 || done === candidates.length) {
          console.error(`[rebuild] ${done}/${candidates.length} processed`);
        }
      }
    }
  }

  await Promise.all(Array.from({ length: config.concurrency }, worker));

  const publishedItems = outcomes.filter((item) => item.status === "published");
  const held = outcomes.filter((item) => item.status !== "published");
  const heldReasons = new Map<string, number>();
  for (const item of held) {
    const key = (item.reason || "unknown").replace(/\d+/g, "N").slice(0, 90);
    heldReasons.set(key, (heldReasons.get(key) || 0) + 1);
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    mode: config.apply ? "apply" : "dry-run",
    processed: outcomes.length,
    published: publishedItems.length,
    held: held.length,
    successRate: outcomes.length ? `${Math.round((publishedItems.length / outcomes.length) * 100)}%` : "0%",
    averageWordsAfter: publishedItems.length
      ? Math.round(publishedItems.reduce((sum, item) => sum + (item.wordsAfter || 0), 0) / publishedItems.length)
      : 0,
    averageExternalLinks: publishedItems.length
      ? Number((publishedItems.reduce((sum, item) => sum + (item.externalLinks || 0), 0) / publishedItems.length).toFixed(1))
      : 0,
    byHost: Object.fromEntries(
      [...new Set(outcomes.map((item) => item.host))].map((host) => [
        host,
        {
          processed: outcomes.filter((item) => item.host === host).length,
          published: publishedItems.filter((item) => item.host === host).length
        }
      ])
    ),
    heldReasons: Object.fromEntries([...heldReasons].sort((left, right) => right[1] - left[1]))
  };

  mkdirSync(resolve(process.cwd(), "exports"), { recursive: true });
  writeFileSync(
    resolve(process.cwd(), `exports/rebuild-report-${Date.now()}.json`),
    JSON.stringify({ summary, outcomes }, null, 2)
  );

  console.log(JSON.stringify(summary, null, 2));
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}).finally(() => mongoose.disconnect());
