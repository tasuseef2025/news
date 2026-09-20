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
const assetsDir = "exports/manal-september-21-assets";

const items = [
  {
    operation: "create",
    slug: "sohail-afridi-calls-review-foreign-security-policy",
    category: "Pakistan",
    subcategory: "Security Policy",
    excerpt: "KP Chief Minister Sohail Afridi calls for a review of Pakistan's foreign and security policy after the deadly Kohat Police Lines attack.",
    metaTitle: "Sohail Afridi Calls for Foreign Policy Review",
    metaDescription: "KP Chief Minister Sohail Afridi calls for a foreign and security policy review after the Kohat attack and promises support for police and victims.",
    sourceName: "Dawn",
    sourceUrl: "https://www.dawn.com/news/2031201",
    imageFile: "sohail-afridi.webp",
    imageMime: "image/webp",
    imageAlt: "Khyber Pakhtunkhwa Chief Minister Mohammad Sohail Afridi speaks during a televised appearance",
    imageCredit: "Express Tribune / Geo News screengrab",
    imageCreditUrl: "https://tribune.com.pk/story/2630321/afridi-calls-for-review-of-anti-terror-policy",
    references: [
      { name: "Dawn: CM blames security deterioration on failed foreign policy", url: "https://www.dawn.com/news/2031201" },
      { name: "Express Tribune: Afridi calls for review of anti-terror policy", url: "https://tribune.com.pk/story/2630321/afridi-calls-for-review-of-anti-terror-policy" },
      { name: "Novexa: Kohat Police Lines attack and operation", url: "https://www.novexa.news/news/kohat-police-lines-attack-21-dead-eight-attackers-september-2026" }
    ],
    tags: ["Sohail Afridi", "Khyber Pakhtunkhwa", "Kohat", "Security Policy", "Counterterrorism"]
  },
  {
    operation: "create",
    slug: "ishaq-dar-new-york-81st-unga-agenda",
    category: "Politics",
    subcategory: "Foreign Affairs",
    excerpt: "Ishaq Dar leaves for New York for the 81st UN General Assembly, with meetings on Kashmir, Palestine, AI, health security and regional trade.",
    metaTitle: "Ishaq Dar Leaves for 81st UN General Assembly",
    metaDescription: "Ishaq Dar heads to New York for UNGA meetings on Kashmir, Palestine, artificial intelligence, pandemic readiness and ECO cooperation.",
    sourceName: "Ministry of Foreign Affairs, Pakistan",
    sourceUrl: "https://mofa.gov.pk/press-releases/curtain-raiser-visit-of-the-deputy-prime-minister-to-new-york-to-attend-the-81st-session-of-the-united-nations-general-assembly-21-25-september-2026",
    imageFile: "ishaq-dar.jpg",
    imageMime: "image/jpeg",
    imageAlt: "Deputy Prime Minister and Foreign Minister Ishaq Dar attends an official meeting",
    imageCredit: "Associated Press of Pakistan / file photograph",
    imageCreditUrl: "https://www.app.com.pk/national/dpm-fm-dar-departs-to-new-york-to-attend-unga-81st-session/",
    references: [
      { name: "Pakistan Foreign Office: Dar's UNGA programme", url: "https://mofa.gov.pk/press-releases/curtain-raiser-visit-of-the-deputy-prime-minister-to-new-york-to-attend-the-81st-session-of-the-united-nations-general-assembly-21-25-september-2026" },
      { name: "APP: Dar departs for New York", url: "https://www.app.com.pk/national/dpm-fm-dar-departs-to-new-york-to-attend-unga-81st-session/" },
      { name: "Novexa: Shehbaz Sharif's UNGA visit", url: "https://www.novexa.news/news/shehbaz-sharif-uk-us-unga-2026-visit" }
    ],
    tags: ["Ishaq Dar", "UN General Assembly", "Pakistan Foreign Policy", "United Nations", "UNGA 81"]
  },
  {
    operation: "update",
    slug: "houthi-rebels-attack-riyadh",
    category: "World",
    subcategory: "Middle East",
    excerpt: "Houthis claim missile and drone attacks on Riyadh and Yanbu as Saudi Arabia reports intercepting a ballistic missile and thwarting other strikes.",
    metaTitle: "Houthis Claim Attacks on Riyadh and Yanbu",
    metaDescription: "Houthis claim missile and drone attacks on Riyadh and Yanbu; Saudi Arabia says it intercepted a ballistic missile and stopped other attempted strikes.",
    sourceName: "Associated Press",
    sourceUrl: "https://apnews.com/article/yemen-saudi-arabia-b1286cad816dd3e553f50f6dd5205972",
    imageFile: "houthi-riyadh.jpg",
    imageMime: "image/jpeg",
    imageAlt: "Houthi supporters raise rifles during a rally in Sanaa, Yemen",
    imageCredit: "Anadolu Agency",
    imageCreditUrl: "https://www.aa.com.tr/en/middle-east/yemen-s-houthis-claim-missile-drone-attacks-on-saudi-capital/4062167",
    references: [
      { name: "Associated Press: Saudi Arabia intercepts Riyadh missile", url: "https://apnews.com/article/yemen-saudi-arabia-b1286cad816dd3e553f50f6dd5205972" },
      { name: "Anadolu Agency: Houthis claim attacks on Saudi capital", url: "https://www.aa.com.tr/en/middle-east/yemen-s-houthis-claim-missile-drone-attacks-on-saudi-capital/4062167" },
      { name: "Novexa: Yemen warns of Houthi threat to Red Sea security", url: "https://www.novexa.news/news/yemen-warns-houthi-threat-red-sea-security" }
    ],
    tags: ["Houthis", "Saudi Arabia", "Riyadh", "Yanbu", "Yemen"]
  }
] as const;

