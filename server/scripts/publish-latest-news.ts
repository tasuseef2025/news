import "dotenv/config";
import { mkdirSync, writeFileSync } from "fs";
import { resolve } from "path";
import mongoose from "mongoose";
import type { Collection, Document } from "mongodb";

process.env.FEED_MIN_PUBLISH_WORDS ||= "600";

import { parseFeed, type FeedEntry } from "../../src/lib/feed-ingestion";
import { normalizeSourceUrl } from "../../src/lib/article-quality";
import { extractSourceArticle } from "../../src/lib/source-extraction";
import { rebuildArticle } from "../../src/lib/article-rebuild";
import { normalizeArticlePayload, generateSlug } from "../../src/lib/content-automation";
import { findStockImage } from "../../src/lib/stock-images";

/** Only hosts that actually serve their article text to a declared bot. */
const EXTRACTABLE = ["bbc.co.uk", "bbc.com", "theguardian.com", "techcrunch.com", "nasa.gov", "tribune.com.pk"];

type Candidate = {
  entry: FeedEntry;
  category: string;
  sourceName: string;
  feedUrl: string;
  normalizedUrl: string;
  host: string;
};

type Outcome = {
  category: string;
  host: string;
  status: "published" | "held" | "error";
  title?: string;
  slug?: string;
  words?: number;
  links?: number;
  reason?: string;
};

function flag(name: string) {
  return process.argv.includes(`--${name}`);
}

function value(name: string) {
  return process.argv.find((arg) => arg.startsWith(`--${name}=`))?.split("=").slice(1).join("=");
}

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "invalid";
  }
}

function isExtractable(host: string) {
  return EXTRACTABLE.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
}

async function uniqueSlug(collection: Collection<Document>, base: string) {
  const root = generateSlug(base);
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const candidate = attempt === 0 ? root : `${root}-${attempt + 1}`;
    if (!(await collection.findOne({ slug: candidate }, { projection: { _id: 1 } }))) return candidate;
  }
  return `${root}-${Date.now()}`;
}

