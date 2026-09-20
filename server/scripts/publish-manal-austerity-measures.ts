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

const slug = "pakistan-orders-fuel-spending-cuts-austerity-measures";
const author = "Syeda Manal Tirmizi";
const sourceUrl = "https://cabinet.gov.pk/NewsDetail/MjYxMjY3ZDgtZTkzMC00ODdiLWI3ZWUtYzg4Y2JkNzgyZDVi";
const sourceImage = "https://www.app.com.pk/wp-content/uploads/2026/09/Screenshot-2026-09-17-203127.png?x94902=";

function buildPayload(image = sourceImage) {
  const lines = readFileSync(resolve("docs/articles", `${slug}.md`), "utf8").trim().split(/\r?\n/);
  assert(lines[0].startsWith("# "), "Missing headline");
  assert.equal(lines[2], `By ${author}`);
  const publishedAt = new Date();

  return normalizeArticlePayload({
    title: lines[0].slice(2),
    slug,
    content: lines.slice(4).join("\n").trim(),
    author,
    category: "Pakistan",
    subcategory: "Government Policy",
    excerpt: "Pakistan orders a 50% cut in official-vehicle fuel, a 5% reduction in non-employee spending, and new travel and procurement restrictions.",
    metaTitle: "Pakistan Orders Fuel and Spending Cuts",
    metaDescription: "Pakistan orders a 50% official-fuel cut, a 5% reduction in non-employee spending, and restrictions on travel, procurement and operating hours.",
    image,
    ogImage: image,
    imageAlt: "Prime Minister Shehbaz Sharif chairs a meeting with federal ministers and senior officials in Islamabad",
    imageCredit: "Prime Minister's Office via Associated Press of Pakistan",
    imageCreditUrl: "https://www.app.com.pk/national/pm-approves-austerity-drive-as-global-petroleum-prices-surge/",
    sourceName: "Cabinet Division, Government of Pakistan",
    sourceUrl,
    originalSourceName: "Cabinet Division, Government of Pakistan",
    originalSourceUrl: sourceUrl,
    references: [
      { name: "Cabinet Division: Austerity and Fuel Conservation Measures", url: sourceUrl },
      { name: "APP: Federal government imposes fresh austerity measures", url: "https://www.app.com.pk/national/federal-govt-imposes-fresh-austerity-measures-cuts-official-fuel-by-50pc/" },
      { name: "APP: Prime minister approves austerity drive", url: "https://www.app.com.pk/national/pm-approves-austerity-drive-as-global-petroleum-prices-surge/" },
      { name: "Novexa: Pakistan reviews fuel-saving measures", url: "https://www.novexa.news/news/pakistan-reviews-fuel-saving-measures-petroleum-prices" }
    ],
    tags: ["Pakistan", "Austerity Measures", "Fuel Conservation", "Shehbaz Sharif", "Government Spending"],
    generationMode: "manual" as const,
    status: "published" as const,
    reviewStatus: "approved" as const,
    publishedAt,
    contentUpdatedAt: publishedAt,
    lastUpdatedAt: publishedAt,
    duplicateRisk: 0,
    rejectionReasons: [],
    qualityScore: 96,
    originalityScore: 96,
    factualConfidence: 96,
    featured: false,
    trending: false,
    breakingNews: false,
    allowComments: true,
    gallery: [],
    views: 0
  });
}

function validate(payload: ReturnType<typeof buildPayload>) {
  const parsed = articleSchema.parse(payload);
  const readiness = validatePublishReadiness(payload);
  assert(readiness.approved, readiness.reasons.join("; "));
  assert.deepEqual(articleIndexabilityIssues(payload), []);
  assert(payload.content.split(/\s+/).length >= 600, "Article is shorter than 600 words");
  assert(!/\*\*|^---$|^\|/m.test(payload.content), "Unsupported article formatting");
  assert(payload.content.includes("50 per cent reduction") && payload.content.includes("five per cent reduction"));
  const structured = JSON.parse(payload.schemaMarkup);
  assert.equal(structured.author.name, author);
  assert.equal(structured.author["@type"], "Person");
  assert(structured.author.url.endsWith("/author/syeda-manal-tirmizi"));
  assert.equal(structured.articleSection, "Pakistan");
  return parsed;
}

