import "dotenv/config";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import mongoose from "mongoose";
import { v2 as cloudinary } from "cloudinary";
import { normalizeArticlePayload } from "../../src/lib/content-automation";
import { validatePublishReadiness } from "../../src/lib/article-quality";
import { articleIndexabilityIssues, publicArticleFilter } from "../../src/lib/public-articles";
import { articleSchema } from "../../src/lib/validators";
import { Article } from "../../src/models/Article";

const slug = "apple-iphone-duo-foldable-launch";
const sourceUrl = "https://techcrunch.com/2026/09/09/apple-unveils-its-first-foldable-the-iphone-duo/";
const sourceImage = "https://techcrunch.com/wp-content/uploads/2026/09/Screenshot-2026-09-09-at-11.25.52-PM.jpg";

function buildPayload(image: string) {
  const lines = readFileSync(resolve("docs/articles", `${slug}.md`), "utf8").trim().split(/\r?\n/);
  assert(lines[0].startsWith("# "), "Article must begin with its headline");
  assert.equal(lines[2], "By Abdul Basit");
  const publishedAt = new Date();
  return normalizeArticlePayload({
    title: lines[0].slice(2),
    slug,
    content: lines.slice(4).join("\n").trim(),
    author: "Abdul Basit",
    category: "Technology",
    subcategory: "Mobile",
    excerpt: "Apple has unveiled the iPhone Duo, its first folding iPhone, with a 7.6-inch inner display, Touch ID and iOS 27 multitasking built around the larger screen.",
    metaTitle: "Apple Unveils iPhone Duo, Its First Folding iPhone",
    metaDescription: "Apple unveils the iPhone Duo with a 7.6-inch folding display, Touch ID and iOS 27 multitasking, marking its first entry into foldable phones.",
    image,
    ogImage: image,
    imageAlt: "Apple iPhone Duo folding phone shown during the September 9 launch presentation",
    imageCredit: "Apple / event screenshot via TechCrunch",
    imageCreditUrl: sourceUrl,
    sourceName: "TechCrunch",
    sourceUrl,
    originalSourceName: "TechCrunch",
    originalSourceUrl: sourceUrl,
    references: [
      { name: "TechCrunch: Apple unveils its first foldable, the iPhone Duo", url: sourceUrl },
      { name: "MacRumors: iPhone Duo reportedly starts with 256GB of storage", url: "https://www.macrumors.com/2026/09/09/iphone-duo-starts-256gb-of-storage/" }
    ],
    tags: ["Apple", "iPhone Duo", "Foldable Phones", "iOS 27", "John Ternus"],
    generationMode: "manual" as const,
    status: "published" as const,
    reviewStatus: "approved" as const,
    publishedAt,
    lastUpdatedAt: publishedAt,
    duplicateRisk: 0,
    rejectionReasons: [],
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
  const structured = JSON.parse(payload.schemaMarkup);
  assert.equal(structured.author.name, "Abdul Basit");
  assert.equal(structured.author["@type"], "Person");
  assert(structured.author.url.endsWith("/author/abdul-basit"));
  assert(!/\*\*|^---$/m.test(payload.content), "Body contains unsupported formatting");
  return parsed;
}

async function main() {
  const preview = buildPayload(sourceImage);
  validate(preview);
  if (!process.argv.includes("--apply")) {
    console.log(JSON.stringify({ mode: "dry-run", title: preview.title, author: preview.author, category: preview.category, words: preview.content.split(/\s+/).length, readingTime: preview.readingTime, canonical: preview.canonicalUrl, validation: "passed" }, null, 2));
    return;
  }

  assert(process.env.MONGODB_URI, "MONGODB_URI is missing");
  assert(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET, "Cloudinary configuration is missing");
  await mongoose.connect(process.env.MONGODB_URI, { dbName: "news_website", autoIndex: false, serverSelectionTimeoutMS: 30000, connectTimeoutMS: 30000 });
  try {
    const existing = await Article.findOne({ $or: [{ slug }, { sourceUrl }, { originalSourceUrl: sourceUrl }, { title: preview.title }] }).select("slug author status").lean();
    assert(!existing, `Article already exists; no changes made: ${JSON.stringify(existing)}`);

    cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET });
    const uploaded = await cloudinary.uploader.upload(sourceImage, { folder: "novexa-news", public_id: slug, overwrite: false, resource_type: "image", timeout: 60000 });
    const imageResponse = await fetch(uploaded.secure_url, { signal: AbortSignal.timeout(20000) });
    assert(imageResponse.ok && imageResponse.headers.get("content-type")?.startsWith("image/"), "Lead image is not accessible");
    await imageResponse.arrayBuffer();

    const payload = buildPayload(uploaded.secure_url);
    const parsed = validate(payload);
    const article = await Article.create({ ...payload, ...parsed, scheduledAt: undefined });
    const saved = await Article.findOne({ _id: article._id, ...publicArticleFilter() }).lean();
    assert(saved, "Published article did not pass the public listing filter");
    assert.deepEqual(articleIndexabilityIssues(saved), []);
    console.log(JSON.stringify({ mode: "published", id: String(article._id), title: article.title, author: article.author, category: article.category, url: payload.canonicalUrl, image: article.image, publishedAt: article.publishedAt }, null, 2));
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Article publication failed");
  process.exitCode = 1;
});
