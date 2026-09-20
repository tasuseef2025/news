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

const author = "Syeda Manal Tirmizi";
const existingFloodSlug = "ndma-flood-alert-heavy-rains-pakistan";
const articles = [
  {
    slug: "pakistan-petrol-diesel-prices-september-16-2026",
    category: "Economy",
    subcategory: "Energy",
    excerpt: "Pakistan raises petrol to Rs384.34 and high-speed diesel to Rs415.83 per litre for September 16 as its targeted fuel-relief programme begins.",
    metaTitle: "Pakistan Petrol and Diesel Prices for September 16",
    metaDescription: "Pakistan raises petrol to Rs384.34 and diesel to Rs415.83 per litre for September 16 while a targeted Rs100-per-litre fuel relief scheme begins.",
    sourceName: "Business Recorder",
    sourceUrl: "https://www.brecorder.com/news/40439619/govt-raises-petrol-price-by-rs410-diesel-by-rs641",
    sourceImage: "https://i.brecorder.com/large/2026/09/152254039486948.webp",
    imageFile: "petroleum.webp",
    imageAlt: "Motorcyclists queue at a Shell petrol station in Pakistan in the photograph accompanying the September 15 fuel-price report",
    imageCredit: "Business Recorder / photograph accompanying its September 15, 2026 fuel-price report",
    imageCreditUrl: "https://www.brecorder.com/news/40439619/govt-raises-petrol-price-by-rs410-diesel-by-rs641",
    references: [
      { name: "Business Recorder: September 16 petrol and diesel price revision", url: "https://www.brecorder.com/news/40439619/govt-raises-petrol-price-by-rs410-diesel-by-rs641" },
      { name: "Press Information Department: ECC approves fuel-relief scheme", url: "https://pid.gov.pk/site/press_detail/33920" },
      { name: "Radio Pakistan: OGRA daily petroleum pricing mechanism", url: "https://radio.gov.pk/17-07-2026/ogra-to-determine-petroleum-prices-on-daily-basis" }
    ],
    tags: ["Petrol Prices", "Diesel Prices", "Pakistan Economy", "OGRA", "Fuel Relief"]
  },
  {
    slug: "trump-energy-truce-claim-ukraine-russia-no-confirmed-deal",
    category: "World",
    subcategory: "Russia-Ukraine War",
    excerpt: "Donald Trump says Russia and Ukraine agreed to halt attacks on energy infrastructure, but neither side confirmed a mutual deal and strikes continued.",
    metaTitle: "Trump Claims Russia-Ukraine Energy Truce; No Deal Confirmed",
    metaDescription: "Trump says Russia and Ukraine agreed to stop hitting energy sites, but Kyiv describes a conditional proposal, Moscow stops short of confirmation and strikes continue.",
    sourceName: "Associated Press",
    sourceUrl: "https://apnews.com/article/russia-ukraine-war-poland-nato-drones-dbba56f09562f337aa731f7d4bbd1235",
    sourceImage: "https://upload.wikimedia.org/wikipedia/commons/d/d7/P20260716DT-2186.jpg",
    imageFile: "trump.jpg",
    imageAlt: "President Donald Trump delivers an address in the White House East Room in July 2026; file photograph",
    imageCredit: "Daniel Torok / The White House, via Wikimedia Commons. Public domain. File photo, July 16, 2026.",
    imageCreditUrl: "https://commons.wikimedia.org/wiki/File:P20260716DT-2186.jpg",
    references: [
      { name: "Associated Press: Kyiv's conditional response to Trump's claim", url: "https://apnews.com/article/russia-ukraine-war-poland-nato-drones-dbba56f09562f337aa731f7d4bbd1235" },
      { name: "Associated Press: Strikes continued after Trump's announcement", url: "https://apnews.com/article/russia-ukraine-war-lithuania-drone-downed-nato-9671662649ebed2eca41879982f366ad" },
      { name: "S&P Global Energy: Energy-truce claim and diesel-market context", url: "https://www.spglobal.com/energy/en/news-research/latest-news/crude-oil/091426-russia-and-ukraine-agree-not-to-strike-each-others-energy-facilities-trump" },
      { name: "White House file photograph license and description", url: "https://commons.wikimedia.org/wiki/File:P20260716DT-2186.jpg" }
    ],
    tags: ["Donald Trump", "Ukraine", "Russia", "Energy Infrastructure", "Ceasefire"]
  }
];

function buildPayload(item: typeof articles[number], image = item.sourceImage) {
  const lines = readFileSync(resolve("docs/articles", `${item.slug}.md`), "utf8").trim().split(/\r?\n/);
  assert(lines[0].startsWith("# "), "Missing headline");
  assert.equal(lines[2], `By ${author}`);
  const { sourceImage: _sourceImage, imageFile: _imageFile, ...metadata } = item;
  const publishedAt = new Date();
  return normalizeArticlePayload({
    ...metadata,
    title: lines[0].slice(2), content: lines.slice(4).join("\n").trim(), author,
    image, ogImage: image, originalSourceName: item.sourceName, originalSourceUrl: item.sourceUrl,
    generationMode: "manual" as const, status: "published" as const, reviewStatus: "approved" as const,
    publishedAt, lastUpdatedAt: publishedAt, duplicateRisk: 0, rejectionReasons: [],
    featured: false, trending: false, breakingNews: false, allowComments: true, gallery: [], views: 0
  });
}

function validate(payload: ReturnType<typeof buildPayload>) {
  const parsed = articleSchema.parse(payload);
  const readiness = validatePublishReadiness(payload);
  assert(readiness.approved, `${payload.slug}: ${readiness.reasons.join("; ")}`);
  assert.deepEqual(articleIndexabilityIssues(payload), []);
  const structured = JSON.parse(payload.schemaMarkup);
  assert.equal(structured.author.name, author);
  assert.equal(structured.author["@type"], "Person");
  assert(structured.author.url.endsWith("/author/syeda-manal-tirmizi"));
  assert(!/\*\*|^---$|^\|/m.test(payload.content), "Unsupported article formatting");
  return parsed;
}