async function assertNoDuplicate(payload: ReturnType<typeof buildPayload>, session?: mongoose.ClientSession) {
  const matches = await Article.find({
    $or: [
      { slug: payload.slug },
      { title: payload.title },
      { sourceUrl },
      { originalSourceUrl: sourceUrl },
      { content: /five per cent reduction in the Non-Employee Related Expenses budget[\s\S]{0,1000}foreign visits/i }
    ]
  }).select("slug title author status sourceUrl").session(session || null).lean();
  assert.equal(matches.length, 0, `Existing articles found: ${JSON.stringify(matches)}`);
}

async function main() {
  const preview = buildPayload();
  validate(preview);

  if (!process.argv.includes("--apply")) {
    console.log(JSON.stringify({
      mode: "dry-run",
      validation: "passed",
      title: preview.title,
      author: preview.author,
      category: preview.category,
      subcategory: preview.subcategory,
      words: preview.content.split(/\s+/).length,
      url: preview.canonicalUrl
    }, null, 2));
    return;
  }

  assert(process.env.MONGODB_URI, "MONGODB_URI is missing");
  assert(
    process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET,
    "Cloudinary configuration is missing"
  );

  await mongoose.connect(process.env.MONGODB_URI, {
    dbName: "news_website",
    autoIndex: false,
    serverSelectionTimeoutMS: 30000,
    connectTimeoutMS: 30000
  });

  try {
    await assertNoDuplicate(preview);
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    });

    const publicId = `novexa-news/${slug}`;
    let uploaded: { secure_url: string };
    try {
      uploaded = await cloudinary.api.resource(publicId, { resource_type: "image" });
      console.log(JSON.stringify({ stage: "reusing-image", slug }));
    } catch {
      const bytes = readFileSync(resolve("exports/manal-austerity-assets/pm-meeting.png"));
      uploaded = await cloudinary.uploader.upload(`data:image/png;base64,${bytes.toString("base64")}`, {
        folder: "novexa-news",
        public_id: slug,
        overwrite: false,
        resource_type: "image",
        timeout: 60000
      });
      console.log(JSON.stringify({ stage: "uploaded-image", slug }));
    }

    const imageResponse = await fetch(uploaded.secure_url, { signal: AbortSignal.timeout(20000) });
    assert(imageResponse.ok && imageResponse.headers.get("content-type")?.startsWith("image/"), "Lead image is inaccessible");
    await imageResponse.arrayBuffer();

    const payload = buildPayload(uploaded.secure_url);
    const parsed = validate(payload);
    await mongoose.connection.transaction(async (session) => {
      await assertNoDuplicate(payload, session);
      const [created] = await Article.create([{ ...payload, ...parsed, scheduledAt: undefined }], { session });
      const saved = await Article.findOne({ _id: created._id, ...publicArticleFilter() }).session(session).lean();
      assert(saved, "Article does not pass the public listing filter");
      assert.deepEqual(articleIndexabilityIssues(saved), []);
    });

    const fetched = await Article.findOne({ slug, ...publicArticleFilter() }).lean();
    assert(fetched, "Article is not publicly available after commit");
    const report = {
      mode: "published",
      id: String(fetched._id),
      title: fetched.title,
      author: fetched.author,
      category: fetched.category,
      subcategory: fetched.subcategory,
      url: fetched.canonicalUrl,
      image: fetched.image,
      publishedAt: fetched.publishedAt
    };
    mkdirSync(resolve("exports"), { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    writeFileSync(resolve("exports", `manal-austerity-publication-${stamp}.json`), `${JSON.stringify(report, null, 2)}\n`);
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
