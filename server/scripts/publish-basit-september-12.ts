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

const author = "Abdul Basit";
const iphoneSlug = "apple-iphone-duo-foldable-launch";
const articles = [
  {
    slug: "pakistan-petrol-diesel-september-12",
    category: "Pakistan",
    subcategory: "Economy",
    excerpt: "Petrol has risen to Rs375.82 and high-speed diesel to Rs403.32 per litre in Pakistan after a fifth successive increase, with the new rates applying from September 12 to 14.",
    metaTitle: "Pakistan Petrol, Diesel Prices Rise for September 12-14",
    metaDescription: "Pakistan raises petrol to Rs375.82 and diesel to Rs403.32 per litre for September 12-14, extending five successive increases and pressure on household budgets.",
    sourceName: "Aaj English",
    sourceUrl: "https://english.aaj.tv/news/330471941/petrol-diesel-prices-rise-for-fifth-straight-day",
    sourceImage: "https://i.aaj.tv/large/2026/09/112303097a9fa83.webp",
    imageFile: "fuel.webp",
    imageAlt: "A fuel-pump nozzle filling a car at a petrol station; representational file photograph",
    imageCredit: "Aaj English / representational file photograph",
    imageCreditUrl: "https://english.aaj.tv/news/330471941/petrol-diesel-prices-rise-for-fifth-straight-day",
    references: [
      { name: "Aaj English: Petrol and diesel prices rise for fifth straight day", url: "https://english.aaj.tv/news/330471941/petrol-diesel-prices-rise-for-fifth-straight-day" },
      { name: "Radio Pakistan: Petroleum Division rates for September 11", url: "https://radio.gov.pk/10-09-2026/govt-revises-prices-of-petroleum-products-for-friday" }
    ],
    tags: ["Petrol Prices", "Diesel Prices", "Pakistan", "OGRA", "September 2026"]
  },
  {
    slug: "razaullah-test-debut-81-runs",
    category: "Sports",
    subcategory: "Cricket",
    excerpt: "Razaullah followed four wickets on Test debut with 81 off 63 balls and nine sixes, helping Pakistan set England a target of 130 at Edgbaston after a spirited recovery.",
    metaTitle: "Razaullah Hits 81 With Nine Sixes on Remarkable Test Debut",
    metaDescription: "Razaullah hits 81 off 63 balls with nine sixes after taking four wickets on Test debut, helping Pakistan recover to set England 130 to win at Edgbaston.",
    sourceName: "Sky Sports",
    sourceUrl: "https://www.skysports.com/cricket/news/12123/13584462/england-vs-pakistan-razaullah-21-hits-remarkable-81-off-63-balls-featuring-nine-sixes-to-force-final-test-into-fourth-day",
    sourceImage: "https://e0.365dm.com/26/09/1600x900/skysports-razaullah-pakistan_7348395.jpg?20260911192043",
    imageFile: "razaullah.jpg",
    imageAlt: "Razaullah smiles alongside Mohammad Abbas during Pakistan's third Test against England at Edgbaston",
    imageCredit: "Sky Sports / photograph accompanying its Edgbaston day-three report",
    imageCreditUrl: "https://www.skysports.com/cricket/news/12123/13584462/england-vs-pakistan-razaullah-21-hits-remarkable-81-off-63-balls-featuring-nine-sixes-to-force-final-test-into-fourth-day",
    references: [
      { name: "Sky Sports: Razaullah scores 81 from 63 balls on day three", url: "https://www.skysports.com/cricket/news/12123/13584462/england-vs-pakistan-razaullah-21-hits-remarkable-81-off-63-balls-featuring-nine-sixes-to-force-final-test-into-fourth-day" },
      { name: "PCB: Debutant Razaullah strikes twice on opening day", url: "https://www.pcb.com.pk/news-detail/debutant-razaullah-strikes-twice-as-england-take-opening-day-lead.html" },
      { name: "PCB: Razaullah takes four wickets on second day", url: "https://www.pcb.com.pk/news-detail/razaullah-takes-four-wickets-on-debut-on-rain-hit-second-day-at-edgbaston.html" },
      { name: "ICC: Young Pakistan pacer earns praise", url: "https://www.icc-cricket.com/news/young-pakistan-pacer-earns-praise-following-eye-catching-spell" }
    ],
    tags: ["Razaullah", "Pakistan Cricket", "England", "Test Cricket", "Edgbaston"]
  }
];

function buildPayload(item: typeof articles[number], image = item.sourceImage) {
  const lines = readFileSync(resolve("docs/articles", `${item.slug}.md`), "utf8").trim().split(/\r?\n/);
  assert(lines[0].startsWith("# "));
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
  assert(structured.author.url.endsWith("/author/abdul-basit"));
  assert(!/\*\*|^---$|^\|/m.test(payload.content), "Unsupported article formatting");
  assert.notEqual(payload.slug, iphoneSlug);
  if (payload.slug.startsWith("razaullah")) assert(!/\b83\b|century-adjacent|second-most expensive/i.test(payload.content));
  return parsed;
}