async function assertNoDuplicates(payloads: ReturnType<typeof buildPayload>[], session?: mongoose.ClientSession) {
  const matches = await Article.find({ $or: payloads.flatMap((item) => [
    { slug: item.slug }, { title: item.title }, { sourceUrl: item.sourceUrl }, { originalSourceUrl: item.sourceUrl }
  ]) }).select("slug author status sourceUrl").session(session || null).lean();
  assert.equal(matches.length, 0, `Existing articles found: ${JSON.stringify(matches)}`);
}

async function assertExistingFloodArticle(session?: mongoose.ClientSession) {
  const existing = await Article.findOne({ slug: existingFloodSlug, ...publicArticleFilter() })
    .select("slug title author category status content canonicalUrl generationMode reviewStatus duplicateRisk")
    .session(session || null).lean();
  assert(existing, "The existing NDMA flood alert is no longer publicly available");
  assert.equal(existing.author, author);
  assert.equal(existing.category, "Pakistan");
  assert(existing.content.includes("Upper Dir") && existing.content.includes("Zhob") && existing.content.includes("911"), "Existing flood alert is incomplete");
  assert.deepEqual(articleIndexabilityIssues(existing), []);
  return existing;
}

async function main() {
  assert.equal(articles.length, 2);
  const previews = articles.map((item) => buildPayload(item));
  previews.forEach(validate);
  if (!process.argv.includes("--apply")) {
    console.log(JSON.stringify({ mode: "dry-run", validation: "passed", newArticles: previews.map((item) => ({
      title: item.title, author: item.author, category: item.category, subcategory: item.subcategory,
      words: item.content.split(/\s+/).length, url: item.canonicalUrl
    })), existingArticleRetained: `https://www.novexa.news/news/${existingFloodSlug}` }, null, 2));
    return;
  }

  assert(process.env.MONGODB_URI, "MONGODB_URI is missing");
  assert(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET, "Cloudinary configuration is missing");
  await mongoose.connect(process.env.MONGODB_URI, { dbName: "news_website", autoIndex: false, serverSelectionTimeoutMS: 30000, connectTimeoutMS: 30000 });
  try {
    const existingFlood = await assertExistingFloodArticle();
    await assertNoDuplicates(previews);
    cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET });
    const payloads: ReturnType<typeof buildPayload>[] = [];
    for (const item of articles) {
      const publicId = `novexa-news/${item.slug}`;
      let uploaded: { secure_url: string };
      try {
        uploaded = await cloudinary.api.resource(publicId, { resource_type: "image" });
        console.log(JSON.stringify({ stage: "reusing-image", slug: item.slug }));
      } catch {
        console.log(JSON.stringify({ stage: "uploading-image", slug: item.slug }));
        const bytes = readFileSync(resolve("exports/manal-september-15-late-assets", item.imageFile));
        const mimeType = item.imageFile.endsWith(".webp") ? "image/webp" : "image/jpeg";
        uploaded = await cloudinary.uploader.upload(`data:${mimeType};base64,${bytes.toString("base64")}`, {
          folder: "novexa-news", public_id: item.slug, overwrite: false, resource_type: "image", timeout: 60000
        });
      }
      const response = await fetch(uploaded.secure_url, { signal: AbortSignal.timeout(20000) });
      assert(response.ok && response.headers.get("content-type")?.startsWith("image/"), `Image inaccessible: ${item.slug}`);
      await response.arrayBuffer();
      const payload = buildPayload(item, uploaded.secure_url);
      validate(payload);
      payloads.push(payload);
    }

    console.log(JSON.stringify({ stage: "starting-transaction" }));
    await mongoose.connection.transaction(async (session) => {
      await assertExistingFloodArticle(session);
      await assertNoDuplicates(payloads, session);
      for (const payload of payloads) {
        const parsed = validate(payload);
        const [article] = await Article.create([{ ...payload, ...parsed, scheduledAt: undefined }], { session });
        const saved = await Article.findOne({ _id: article._id, ...publicArticleFilter() }).session(session).lean();
        assert(saved, `Article is not publicly available: ${payload.slug}`);
        assert.deepEqual(articleIndexabilityIssues(saved), []);
      }
    });
    console.log(JSON.stringify({ stage: "transaction-committed" }));

    const saved = await Article.find({ slug: { $in: payloads.map((item) => item.slug) }, ...publicArticleFilter() }).lean();
    assert.equal(saved.length, 2, "Expected two new public articles after commit");
    const report = {
      mode: "published",
      newArticles: saved.map((article) => ({ id: String(article._id), title: article.title, author: article.author,
        category: article.category, subcategory: article.subcategory, url: article.canonicalUrl,
        image: article.image, publishedAt: article.publishedAt })),
      existingArticleRetained: { id: String(existingFlood._id), title: existingFlood.title, author: existingFlood.author,
        category: existingFlood.category, url: existingFlood.canonicalUrl }
    };
    mkdirSync(resolve("exports"), { recursive: true });
    writeFileSync(resolve("exports", `manal-september-15-late-publication-${new Date().toISOString().replace(/[:.]/g, "-")}.json`), `${JSON.stringify(report, null, 2)}\n`);
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  const message = error instanceof Error ? `${error.name}: ${error.message}\n${error.stack || ""}` : String(error || "Publication failed");
  console.error(message.replace(/mongodb(?:\+srv)?:\/\/\S+/gi, "[database connection redacted]"));
  process.exitCode = 1;
});
