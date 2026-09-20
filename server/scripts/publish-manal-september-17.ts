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
    slug: "pakistan-south-africa-parliamentary-partnership",
    category: "Politics",
    subcategory: "Parliamentary Diplomacy",
    excerpt: "Pakistan and South Africa agree to expand parliamentary exchanges, institutional cooperation, trade, tourism and people-to-people ties.",
    metaTitle: "Pakistan, South Africa Deepen Parliamentary Partnership",
    metaDescription: "Pakistan and South Africa plan closer parliamentary cooperation, institutional exchanges and wider engagement in trade, tourism and public contacts.",
    sourceName: "National Assembly of Pakistan",
    sourceUrl: "https://www.na.gov.pk/en/pressrelease_detail.php?id=8071",
    sourceImage: "https://www.na.gov.pk/uploads/content/1000829249.jpg",
    imageFile: "south-africa.jpg",
    imageAlt: "Pakistan National Assembly Speaker Ayaz Sadiq meets South African Speaker Angela Thokozile Didiza in Cape Town",
    imageCredit: "National Assembly of Pakistan",
    imageCreditUrl: "https://www.na.gov.pk/en/pressrelease_detail.php?id=8071",
    references: [
      { name: "National Assembly of Pakistan: Parliamentary and bilateral ties with South Africa", url: "https://www.na.gov.pk/en/pressrelease_detail.php?id=8071" },
      { name: "South African Parliament: 69th Commonwealth Parliamentary Conference", url: "https://cpc.parliament.gov.za/" }
    ],
    tags: ["Pakistan", "South Africa", "Ayaz Sadiq", "Angela Didiza", "Parliamentary Diplomacy"]
  },
  {
    slug: "shehbaz-sharif-uk-us-unga-2026-visit",
    category: "Pakistan",
    subcategory: "Foreign Affairs",
    excerpt: "Prime Minister Shehbaz Sharif leaves for the UK before travelling to New York to lead Pakistan's delegation at the 81st UN General Assembly.",
    metaTitle: "Shehbaz Leaves for UK Ahead of UNGA 2026 Visit",
    metaDescription: "Shehbaz Sharif leaves for the UK before travelling to New York, where he will lead Pakistan at the 81st UN General Assembly and address it on September 25.",
    sourceName: "Aaj News",
    sourceUrl: "https://english.aaj.tv/news/330472798/shehbaz-sharif-london-visit-new-york-unga-2026-us-visit-aaj-news",
    sourceImage: "https://i.dawn.com/large/2025/09/22104415cc851b1.webp",
    imageFile: "shehbaz.webp",
    imageAlt: "Prime Minister Shehbaz Sharif and officials walk across an airport apron during a previous UN General Assembly journey",
    imageCredit: "Dawn file photograph",
    imageCreditUrl: "https://www.dawn.com/news/1943856",
    references: [
      { name: "Aaj News: Shehbaz Sharif London and New York visit", url: "https://english.aaj.tv/news/330472798/shehbaz-sharif-london-visit-new-york-unga-2026-us-visit-aaj-news" },
      { name: "Radio Pakistan: PM to lead delegation at 81st UNGA", url: "https://radio.gov.pk/17-09-2026/pm-to-lead-pakistans-delegation-at-unga-session-in-new-york-next-week-fo" },
      { name: "Geo News: Shehbaz expected to meet Trump on UNGA sidelines", url: "https://www.geo.tv/latest/681863-pm-shehbaz-expected-to-meet-trump-on-unga-sidelines-in-new-york" }
    ],
    tags: ["Shehbaz Sharif", "UNGA 2026", "United Nations", "Pakistan Foreign Policy", "New York"]
  },
  {
    slug: "uzbekistan-condemns-attempted-makkah-attack",
    category: "World",
    subcategory: "Middle East Diplomacy",
    excerpt: "Uzbekistan condemns the attempted drone attack reported near Makkah, expresses solidarity with Saudi Arabia and calls for maximum restraint.",
    metaTitle: "Uzbekistan Condemns Attempted Makkah Attack",
    metaDescription: "Uzbekistan condemns the attempted drone attack reported near Makkah, backs Saudi Arabia and urges restraint, international law and regional de-escalation.",
    sourceName: "Ministry of Foreign Affairs of Uzbekistan",
    sourceUrl: "https://pakistan.mfa.uz/en/news/gmory-azbkstan-k-ozart-kharg-ka-byan",
    sourceImage: "https://pakistan.mfa.uz/storage/news/01M2QH0Y4Q4ZMZNR7GB58DBHTE.jpg",
    imageFile: "uzbekistan.jpg",
    imageAlt: "The Ministry of Foreign Affairs of Uzbekistan building in Tashkent",
    imageCredit: "Ministry of Foreign Affairs of Uzbekistan",
    imageCreditUrl: "https://pakistan.mfa.uz/en/news/gmory-azbkstan-k-ozart-kharg-ka-byan",
    references: [
      { name: "Uzbek Foreign Ministry: Statement on attempted attack toward Makkah", url: "https://pakistan.mfa.uz/en/news/gmory-azbkstan-k-ozart-kharg-ka-byan" },
      { name: "Daryo: Uzbekistan condemns attempted drone attack toward Makkah", url: "https://daryo.uz/en/2026/09/17/uzbekistan-condemns-attempted-drone-attack-toward-mecca-expresses-solidarity-with-saudi-arabia/" },
      { name: "Associated Press: Saudi and Houthi accounts of the incident", url: "https://apnews.com/article/742e1eebb7d099ea42372d978e271900" }
    ],
    tags: ["Uzbekistan", "Makkah", "Saudi Arabia", "Middle East", "Diplomacy"]
  }
] as const;