type ExistingArticle = Record<string, any> & {
  _id: mongoose.Types.ObjectId;
  slug: string;
  publishedAt: Date;
  updatedAt: Date;
};

function readArticle(slug: string) {
  const lines = readFileSync(resolve("docs/articles", `${slug}.md`), "utf8").trim().split(/\r?\n/);
  assert(lines[0].startsWith("# "), `${slug}: missing headline`);
  assert.equal(lines[2], `By ${author}`);
  return { title: lines[0].slice(2), content: lines.slice(4).join("\n").trim() };
}

function buildPayload(
  item: typeof items[number],
  image: string,
  now: Date,
  existing?: ExistingArticle
) {
  const article = readArticle(item.slug);
  return normalizeArticlePayload({
    title: article.title,
    slug: item.slug,
    content: article.content,
    author,
    category: item.category,
    subcategory: item.subcategory,
    excerpt: item.excerpt,
    metaTitle: item.metaTitle,
    metaDescription: item.metaDescription,
    image,
    ogImage: image,
    imageAlt: item.imageAlt,
    imageCredit: item.imageCredit,
    imageCreditUrl: item.imageCreditUrl,
    sourceName: item.sourceName,
    sourceUrl: item.sourceUrl,
    originalSourceName: item.sourceName,
    originalSourceUrl: item.sourceUrl,
    references: [...item.references],
    tags: [...item.tags],
    generationMode: "manual" as const,
    status: "published" as const,
    reviewStatus: "approved" as const,
    publishedAt: existing?.publishedAt || now,
    contentUpdatedAt: now,
    lastUpdatedAt: now,
    duplicateRisk: 0,
    rejectionReasons: [],
    qualityScore: 96,
    originalityScore: 96,
    factualConfidence: 95,
    featured: Boolean(existing?.featured),
    trending: Boolean(existing?.trending),
    breakingNews: Boolean(existing?.breakingNews),
    allowComments: existing?.allowComments !== false,
    gallery: Array.isArray(existing?.gallery) ? existing.gallery : [],
    views: Number(existing?.views || 0)
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
  assert.equal(schema.author.name, author);
  assert.equal(schema.author["@type"], "Person");
  assert(schema.author.url.endsWith("/author/syeda-manal-tirmizi"));
  return parsed;
}

async function assertNoDuplicate(
  payload: ReturnType<typeof buildPayload>,
  excludedId?: mongoose.Types.ObjectId,
  session?: mongoose.ClientSession
) {
  const query: Record<string, unknown> = {
    $or: [
      { slug: payload.slug },
      { title: payload.title },
      { sourceUrl: payload.sourceUrl },
      { originalSourceUrl: payload.originalSourceUrl }
    ]
  };
  if (excludedId) query._id = { $ne: excludedId };
  const match = await Article.findOne(query).select("slug title author status sourceUrl").session(session || null).lean();
  assert(!match, `${payload.slug}: duplicate article found: ${JSON.stringify(match)}`);
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
    const updateItem = items.find((item) => item.operation === "update");
    assert(updateItem, "Update item is missing");
    const existing = await Article.findOne({ slug: updateItem.slug }).lean() as ExistingArticle | null;
    assert(existing, `Existing article not found: ${updateItem.slug}`);
    const now = new Date();

    const previews = items.map((item) => {
      const payload = buildPayload(
        item,
        `https://example.com/${item.imageFile}`,
        now,
        item.operation === "update" ? existing : undefined
      );
      validate(payload);
      return payload;
    });

    for (const payload of previews) {
      const item = items.find((candidate) => candidate.slug === payload.slug)!;
      await assertNoDuplicate(payload, item.operation === "update" ? existing._id : undefined);
    }

    if (!apply) {
      console.log(JSON.stringify({
        mode: "dry-run",
        validation: "passed",
        articles: previews.map((article) => ({
          operation: items.find((item) => item.slug === article.slug)!.operation,
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

    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    });

    const payloads: ReturnType<typeof buildPayload>[] = [];
    for (const item of items) {
      const publicId = item.operation === "update" ? `${item.slug}-editorial-20260921` : item.slug;
      let uploaded: { secure_url: string };
      try {
        uploaded = await cloudinary.api.resource(`novexa-news/${publicId}`, { resource_type: "image" });
        console.log(JSON.stringify({ stage: "reusing-image", slug: item.slug }));
      } catch {
        const bytes = readFileSync(resolve(assetsDir, item.imageFile));
        uploaded = await cloudinary.uploader.upload(`data:${item.imageMime};base64,${bytes.toString("base64")}`, {
          folder: "novexa-news",
          public_id: publicId,
          overwrite: false,
          resource_type: "image",
          timeout: 60000
        });
        console.log(JSON.stringify({ stage: "uploaded-image", slug: item.slug }));
      }

      const imageResponse = await fetch(uploaded.secure_url, { signal: AbortSignal.timeout(20000) });
      assert(imageResponse.ok && imageResponse.headers.get("content-type")?.startsWith("image/"), `Image inaccessible: ${item.slug}`);
      await imageResponse.arrayBuffer();
      const payload = buildPayload(item, uploaded.secure_url, now, item.operation === "update" ? existing : undefined);
      validate(payload);
      payloads.push(payload);
    }

    const stamp = now.toISOString().replace(/[:.]/g, "-");
    mkdirSync(resolve("backups"), { recursive: true });
    writeFileSync(resolve("backups", `houthi-rebels-attack-riyadh-before-${stamp}.json`), `${JSON.stringify(existing, null, 2)}\n`);

    await mongoose.connection.transaction(async (session) => {
      const revisions = mongoose.connection.db!.collection("articlerevisions");
      for (const payload of payloads) {
        const item = items.find((candidate) => candidate.slug === payload.slug)!;
        const parsed = validate(payload);
        if (item.operation === "create") {
          await assertNoDuplicate(payload, undefined, session);
          const [created] = await Article.create([{ ...payload, ...parsed, scheduledAt: undefined }], { session });
          const publicRecord = await Article.findOne({ _id: created._id, ...publicArticleFilter() }).session(session).lean();
          assert(publicRecord, `${payload.slug}: created article is not public`);
        } else {
          await assertNoDuplicate(payload, existing._id, session);
          const result = await Article.updateOne(
            { _id: existing._id, updatedAt: existing.updatedAt },
            { $set: { ...payload, ...parsed, scheduledAt: undefined, updatedAt: now } },
            { session }
          );
          assert.equal(result.modifiedCount, 1, `${payload.slug}: article changed during update`);
          await revisions.insertOne({
            articleId: existing._id,
            title: existing.title,
            excerpt: existing.excerpt,
            content: existing.content,
            sourceName: existing.sourceName,
            sourceUrl: existing.sourceUrl,
            snapshot: existing,
            reason: "editorial-update: replace automated Houthi-Riyadh report with verified sourced reporting under Syeda Manal Tirmizi",
            createdAt: now
          }, { session });
        }
      }
    });

    const saved = await Article.find({
      slug: { $in: items.map((item) => item.slug) },
      ...publicArticleFilter()
    }).lean();
    assert.equal(saved.length, items.length, "Expected three public articles after publication");
    for (const article of saved) assert.deepEqual(articleIndexabilityIssues(article), []);

    const report = {
      mode: "published",
      articles: saved.map((article) => ({
        operation: items.find((item) => item.slug === article.slug)!.operation,
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
    mkdirSync(resolve("exports"), { recursive: true });
    writeFileSync(resolve("exports", `manal-september-21-publication-${stamp}.json`), `${JSON.stringify(report, null, 2)}\n`);
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
