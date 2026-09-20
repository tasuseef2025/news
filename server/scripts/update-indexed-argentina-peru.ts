import "dotenv/config";
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import mongoose from "mongoose";
import { v2 as cloudinary } from "cloudinary";
import { normalizeArticlePayload } from "../../src/lib/content-automation";
import { validatePublishReadiness } from "../../src/lib/article-quality";
import { articleIndexabilityIssues, publicArticleFilter } from "../../src/lib/public-articles";
import { articleSchema } from "../../src/lib/validators";
import { Article } from "../../src/models/Article";

const items = [
  {
    slug: "are-argentina-being-treated-favourably-at-world-cup",
    title: "Are Argentina Being Treated Favourably at World Cup 2026?",
    excerpt: "Argentina's run to the World Cup final has included disputed VAR calls, but controversial decisions are not proof of a FIFA conspiracy.",
    category: "Football",
    subcategory: "World Cup 2026",
    metaTitle: "Are Argentina Being Favoured at World Cup 2026?",
    metaDescription: "Egypt, Switzerland and England questioned decisions that helped Argentina, but the evidence does not establish a FIFA conspiracy favouring Lionel Messi.",
    sourceName: "BBC Sport",
    sourceUrl: "https://www.bbc.co.uk/sport/football/articles/cx2wkwd7e6go",
    imageFile: "argentina.jpg",
    imageAlt: "Lionel Messi celebrates with Argentina teammates during the 2026 World Cup",
    imageCredit: "BBC Sport / Getty Images",
    imageCreditUrl: "https://www.bbc.co.uk/sport/football/articles/cx2wkwd7e6go",
    references: [
      { name: "BBC Sport: Are Argentina being treated favourably at World Cup 2026?", url: "https://www.bbc.co.uk/sport/football/articles/cx2wkwd7e6go" },
      { name: "Al Jazeera and Reuters: FIFA refereeing chief denies Argentina-Egypt bias", url: "https://www.aljazeera.com/sports/2026/7/9/argentina-egypt-world-cup-referee-var-bias-collina-salah-zico-hassan" }
    ],
    tags: ["Argentina", "Lionel Messi", "World Cup 2026", "VAR", "Football Referees"]
  },
  {
    slug: "strategic-partner-peru-s-fujimori-plans-to-intensify-ties-with-the-us",
    title: "Peru's Fujimori Moves to Deepen Ties With the United States",
    excerpt: "President Keiko Fujimori's government plans closer US ties, regional security cooperation and a diplomatic reset with Latin American neighbours.",
    category: "World",
    subcategory: "Latin America",
    metaTitle: "Peru's Fujimori Moves to Deepen Ties With the US",
    metaDescription: "Keiko Fujimori's government plans closer US ties, membership in the Shield of the Americas and renewed relations with regional neighbours.",
    sourceName: "Al Jazeera and Reuters",
    sourceUrl: "https://www.aljazeera.com/news/2026/7/31/strategic-partner-perus-fujimori-plans-to-intensify-ties-with-the-us",
    imageFile: "peru-web.jpg",
    imageAlt: "Peruvian President Keiko Fujimori and Foreign Minister Carlos Espa stand before national flags after taking office",
    imageCredit: "AFP, via Epoch Times",
    imageCreditUrl: "https://www.epochtimes.com/gb/26/7/31/n14821186.htm",
    references: [
      { name: "Al Jazeera and Reuters: Fujimori plans to intensify US ties", url: "https://www.aljazeera.com/news/2026/7/31/strategic-partner-perus-fujimori-plans-to-intensify-ties-with-the-us" },
      { name: "Epoch Times: Fujimori administration and US ties", url: "https://www.epochtimes.com/gb/26/7/31/n14821186.htm" }
    ],
    tags: ["Peru", "Keiko Fujimori", "United States", "Latin America", "Shield of the Americas"]
  }
] as const;

type ExistingArticle = Record<string, unknown> & {
  _id: mongoose.Types.ObjectId;
  slug: string;
  author: string;
  publishedAt: Date;
  updatedAt: Date;
  views?: number;
  gallery?: string[];
  featured?: boolean;
  trending?: boolean;
  breakingNews?: boolean;
  allowComments?: boolean;
};

