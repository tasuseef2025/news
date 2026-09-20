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
const articles = [
  {
    slug: "houthis-claim-saudi-air-base-attack-iran-denies-role",
    category: "World",
    subcategory: "Middle East",
    excerpt: "Houthis claim a missile and drone attack on Saudi Arabia's King Khalid Air Base as Iran denies directing the group and regional talks are postponed.",
    metaTitle: "Houthis Claim Saudi Air Base Attack as Iran Denies Role",
    metaDescription: "Houthis claim an attack on King Khalid Air Base as Iran denies directing the group, Gulf talks are postponed and renewed fighting displaces Yemenis.",
    sourceName: "AFP via NovaNews",
    sourceUrl: "https://novanews.co.za/houthis-target-saudi-base-as-iran-denies-involvement-in-yemen-war/",
    sourceImage: "https://upload.wikimedia.org/wikipedia/commons/d/d9/USAF_F-15C's_from_the_44th_EFS_fly_in_formation_with_RSAF_F-15SA's.jpg",
    imageFile: "houthi.jpg",
    imageAlt: "US and Saudi F-15 aircraft fly in formation over Saudi Arabia in June 2020; file photo, not the reported September 2026 attack",
    imageCredit: "AFCENT Public Affairs / US Air Force, via Wikimedia Commons. Public domain. File photo, June 25, 2020; not the reported attack.",
    imageCreditUrl: "https://commons.wikimedia.org/wiki/File:USAF_F-15C%27s_from_the_44th_EFS_fly_in_formation_with_RSAF_F-15SA%27s.jpg",
    references: [
      { name: "AFP via NovaNews: Houthi attack claims and Iran's denial, September 14", url: "https://novanews.co.za/houthis-target-saudi-base-as-iran-denies-involvement-in-yemen-war/" },
      { name: "Reuters via GV Wire: Gulf talks postponed amid Yemen fighting", url: "https://gvwire.com/2026/09/14/gulf-states-call-off-meeting-with-iran-houthis-launch-new-attack-on-saudi/" },
      { name: "Gulf News: Iran denies involvement in Yemen developments", url: "https://gulfnews.com/world/mena/oman-postpones-gcc-iran-meeting-on-strait-of-hormuz-as-oil-prices-rise-on-supply-fears-1.500673518" }
    ],
    tags: ["Yemen", "Houthis", "Saudi Arabia", "Iran", "Red Sea"]
  },
  {
    slug: "mastung-operation-three-militants-killed-state-media",
    category: "Pakistan",
    subcategory: "Security",
    excerpt: "State media report three suspected militants killed in Mastung, including commander Naqeeb, as security operations continue across Balochistan.",
    metaTitle: "Three Militants Reported Killed in Mastung Operation",
    metaDescription: "State media report three suspected militants killed in Mastung, including commander Naqeeb, as Mohsin Naqvi praises personnel amid continuing operations.",
    sourceName: "Business Recorder / PTV News",
    sourceUrl: "https://www.brecorder.com/news/40439404/",
    sourceImage: "https://www.geo.tv/assets/uploads/updates/2026-09-14/681970_4868402_updates.jpg",
    imageFile: "mastung.jpg",
    imageAlt: "Security personnel patrol a street in Quetta in an AFP file photograph; not a photograph of the Mastung operation",
    imageCredit: "AFP / File, via Geo News. Security personnel in Quetta; not the Mastung operation.",
    imageCreditUrl: "https://www.geo.tv/latest/681970-militant-commander-among-three-killed-in-balochistans-mastung-security-sources",
    references: [
      { name: "Business Recorder: PTV News account and Mohsin Naqvi's statement", url: "https://www.brecorder.com/news/40439404/" },
      { name: "Geo News: Security sources report Mastung operation", url: "https://www.geo.tv/latest/681970-militant-commander-among-three-killed-in-balochistans-mastung-security-sources" },
      { name: "PICSS: August 2026 security assessment", url: "https://www.picss.net/latest-reports/militant-attacks-increase-but-human-impact-declines-in-august-amid-sustained-ct-pressure-picss/" }
    ],
    tags: ["Mastung", "Balochistan", "Security", "Counterterrorism", "Mohsin Naqvi"]
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
    title: lines[0].slice(2),
    content: lines.slice(4).join("\n").trim(),
    author, image, ogImage: image,
    originalSourceName: item.sourceName,
    originalSourceUrl: item.sourceUrl,
    generationMode: "manual" as const,
    status: "published" as const,
    reviewStatus: "approved" as const,
    publishedAt, lastUpdatedAt: publishedAt,
    duplicateRisk: 0, rejectionReasons: [],
    featured: false, trending: false, breakingNews: false,
    allowComments: true, gallery: [], views: 0
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
  assert(!/\*\*|^---$/m.test(payload.content), "Unsupported formatting");
  return parsed;
}

async function assertNoDuplicates(payloads: ReturnType<typeof buildPayload>[], session?: mongoose.ClientSession) {
  const matches = await Article.find({ $or: payloads.flatMap((item) => [
    { slug: item.slug }, { title: item.title },
    { sourceUrl: item.sourceUrl }, { originalSourceUrl: item.sourceUrl }
  ]) }).select("slug author status").session(session || null).lean();
  assert.equal(matches.length, 0, `Existing articles found: ${JSON.stringify(matches)}`);
}

async function main() {
  assert.equal(articles.length, 2);
  assert.equal(new Set(articles.map((item) => item.slug)).size, 2);
  const previews = articles.map((item) => buildPayload(item));
  previews.forEach(validate);
  if (!process.argv.includes("--apply")) {
    console.log(JSON.stringify({ mode: "dry-run", validation: "passed", articles: previews.map((item) => ({
      title: item.title, author: item.author, category: item.category, subcategory: item.subcategory,
      words: item.content.split(/\s+/).length, url: item.canonicalUrl
    })) }, null, 2));
    return;
  }

  assert(process.env.MONGODB_URI, "MONGODB_URI is missing");
  assert(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET, "Cloudinary configuration is missing");
  await mongoose.connect(process.env.MONGODB_URI, { dbName: "news_website", autoIndex: false, serverSelectionTimeoutMS: 30000, connectTimeoutMS: 30000 });
  try {
    await assertNoDuplicates(previews);
    cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET });
    const payloads: ReturnType<typeof buildPayload>[] = [];
    for (const item of articles) {
      console.log(JSON.stringify({ stage: "uploading-image", slug: item.slug }));
      const bytes = readFileSync(resolve("exports/manal-september-15-assets", item.imageFile));
      const uploaded = await cloudinary.uploader.upload(`data:image/jpeg;base64,${bytes.toString("base64")}`, { folder: "novexa-news", public_id: item.slug, overwrite: false, resource_type: "image", timeout: 60000 });
      const response = await fetch(uploaded.secure_url, { signal: AbortSignal.timeout(20000) });
      assert(response.ok && response.headers.get("content-type")?.startsWith("image/"), `Image inaccessible: ${item.slug}`);
      await response.arrayBuffer();
      const payload = buildPayload(item, uploaded.secure_url);
      validate(payload);
      payloads.push(payload);
    }

    // Commit only this two-document batch; never overwrite an existing story.
    await mongoose.connection.transaction(async (session) => {
      await assertNoDuplicates(payloads, session);
      for (const payload of payloads) {
        const parsed = validate(payload);
        const [article] = await Article.create([{ ...payload, ...parsed, scheduledAt: undefined }], { session });
        const saved = await Article.findOne({ _id: article._id, ...publicArticleFilter() }).session(session).lean();
        assert(saved, `Article is not publicly available: ${payload.slug}`);
        assert.deepEqual(articleIndexabilityIssues(saved), []);
      }
    });
    const saved = await Article.find({ slug: { $in: payloads.map((item) => item.slug) }, ...publicArticleFilter() }).lean();
    assert.equal(saved.length, 2, "Expected two published articles after commit");
    const report = { mode: "published", articles: saved.map((article) => ({
      id: String(article._id), title: article.title, author: article.author,
      category: article.category, subcategory: article.subcategory,
      url: article.canonicalUrl, image: article.image, publishedAt: article.publishedAt
    })) };
    mkdirSync(resolve("exports"), { recursive: true });
    writeFileSync(resolve("exports", `manal-september-15-publication-${new Date().toISOString().replace(/[:.]/g, "-")}.json`), `${JSON.stringify(report, null, 2)}\n`);
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
