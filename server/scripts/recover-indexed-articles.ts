import "dotenv/config";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import mongoose from "mongoose";
import { rebuildArticle } from "../../src/lib/article-rebuild";
import { extractSourceArticle } from "../../src/lib/source-extraction";
import { normalizeArticlePayload } from "../../src/lib/content-automation";
import { validatePublishReadiness } from "../../src/lib/article-quality";
import { articleIndexabilityIssues } from "../../src/lib/public-articles";
import { indexedArticleSlugs, recoveryCandidate, recoveryPublicationDate, recoveryWriteFilter } from "../../src/lib/indexed-recovery";
import { recoveryModelConfig } from "../../src/lib/recovery-model";
import { safeArticleImage } from "../../src/lib/article-images";
import { siteConfig } from "../../src/lib/site";
import redirects from "../../src/lib/duplicate-redirects.json";

type Outcome = {
  slug: string;
  status: "published" | "ready" | "held" | "skipped";
  reason?: string;
  httpBefore?: number;
  httpAfter?: number;
  words?: number;
  provider?: string;
  model?: string;
};

function value(name: string) {
  return process.argv.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
}

async function httpStatus(url: string) {
  const response = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(20000), headers: { "User-Agent": "NovexaNewsBot/1.0 (+https://www.novexa.news/about)" } });
  await response.body?.cancel();
  return response.status;
}