async function run() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not configured");

  const perCategory = Number(value("per-category") || 2);
  const maxAgeHours = Number(value("max-age-hours") || 72);
  const apply = flag("apply");
  const onlyCategories = (value("categories") || "").split(",").map((item) => item.trim()).filter(Boolean);
  const concurrency = Math.max(1, Math.min(4, Number(value("concurrency") || 2)));

  await mongoose.connect(process.env.MONGODB_URI, { dbName: "news_website", bufferCommands: false });
  const articles = mongoose.connection.db.collection("articles");
  const sources = await mongoose.connection.db.collection("feedsources").find({ active: true }).toArray();

  const eligibleSources = sources.filter((source) => isExtractable(hostOf(String(source.url))));
  console.error(`[latest] ${eligibleSources.length} extractable feed sources`);

  const collected: Candidate[] = [];
  const settled = await Promise.allSettled(eligibleSources.map(async (source) => {
    const response = await fetch(String(source.url), {
      headers: { "User-Agent": "NovexaNewsBot/1.0 (+https://www.novexa.news/about)" },
      signal: AbortSignal.timeout(15000)
    });
    if (!response.ok) throw new Error(`feed ${response.status}`);
    const entries = parseFeed(await response.text());
    return { source, entries };
  }));

  for (const result of settled) {
    if (result.status !== "fulfilled") continue;
    const { source, entries } = result.value;
    for (const entry of entries) {
      const host = hostOf(entry.link);
      if (!isExtractable(host)) continue;
      const ageHours = entry.publishedAt ? (Date.now() - entry.publishedAt.getTime()) / 3_600_000 : 999;
      if (ageHours > maxAgeHours) continue;
      const category = String(source.defaultCategory || "World");
      if (onlyCategories.length && !onlyCategories.includes(category)) continue;
      collected.push({
        entry,
        category,
        sourceName: String(source.name),
        feedUrl: String(source.url),
        normalizedUrl: normalizeSourceUrl(entry.link),
        host
      });
    }
  }

  const seen = new Set<string>();
  const unique = collected.filter((item) => {
    if (seen.has(item.normalizedUrl)) return false;
    seen.add(item.normalizedUrl);
    return true;
  });

  const existing = await articles
    .find({ sourceUrl: { $in: unique.map((item) => item.normalizedUrl) } })
    .project({ sourceUrl: 1 })
    .toArray();
  const known = new Set(existing.map((doc) => String(doc.sourceUrl)));
  const fresh = unique.filter((item) => !known.has(item.normalizedUrl));

  // Freshest first, then a fixed quota per category so the front page stays balanced.
  fresh.sort((left, right) => (right.entry.publishedAt?.getTime() || 0) - (left.entry.publishedAt?.getTime() || 0));
  const quota = new Map<string, number>();
  const chosen: Candidate[] = [];
  for (const item of fresh) {
    const used = quota.get(item.category) || 0;
    if (used >= perCategory) continue;
    quota.set(item.category, used + 1);
    chosen.push(item);
  }

  console.error(
    `[latest] ${collected.length} entries -> ${fresh.length} new -> ${chosen.length} selected across ${quota.size} categories | mode=${apply ? "APPLY" : "DRY-RUN"}`
  );

  const recent = await articles
    .find({ image: { $type: "string" }, status: "published" })
    .project({ image: 1 })
    .sort({ createdAt: -1 })
    .limit(1000)
    .toArray();
  const usedImages = recent.map((doc) => String(doc.image)).filter(Boolean);

  const outcomes: Outcome[] = [];
  let cursor = 0;

  async function worker() {
    while (cursor < chosen.length) {
      const item = chosen[cursor];
      cursor += 1;
      try {
        const extracted = await extractSourceArticle(item.normalizedUrl);

        // --plan stops before the paid model call: proves selection and extraction
        // are healthy and shows exactly what is queued to write.
        if (flag("plan")) {
          outcomes.push({
            category: item.category,
            host: item.host,
            status: extracted.ok ? "published" : "held",
            title: item.entry.title,
            words: extracted.wordCount,
            links: extracted.authoritativeLinks.length,
            reason: extracted.ok ? undefined : `extraction ${extracted.reason}`
          });
          continue;
        }

        const result = await rebuildArticle({
          title: item.entry.title,
          category: item.category,
          sourceName: item.sourceName,
          sourceUrl: item.normalizedUrl,
          sourceExcerpt: item.entry.description,
          extracted
        });

        if (!result.ok) {
          outcomes.push({ category: item.category, host: item.host, status: "held", reason: result.reason });
          continue;
        }

        const built = result.article;
        const stock = await findStockImage({ title: built.title, category: item.category, excludeUrls: usedImages });
        if (stock?.url) usedImages.push(stock.url);

        const slug = apply ? await uniqueSlug(articles, built.slug || built.title) : generateSlug(built.slug || built.title);
        const publishedAt = item.entry.publishedAt || new Date();

        const payload = normalizeArticlePayload({
          title: built.title,
          slug,
          excerpt: built.excerpt,
          content: built.content,
          category: item.category,
          author: "Novexa News Desk",
          metaTitle: built.metaTitle,
          metaDescription: built.metaDescription,
          image: stock?.url || "",
          imageAlt: built.imageAlt,
          imageCredit: stock?.credit,
          imageCreditUrl: stock?.pageUrl,
          tags: built.tags,
          sourceName: item.sourceName,
          sourceUrl: item.normalizedUrl,
          originalSourceName: item.sourceName,
          originalSourceUrl: item.normalizedUrl,
          references: [
            { name: item.sourceName, url: item.normalizedUrl },
            ...built.externalLinks
              .filter((link) => link.url !== item.normalizedUrl)
              .map((link) => ({ name: link.anchorText, url: link.url }))
          ],
          publishedAt: publishedAt.toISOString()
        });

        if (flag("print")) {
          console.error(
            [
              "",
              "=".repeat(72),
              `[${item.category}]  ${built.title}`,
              `words=${built.wordCount}  links=${built.externalLinks.length}  source=${item.sourceName}`,
              `meta: ${built.metaDescription}`,
              "-".repeat(72),
              built.content,
              "=".repeat(72)
            ].join("\n")
          );
        }

        if (apply) {
          await articles.insertOne({
            ...payload,
            rssFeedUrl: item.feedUrl,
            sourceGuid: item.entry.guid || undefined,
            sourceItemId: item.entry.itemId || item.normalizedUrl,
            sourcePublishedAt: item.entry.publishedAt,
            importedAt: new Date(),
            aiGeneratedAt: new Date(),
            status: "published",
            reviewStatus: "approved",
            generationMode: "ai",
            rejectionReasons: [],
            qualityScore: built.assessment.qualityScore,
            originalityScore: built.assessment.originalityScore,
            factualConfidence: built.assessment.factualConfidence,
            duplicateRisk: built.assessment.duplicateRisk,
            readingTime: Math.max(1, Math.ceil(built.wordCount / 220)),
            gallery: [],
            featured: false,
            trending: false,
            breakingNews: false,
            allowComments: true,
            views: 0,
            publishedAt,
            createdAt: new Date(),
            updatedAt: new Date()
          });
        }

        outcomes.push({
          category: item.category,
          host: item.host,
          status: "published",
          title: built.title,
          slug,
          words: built.wordCount,
          links: built.externalLinks.length
        });
      } catch (error) {
        outcomes.push({
          category: item.category,
          host: item.host,
          status: "error",
          reason: error instanceof Error ? error.message.slice(0, 200) : "unknown"
        });
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker));

  const publishedItems = outcomes.filter((item) => item.status === "published");
  const summary = {
    generatedAt: new Date().toISOString(),
    mode: apply ? "apply" : "dry-run",
    selected: chosen.length,
    published: publishedItems.length,
    held: outcomes.length - publishedItems.length,
    averageWords: publishedItems.length
      ? Math.round(publishedItems.reduce((sum, item) => sum + (item.words || 0), 0) / publishedItems.length)
      : 0,
    averageLinks: publishedItems.length
      ? Number((publishedItems.reduce((sum, item) => sum + (item.links || 0), 0) / publishedItems.length).toFixed(1))
      : 0,
    byCategory: Object.fromEntries(
      [...new Set(publishedItems.map((item) => item.category))].map((category) => [
        category,
        publishedItems.filter((item) => item.category === category).length
      ])
    ),
    headlines: publishedItems.map((item) => `[${item.category}] ${item.title}`),
    heldReasons: outcomes.filter((item) => item.status !== "published").map((item) => item.reason)
  };

  mkdirSync(resolve(process.cwd(), "exports"), { recursive: true });
  writeFileSync(
    resolve(process.cwd(), `exports/latest-news-${Date.now()}.json`),
    JSON.stringify({ summary, outcomes }, null, 2)
  );
  console.log(JSON.stringify(summary, null, 2));
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}).finally(() => mongoose.disconnect());
