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

const slug = "several-killed-as-ukraine-russia-trade-attacks-deep-behind-the-front-line";
const id = new mongoose.Types.ObjectId("6a61fff0d8209565caaaeaa5");
const originalDate = new Date("2026-07-23T11:36:31.000Z");
const sourceImage = "https://static.themoscowtimes.com/image/article_1360/18/photo_2026-07-23102457.jpeg";
const originalSourceUrl = "https://www.aljazeera.com/news/2026/7/23/several-killed-as-ukraine-russia-trade-attacks-deep-behind-the-front-line";

function buildPayload(image: string, now: Date) {
  const lines = readFileSync(resolve("docs/articles", `${slug}.md`), "utf8").trim().split(/\r?\n/);
  assert(lines[0].startsWith("# "));
  assert.equal(lines[2], "By Novexa News Desk");
  return normalizeArticlePayload({
    title: lines[0].slice(2), slug, content: lines.slice(4).join("\n").trim(),
    author: "Novexa News Desk",
    category: "World", subcategory: "Russia-Ukraine War",
    excerpt: "Officials reported at least eight deaths in attacks across Ukraine, Russia and occupied Crimea on July 22-23, with 19 people injured in the Pavlohrad strike.",
    metaTitle: "Eight Reported Killed in Russia-Ukraine Attacks on July 22-23",
    metaDescription: "Officials reported eight deaths across Ukraine, Russia and occupied Crimea in July 22-23 attacks. Pavlohrad's injury count later rose to 19, authorities said.",
    image, ogImage: image,
    imageAlt: "Smoke rising beyond a highway in an image reported to show Ulyanovsk following a drone attack on July 23, 2026",
    imageCredit: "@exilenova_plus / Telegram, via The Moscow Times. Reported to show Ulyanovsk on July 23, 2026.",
    imageCreditUrl: "https://www.themoscowtimes.com/2026/07/23/3-killed-as-wave-of-ukrainian-drones-strikes-southern-russia-and-crimea-a93316",
    originalSourceName: "Al Jazeera", originalSourceUrl,
    references: [
      { name: "Ukrainska Pravda: Pavlohrad strike kills three, injures 19", url: "https://www.pravda.com.ua/eng/news/2026/07/23/8045495/" },
      { name: "Dancor: Fatal mortar attack in Seredyna-Buda on July 22", url: "https://dancor.sumy.ua/news/newsline/586399" },
      { name: "The Moscow Times: Voronezh and Crimea casualty updates", url: "https://www.themoscowtimes.com/2026/07/23/3-killed-as-wave-of-ukrainian-drones-strikes-southern-russia-and-crimea-a93316" },
      { name: "Deutsche Welle: Russian authorities report overnight casualties", url: "https://amp.dw.com/es/tres-muertos-y-al-menos-ocho-heridos-en-rusia-tras-ataques-nocturnos-de-drones-ucranianos/a-78079479" },
      { name: "Al Jazeera: Original July 23 report", url: originalSourceUrl }
    ],
    tags: ["Russia", "Ukraine", "Crimea", "Pavlohrad", "Civilian Casualties"],
    status: "published" as const, reviewStatus: "approved" as const, generationMode: "manual" as const,
    publishedAt: originalDate, contentUpdatedAt: now, lastUpdatedAt: now, updatedAt: now,
    duplicateRisk: 0, rejectionReasons: [], rebuildFailureReason: ""
  });
}

function validate(payload: ReturnType<typeof buildPayload>) {
  articleSchema.parse(payload);
  const readiness = validatePublishReadiness(payload);
  assert(readiness.approved, readiness.reasons.join("; "));
  assert.deepEqual(articleIndexabilityIssues(payload), []);
  const structured = JSON.parse(payload.schemaMarkup);
  assert.equal(structured.author.name, "Novexa News Desk");
  assert.equal(structured.author["@type"], "Organization");
  assert.equal(structured.datePublished, originalDate.toISOString());
  assert.equal(structured.dateModified, payload.contentUpdatedAt.toISOString());
  assert.equal(structured.articleSection, "World");
  assert(payload.content.startsWith("July 23, 2026:"));
  assert(!/\*\*|^---$|^\|/m.test(payload.content), "Unsupported article formatting");
  assert(!/indexed page|for search visitors|Crime update|publishing pipeline/i.test(payload.content));
}