async function run() {
  const apply = process.argv.includes("--apply");
  const plan = process.argv.includes("--plan");
  if (apply && plan) throw new Error("Use --plan or --apply, not both");
  const limit = Number(value("limit") ?? 25);
  const concurrency = Number(value("concurrency") ?? 2);
  if (!Number.isInteger(limit) || limit < 0) throw new Error("--limit must be a nonnegative integer (0 = all indexed candidates)");
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 4) throw new Error("--concurrency must be between 1 and 4");
  const inputPath = resolve(value("indexed-file") || "exports/gsc-indexed-urls.json");
  const slugs = new Set(indexedArticleSlugs(JSON.parse(readFileSync(inputPath, "utf8").replace(/^\uFEFF/, "")), siteConfig.domain));
  const redirectedPaths = new Set(redirects.map((entry) => entry.source));
  const config = recoveryModelConfig();
  if (!plan && !config.geminiKey && !config.mistralKey) throw new Error("No Gemini or Mistral recovery key is configured");
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is missing");
  await mongoose.connect(process.env.MONGODB_URI, { dbName: "news_website", autoIndex: false, serverSelectionTimeoutMS: 30000 });
  const collection = mongoose.connection.db.collection("articles");
  const revisions = mongoose.connection.db.collection("articlerevisions");
  const docs = await collection.find({ slug: { $in: [...slugs] } }).sort({ publishedAt: -1 }).toArray();
  const candidates = docs.filter((doc) => recoveryCandidate(doc, slugs, redirectedPaths));
  const hosts = (value("hosts") || "").split(",").map((host) => host.trim().replace(/^www\./, "")).filter(Boolean);
  const matching = hosts.length ? candidates.filter((doc) => {
    try { return hosts.includes(new URL(String(doc.originalSourceUrl || doc.sourceUrl)).hostname.replace(/^www\./, "")); }
    catch { return false; }
  }) : candidates;
  const selected = limit ? matching.slice(0, limit) : matching;
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const reportPath = resolve(`exports/indexed-recovery-${stamp}.json`);
  const outcomes: Outcome[] = [];
  const report = {
    startedAt: new Date().toISOString(), mode: plan ? "plan" : apply ? "apply" : "dry-run", indexedFile: inputPath,
    indexedArticles: slugs.size, unavailableDrafts: candidates.length, selected: selected.length,
    missingRecords: [...slugs].filter((slug) => !docs.some((doc) => doc.slug === slug)),
    excludedRecords: docs.filter((doc) => !recoveryCandidate(doc, slugs, redirectedPaths)).map((doc) => ({ slug: doc.slug, status: doc.status, redirected: redirectedPaths.has(`/news/${doc.slug}`) })),
    outcomes
  };
  mkdirSync(resolve("exports"), { recursive: true });
  const checkpoint = () => writeFileSync(reportPath, JSON.stringify(report, null, 2));
  checkpoint();
  if (apply && selected.length) {
    mkdirSync(resolve("backups"), { recursive: true });
    writeFileSync(resolve(`backups/indexed-recovery-${stamp}.json`), JSON.stringify(selected, null, 2));
  }
  console.log(JSON.stringify({ mode: report.mode, indexedArticles: slugs.size, unavailableDrafts: candidates.length, selected: selected.length, excluded: report.excludedRecords.length, missing: report.missingRecords, reportPath }));
  let cursor = 0;
  let processed = 0;
  let providersUnavailable = false;

  async function worker() {
    while (cursor < selected.length) {
      const doc = selected[cursor++];
      const slug = String(doc.slug);
      let before: number | undefined;
      try {
        if (providersUnavailable) {
          outcomes.push({ slug, status: "held", reason: "Both recovery providers unavailable; not attempted" });
          continue;
        }
        const url = `${siteConfig.domain}/news/${slug}`;
        before = await httpStatus(url);
        if (before !== 404) {
          outcomes.push({ slug, status: "skipped", httpBefore: before, reason: "Live URL does not return 404" });
          continue;
        }
        const sourceUrl = String(doc.originalSourceUrl || doc.sourceUrl || "");
        if (!sourceUrl) {
          outcomes.push({ slug, status: "held", httpBefore: before, reason: "Original source URL is missing" });
          continue;
        }
        const publishedAt = recoveryPublicationDate(doc);
        const source = await extractSourceArticle(sourceUrl);
        if (!source.ok) {
          outcomes.push({ slug, status: "held", httpBefore: before, reason: `Source text unavailable (${source.reason})` });
          continue;
        }
        if (plan) {
          outcomes.push({ slug, status: "ready", httpBefore: before, words: source.wordCount, reason: "404 confirmed and source extracted; no model called" });
          continue;
        }
        const result = await rebuildArticle({
          title: String(doc.title), category: String(doc.category || "World"),
          sourceName: String(doc.originalSourceName || doc.sourceName || new URL(sourceUrl).hostname),
          sourceUrl, sourceExcerpt: String(doc.excerpt || ""), extracted: source,
          publishedAt: publishedAt.toISOString()
        }, { provider: "gemini-mistral" });
        if (!result.ok) {
          if (/Gemini unavailable for this run.*Mistral unavailable for this run/.test(result.reason)) providersUnavailable = true;
          outcomes.push({ slug, status: "held", httpBefore: before, reason: result.reason });
          continue;
        }
        const built = result.article;
        const namedAuthors = ["Abdul Basit", "Syeda Manal Tirmizi"];
        const image = safeArticleImage({ image: doc.image, title: built.title, category: doc.category });
        const payload = normalizeArticlePayload({
          title: built.title, slug, content: built.content, excerpt: built.excerpt,
          author: namedAuthors.includes(doc.author) ? doc.author : "Novexa News Desk",
          category: String(doc.category || "World"), metaTitle: built.metaTitle, metaDescription: built.metaDescription,
          image, imageAlt: doc.imageAlt || built.imageAlt, ogImage: image.startsWith("/") ? `${siteConfig.domain}${image}` : image,
          tags: built.tags, sourceName: doc.sourceName, sourceUrl: doc.sourceUrl,
          originalSourceName: doc.originalSourceName || doc.sourceName, originalSourceUrl: sourceUrl,
          references: [
            { name: String(doc.originalSourceName || doc.sourceName || new URL(sourceUrl).hostname), url: sourceUrl },
            ...built.externalLinks.filter((link) => link.url !== sourceUrl).map((link) => ({ name: link.anchorText, url: link.url }))
          ],
          publishedAt,
          status: "published" as const, reviewStatus: "approved" as const, generationMode: "ai" as const,
          duplicateRisk: built.assessment.duplicateRisk
        });
        const readiness = validatePublishReadiness(payload);
        const issues = [...readiness.reasons, ...articleIndexabilityIssues(payload)];
        if (issues.length) {
          outcomes.push({ slug, status: "held", httpBefore: before, reason: [...new Set(issues)].join("; ") });
          continue;
        }
        if (process.argv.includes("--print")) console.log(JSON.stringify({ slug, title: payload.title, provider: built.provider, content: payload.content }));
        let after: number | undefined;
        if (apply) {
          // Recheck after the model call so concurrent editorial work is not replaced.
          if (await httpStatus(url) !== 404) {
            outcomes.push({ slug, status: "skipped", reason: "URL stopped returning 404 during recovery" });
            continue;
          }
          const session = await mongoose.startSession();
          try {
            await session.withTransaction(async () => {
              const now = new Date();
              const update = await collection.updateOne(recoveryWriteFilter(doc), { $set: {
                ...payload, rejectionReasons: [], qualityScore: built.assessment.qualityScore,
                originalityScore: built.assessment.originalityScore, factualConfidence: built.assessment.factualConfidence,
                aiGeneratedAt: now, rebuiltAt: now, rebuildAttemptedAt: now, rebuildFailureReason: "",
                lastUpdatedAt: now, contentUpdatedAt: now, updatedAt: now,
                recoveryProvider: built.provider, recoveryModel: built.model, indexedRecoveredAt: now
              } }, { session });
              if (update.modifiedCount !== 1) throw new Error("Record changed during recovery; no replacement saved");
              await revisions.insertOne({ articleId: doc._id, title: doc.title, excerpt: doc.excerpt, content: doc.content,
                sourceName: doc.sourceName, sourceUrl: doc.sourceUrl, snapshot: doc,
                reason: "indexed-404-recovery: sourced rewrite at original URL and publication date", createdAt: now }, { session });
            });
          } finally { await session.endSession(); }
          try { after = await httpStatus(url); } catch { /* The committed record remains reported as published. */ }
        }
        outcomes.push({ slug, status: apply ? "published" : "ready", httpBefore: before, httpAfter: after, words: built.wordCount, provider: built.provider, model: built.model });
      } catch (error) {
        outcomes.push({ slug, status: "held", httpBefore: before, reason: error instanceof Error ? error.message.slice(0, 250) : "Recovery failed" });
      } finally {
        processed += 1;
        checkpoint();
        const latest = outcomes[outcomes.length - 1];
        console.log(`[indexed-recovery] ${processed}/${selected.length} ${latest.status}: ${slug}${latest.reason ? ` (${latest.reason})` : ""}`);
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker));
  const counts = outcomes.reduce<Record<string, number>>((all, item) => { all[item.status] = (all[item.status] || 0) + 1; return all; }, {});
  console.log(JSON.stringify({ completedAt: new Date().toISOString(), counts, reportPath }, null, 2));
}

run().catch((error) => { console.error(error instanceof Error ? error.message : "Recovery failed"); process.exitCode = 1; }).finally(() => mongoose.disconnect());