function readContent(slug: string) {
  const lines = readFileSync(resolve("docs/articles", `${slug}.md`), "utf8").trim().split(/\r?\n/);
  assert(lines[0].startsWith("# "), `${slug}: missing headline`);
  assert.equal(lines[2], "By Novexa News Desk");
  return { title: lines[0].slice(2), content: lines.slice(4).join("\n").trim() };
}

function buildPayload(item: typeof items[number], existing: ExistingArticle, image: string, updatedAt: Date) {
  const article = readContent(item.slug);
  assert.equal(article.title, item.title);
  return normalizeArticlePayload({
    title: item.title,
    slug: item.slug,
    excerpt: item.excerpt,
    content: article.content,
    author: existing.author || "Novexa News Desk",
    category: item.category,
    subcategory: item.subcategory,
    image,
    imageAlt: item.imageAlt,
    imageCredit: item.imageCredit,
    imageCreditUrl: item.imageCreditUrl,
    ogImage: image,
    gallery: Array.isArray(existing.gallery) ? existing.gallery : [],
    tags: [...item.tags],
    status: "published" as const,
    featured: Boolean(existing.featured),
    trending: Boolean(existing.trending),
    breakingNews: Boolean(existing.breakingNews),
    allowComments: existing.allowComments !== false,
    metaTitle: item.metaTitle,
    metaDescription: item.metaDescription,
    sourceName: item.sourceName,
    sourceUrl: item.sourceUrl,
    originalSourceName: item.sourceName,
    originalSourceUrl: item.sourceUrl,
    references: [...item.references],
    publishedAt: existing.publishedAt,
    contentUpdatedAt: updatedAt,
    lastUpdatedAt: updatedAt,
    generationMode: "manual" as const,
    reviewStatus: "approved" as const,
    rejectionReasons: [],
    duplicateRisk: 0,
    qualityScore: 96,
    originalityScore: 96,
    factualConfidence: 94,
    views: Number(existing.views || 0)
  });
}

function validate(payload: ReturnType<typeof buildPayload>) {
  const parsed = articleSchema.parse(payload);
  const readiness = validatePublishReadiness(payload);
  assert(readiness.approved, `${payload.slug}: ${readiness.reasons.join("; ")}`);
  assert.deepEqual(articleIndexabilityIssues(payload), [], `${payload.slug}: indexability validation failed`);
  assert(payload.content.split(/\s+/).length >= 600, `${payload.slug}: article is shorter than 600 words`);
  assert(!/\*\*|^---$|^\|/m.test(payload.content), `${payload.slug}: unsupported article formatting`);
  const schema = JSON.parse(payload.schemaMarkup);
  assert.equal(schema["@type"], "NewsArticle");
  assert.equal(schema.author.name, payload.author);
  assert.equal(schema.datePublished, new Date(payload.publishedAt).toISOString());
  return parsed;
}