async function assertNoDuplicates(payloads: ReturnType<typeof buildPayload>[], session?: mongoose.ClientSession) {
  const found = await Article.find({ $or: payloads.flatMap((item) => [
    { slug: item.slug }, { title: item.title }, { sourceUrl: item.sourceUrl }, { originalSourceUrl: item.sourceUrl }
  ]) }).select("slug author status").session(session || null).lean();
  assert.equal(found.length, 0, `Existing articles found; no publication: ${JSON.stringify(found)}`);
}

async function main() {
  assert.equal(articles.length, 2);
  assert.equal(new Set(articles.map((item) => item.slug)).size, 2);
  const previews = articles.map((item) => buildPayload(item));
  previews.forEach(validate);
  if (!process.argv.includes("--apply")) {
    console.log(JSON.stringify({ mode: "dry-run", validation: "passed", iphone: "unchanged", articles: previews.map((item) => ({ title: item.title, author: item.author, words: item.content.split(/\s+/).length, url: item.canonicalUrl })) }, null, 2));
    return;
  }

  assert(process.env.MONGODB_URI, "MONGODB_URI is missing");
  assert(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET, "Cloudinary configuration is missing");
  await mongoose.connect(process.env.MONGODB_URI, { dbName: "news_website", autoIndex: false, serverSelectionTimeoutMS: 30000, connectTimeoutMS: 30000 });
  try {
    await assertNoDuplicates(previews);
    const iphoneFields = "title content author slug publishedAt updatedAt image canonicalUrl";
    const iphoneBefore = await Article.findOne({ slug: iphoneSlug }).select(iphoneFields).lean();
    assert(iphoneBefore && !Array.isArray(iphoneBefore), "Existing iPhone article not found");
    cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET });
    const payloads: ReturnType<typeof buildPayload>[] = [];
    for (const item of articles) {
      const bytes = readFileSync(resolve("exports/basit-september-12-assets", item.imageFile));
      const mimeType = item.imageFile.endsWith(".webp") ? "image/webp" : "image/jpeg";
      const uploaded = await cloudinary.uploader.upload(`data:${mimeType};base64,${bytes.toString("base64")}`, { folder: "novexa-news", public_id: item.slug, overwrite: false, resource_type: "image", timeout: 60000 });
      const response = await fetch(uploaded.secure_url, { signal: AbortSignal.timeout(20000) });
      assert(response.ok && response.headers.get("content-type")?.startsWith("image/"), `Image inaccessible: ${item.slug}`);
      await response.arrayBuffer();
      const payload = buildPayload(item, uploaded.secure_url);
      validate(payload);
      payloads.push(payload);
      console.log(JSON.stringify({ stage: "image-verified", slug: item.slug }));
    }

    // Keep both new articles atomic and exclude the existing iPhone article from all writes.
    await mongoose.connection.transaction(async (session) => {
      await assertNoDuplicates(payloads, session);
      for (const payload of payloads) {
        const [article] = await Article.create([{ ...payload, ...validate(payload), scheduledAt: undefined }], { session });
        const saved = await Article.findOne({ _id: article._id, ...publicArticleFilter() }).session(session).lean();
        assert(saved, `Article failed public listing check: ${payload.slug}`);
        assert.deepEqual(articleIndexabilityIssues(saved), []);
      }
    });
    const saved = await Article.find({ slug: { $in: payloads.map((item) => item.slug) }, ...publicArticleFilter() }).lean();
    assert.equal(saved.length, 2);
    const iphoneAfter = await Article.findOne({ slug: iphoneSlug }).select(iphoneFields).lean();
    assert.deepEqual(iphoneAfter, iphoneBefore, "The existing iPhone article changed during publication");
    const report = {
      mode: "published", iphone: { decision: "unchanged", url: (iphoneBefore as any).canonicalUrl, reason: "Existing version is clearer, sourced and free of the new draft's garbled passages." },
      articles: saved.map((item) => ({ id: String(item._id), title: item.title, author: item.author, url: item.canonicalUrl, image: item.image, publishedAt: item.publishedAt }))
    };
    mkdirSync(resolve("exports"), { recursive: true });
    writeFileSync(resolve("exports", `basit-publication-${new Date().toISOString().replace(/[:.]/g, "-")}.json`), `${JSON.stringify(report, null, 2)}\n`);
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  const message = error && typeof error === "object" && "message" in error ? String(error.message) : "Publication failed";
  console.error(message.replace(/mongodb(?:\+srv)?:\/\/\S+/gi, "[database connection redacted]"));
  process.exitCode = 1;
});