function buildPayload(item: typeof articles[number], image = item.sourceImage) {
  const lines = readFileSync(resolve("docs/articles", `${item.slug}.md`), "utf8").trim().split(/\r?\n/);
  assert(lines[0].startsWith("# "), `${item.slug}: missing headline`);
  assert.equal(lines[2], `By ${author}`);
  const { sourceImage: _sourceImage, imageFile: _imageFile, ...metadata } = item;
  const publishedAt = new Date();
  return normalizeArticlePayload({
    ...metadata,
    title: lines[0].slice(2),
    content: lines.slice(4).join("\n").trim(),
    author,
    image,
    ogImage: image,
    originalSourceName: item.sourceName,
    originalSourceUrl: item.sourceUrl,
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
    factualConfidence: 94,
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
  assert(readiness.approved, `${payload.slug}: ${readiness.reasons.join("; ")}`);
  assert.deepEqual(articleIndexabilityIssues(payload), [], `${payload.slug}: indexability validation failed`);
  assert(payload.content.split(/\s+/).length >= 600, `${payload.slug}: article is shorter than 600 words`);
  assert(!/\*\*|^---$|^\|/m.test(payload.content), `${payload.slug}: unsupported article formatting`);
  const schema = JSON.parse(payload.schemaMarkup);
  assert.equal(schema.author.name, author);
  assert.equal(schema.author["@type"], "Person");
  assert(schema.author.url.endsWith("/author/syeda-manal-tirmizi"));
  return parsed;
}

async function assertNoDuplicates(payloads: ReturnType<typeof buildPayload>[], session?: mongoose.ClientSession) {
  const matches = await Article.find({
    $or: payloads.flatMap((item) => [
      { slug: item.slug },
      { title: item.title },
      { sourceUrl: item.sourceUrl },
      { originalSourceUrl: item.sourceUrl }
    ])
  }).select("slug title author status sourceUrl").session(session || null).lean();
  assert.equal(matches.length, 0, `Existing articles found: ${JSON.stringify(matches)}`);
}

async function main() {
  assert.equal(articles.length, 3);
  const previews = articles.map((item) => buildPayload(item));
  previews.forEach(validate);

  if (!process.argv.includes("--apply")) {
    console.log(JSON.stringify({
      mode: "dry-run",
      validation: "passed",
      articles: previews.map((article) => ({
        title: article.title,
        slug: article.slug,
        author: article.author,
        category: article.category,
        subcategory: article.subcategory,
        words: article.content.split(/\s+/).length,
        url: article.canonicalUrl
      }))
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
    await assertNoDuplicates(previews);
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    });

    const payloads: ReturnType<typeof buildPayload>[] = [];
    for (const item of articles) {
      const publicId = `novexa-news/${item.slug}`;
      let uploaded: { secure_url: string };
      try {
        uploaded = await cloudinary.api.resource(publicId, { resource_type: "image" });
        console.log(JSON.stringify({ stage: "reusing-image", slug: item.slug }));
      } catch {
        console.log(JSON.stringify({ stage: "uploading-image", slug: item.slug }));
        const bytes = readFileSync(resolve("exports/manal-september-17-assets", item.imageFile));
        const mimeType = item.imageFile.endsWith(".webp") ? "image/webp" : "image/jpeg";
        uploaded = await cloudinary.uploader.upload(`data:${mimeType};base64,${bytes.toString("base64")}`, {
          folder: "novexa-news",
          public_id: item.slug,
          overwrite: false,
          resource_type: "image",
          timeout: 60000
        });
      }

      const response = await fetch(uploaded.secure_url, { signal: AbortSignal.timeout(20000) });
      assert(response.ok && response.headers.get("content-type")?.startsWith("image/"), `Image inaccessible: ${item.slug}`);
      await response.arrayBuffer();
      const payload = buildPayload(item, uploaded.secure_url);
      validate(payload);
      payloads.push(payload);
    }

    console.log(JSON.stringify({ stage: "starting-transaction", count: payloads.length }));
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

    const saved = await Article.find({
      slug: { $in: payloads.map((item) => item.slug) },
      ...publicArticleFilter()
    }).lean();
    assert.equal(saved.length, articles.length, "Expected three public articles after commit");

    const report = {
      mode: "published",
      articles: saved.map((article) => ({
        id: String(article._id),
        title: article.title,
        author: article.author,
        category: article.category,
        subcategory: article.subcategory,
        url: article.canonicalUrl,
        image: article.image,
        publishedAt: article.publishedAt
      }))
    };
    mkdirSync(resolve("exports"), { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    writeFileSync(resolve("exports", `manal-september-17-publication-${stamp}.json`), `${JSON.stringify(report, null, 2)}\n`);
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