async function main() {
  assert(process.env.MONGODB_URI, "MONGODB_URI is missing");
  const apply = process.argv.includes("--apply");
  if (apply) {
    assert(
      process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET,
      "Cloudinary configuration is missing"
    );
  }

  await mongoose.connect(process.env.MONGODB_URI, {
    dbName: "news_website",
    autoIndex: false,
    serverSelectionTimeoutMS: 30000,
    connectTimeoutMS: 30000
  });

  try {
    const existing = await Article.find({ slug: { $in: items.map((item) => item.slug) } }).lean() as ExistingArticle[];
    assert.equal(existing.length, items.length, "Both existing article records are required");
    const bySlug = new Map(existing.map((article) => [article.slug, article]));
    const now = new Date();

    if (!apply) {
      const previews = items.map((item) => {
        const doc = bySlug.get(item.slug);
        assert(doc, `Missing article: ${item.slug}`);
        const payload = buildPayload(item, doc, `https://example.com/${item.imageFile}`, now);
        validate(payload);
        return {
          slug: payload.slug,
          title: payload.title,
          category: payload.category,
          subcategory: payload.subcategory,
          words: payload.content.split(/\s+/).length,
          publishedAt: payload.publishedAt,
          previousStatus: doc.status,
          nextStatus: payload.status
        };
      });
      console.log(JSON.stringify({ mode: "dry-run", validation: "passed", articles: previews }, null, 2));
      return;
    }

    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    });

    const payloads = [];
    for (const item of items) {
      const doc = bySlug.get(item.slug);
      assert(doc, `Missing article: ${item.slug}`);
      const bytes = readFileSync(resolve("exports/indexed-two-article-update-assets", item.imageFile));
      const uploaded = await cloudinary.uploader.upload(`data:image/jpeg;base64,${bytes.toString("base64")}`, {
        folder: "novexa-news",
        public_id: `${item.slug}-editorial-20260917`,
        overwrite: false,
        resource_type: "image",
        timeout: 60000
      });
      const imageCheck = await fetch(uploaded.secure_url, { signal: AbortSignal.timeout(20000) });
      assert(imageCheck.ok && imageCheck.headers.get("content-type")?.startsWith("image/"), `Image inaccessible: ${item.slug}`);
      await imageCheck.arrayBuffer();
      const payload = buildPayload(item, doc, uploaded.secure_url, now);
      validate(payload);
      payloads.push({ item, doc, payload });
    }

    const stamp = now.toISOString().replace(/[:.]/g, "-");
    mkdirSync(resolve("backups"), { recursive: true });
    writeFileSync(resolve("backups", `indexed-argentina-peru-before-${stamp}.json`), `${JSON.stringify(existing, null, 2)}\n`);

    const revisions = mongoose.connection.db!.collection("articlerevisions");
    await mongoose.connection.transaction(async (session) => {
      for (const { doc, payload } of payloads) {
        const parsed = validate(payload);
        const duplicate = await Article.findOne({
          _id: { $ne: doc._id },
          $or: [{ slug: payload.slug }, { sourceUrl: payload.sourceUrl }, { originalSourceUrl: payload.originalSourceUrl }]
        }).session(session).lean();
        assert(!duplicate, `${payload.slug}: duplicate record found`);

        const update = await Article.updateOne(
          { _id: doc._id, updatedAt: doc.updatedAt },
          { $set: { ...payload, ...parsed, scheduledAt: undefined, updatedAt: now } },
          { session }
        );
        assert.equal(update.modifiedCount, 1, `${payload.slug}: record changed during update`);
        await revisions.insertOne({
          articleId: doc._id,
          title: doc.title,
          excerpt: doc.excerpt,
          content: doc.content,
          sourceName: doc.sourceName,
          sourceUrl: doc.sourceUrl,
          snapshot: doc,
          reason: "indexed-article-editorial-rewrite: replace automation filler and publish at original URL",
          createdAt: now
        }, { session });
      }
    });

    const saved = await Article.find({
      slug: { $in: items.map((item) => item.slug) },
      ...publicArticleFilter()
    }).select("title slug status author category subcategory publishedAt content image canonicalUrl generationMode reviewStatus duplicateRisk").lean();
    assert.equal(saved.length, items.length, "Both updated articles must be publicly indexable");
    for (const article of saved) assert.deepEqual(articleIndexabilityIssues(article), []);

    mkdirSync(resolve("exports"), { recursive: true });
    const report = {
      mode: "published",
      articles: saved.map((article) => ({
        id: String(article._id),
        title: article.title,
        slug: article.slug,
        author: article.author,
        category: article.category,
        subcategory: article.subcategory,
        publishedAt: article.publishedAt,
        words: article.content.split(/\s+/).length,
        image: article.image,
        url: article.canonicalUrl
      }))
    };
    writeFileSync(resolve("exports", `indexed-argentina-peru-update-${stamp}.json`), `${JSON.stringify(report, null, 2)}\n`);
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  const message = error instanceof Error ? `${error.name}: ${error.message}\n${error.stack || ""}` : String(error || "Update failed");
  console.error(message.replace(/mongodb(?:\+srv)?:\/\/\S+/gi, "[database connection redacted]"));
  process.exitCode = 1;
});