async function main() {
  const preview = buildPayload(sourceImage, new Date());
  validate(preview);
  if (!process.argv.includes("--apply")) {
    console.log(JSON.stringify({ mode: "dry-run", validation: "passed", title: preview.title, author: preview.author, category: preview.category, words: preview.content.split(/\s+/).length, url: preview.canonicalUrl, publishedAt: originalDate, contentUpdatedAt: preview.contentUpdatedAt }, null, 2));
    return;
  }

  assert(process.env.MONGODB_URI, "MONGODB_URI is missing");
  assert(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET, "Cloudinary configuration is missing");
  await mongoose.connect(process.env.MONGODB_URI, { dbName: "news_website", autoIndex: false, serverSelectionTimeoutMS: 30000, connectTimeoutMS: 30000 });
  try {
    const collection = mongoose.connection.db.collection("articles");
    const revisions = mongoose.connection.db.collection("articlerevisions");
    const before = await collection.findOne({ _id: id, slug });
    assert(before, "The requested article record was not found");
    assert.equal(before.status, "draft", "Article is no longer a draft; stopped to protect newer editorial work");
    assert.equal(before.author, preview.author, "Byline changed; no replacement made");
    assert.equal(new Date(before.publishedAt).toISOString(), originalDate.toISOString());
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    mkdirSync(resolve("backups"), { recursive: true });
    const backupPath = resolve("backups", `ukraine-russia-article-${stamp}.json`);
    writeFileSync(backupPath, `${JSON.stringify(before, null, 2)}\n`);

    cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET });
    const bytes = readFileSync(resolve("exports/ukraine-russia-article-assets/ulyanovsk-july-23-original.jpeg"));
    const uploaded = await cloudinary.uploader.upload(`data:image/jpeg;base64,${bytes.toString("base64")}`, { folder: "novexa-news", public_id: `${slug}-july-2026`, overwrite: false, resource_type: "image", timeout: 60000 });
    const imageResponse = await fetch(uploaded.secure_url, { signal: AbortSignal.timeout(20000) });
    assert(imageResponse.ok && imageResponse.headers.get("content-type")?.startsWith("image/"), "Lead image is inaccessible");
    await imageResponse.arrayBuffer();
    const now = new Date();
    const payload = buildPayload(uploaded.secure_url, now);
    validate(payload);
    console.log(JSON.stringify({ stage: "validated", slug, backupPath }));

    // Match the read version and save its revision in the same transaction as publication.
    await mongoose.connection.transaction(async (session) => {
      const updated = await collection.updateOne({
        _id: id, slug, status: before.status, updatedAt: before.updatedAt, content: before.content, author: before.author, publishedAt: before.publishedAt
      }, { $set: payload, $unset: { seoQuarantinedAt: "", scheduledAt: "" } }, { session });
      assert.equal(updated.modifiedCount, 1, "Article changed during preparation; no replacement saved");
      await revisions.insertOne({
        articleId: id, title: before.title, excerpt: before.excerpt, content: before.content,
        metaTitle: before.metaTitle, metaDescription: before.metaDescription, sourceName: before.sourceName, sourceUrl: before.sourceUrl,
        snapshot: before, reason: "User-requested sourced rewrite and publication at the original URL and publication date",
        revisedAt: now, createdAt: now, updatedAt: now
      }, { session });
      const saved = await collection.findOne({ _id: id, ...publicArticleFilter() }, { session });
      assert(saved, "Updated article does not pass the public listing filter");
      assert.deepEqual(articleIndexabilityIssues(saved), []);
      for (const key of ["slug", "author", "views", "featured", "trending", "breakingNews", "allowComments", "sourceUrl"]) {
        assert.deepEqual(saved[key], before[key], `${key} must be preserved`);
      }
      assert.deepEqual(saved.createdAt, before.createdAt);
      assert.deepEqual(saved.publishedAt, before.publishedAt);
    });

    const saved = await collection.findOne({ _id: id, ...publicArticleFilter() });
    assert(saved, "Article is not publicly available after commit");
    const report = { mode: "published", id: String(saved._id), url: payload.canonicalUrl, title: saved.title, author: saved.author, category: saved.category, words: payload.content.split(/\s+/).length, image: saved.image, publishedAt: saved.publishedAt, contentUpdatedAt: saved.contentUpdatedAt, backupPath };
    mkdirSync(resolve("exports"), { recursive: true });
    writeFileSync(resolve("exports", `ukraine-russia-publication-${stamp}.json`), `${JSON.stringify(report, null, 2)}\n`);
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  const message = error && typeof error === "object" && "message" in error ? String(error.message) : "Article publication failed";
  console.error(message.replace(/mongodb(?:\+srv)?:\/\/\S+/gi, "[database connection redacted]"));
  process.exitCode = 1;
});
