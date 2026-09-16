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

const slug = "pakistan-reviews-fuel-saving-measures-petroleum-prices";
const author = "Syeda Manal Tirmizi";
const sourceUrl = "https://dunyanews.tv/en/Business/973026-pakistan-plans-smart-lockdown-as-petroleum-prices-rise";
const sourceImage = "https://i.aaj.tv/large/2026/09/15172007b61a6fe.webp";

function buildPayload(image = sourceImage) {
  const lines = readFileSync(resolve("docs/articles", `${slug}.md`), "utf8").trim().split(/\r?\n/);
  assert(lines[0].startsWith("# "), "Missing headline");
  assert.equal(lines[2], `By ${author}`);
  const publishedAt = new Date();
  return normalizeArticlePayload({
    title: lines[0].slice(2), slug, content: lines.slice(4).join("\n").trim(), author,
    category: "Pakistan", subcategory: "Government Policy",
    excerpt: "Pakistan is reviewing possible fuel-saving measures, including a four-day workweek and limits on official transport, but no final policy has been announced.",
    metaTitle: "Pakistan Reviews Fuel-Saving Measures as Prices Rise",
    metaDescription: "Pakistan reviews a four-day workweek, official-vehicle limits and shorter market hours to save fuel, but the reported proposals have not been approved.",
    image, ogImage: image,
    imageAlt: "A barricade across an empty city road in a representational file image; no new fuel-related lockdown had been announced",
    imageCredit: "Aaj English / representational file image. No new fuel-related lockdown had been announced at publication time.",
    imageCreditUrl: "https://english.aaj.tv/news/330472475/govt-weighs-three-day-smart-lockdown-as-fuel-prices-surge",
    sourceName: "Dunya News", sourceUrl,
    originalSourceName: "Dunya News", originalSourceUrl: sourceUrl,
    references: [
      { name: "Dunya News: Fuel-saving proposals remain under consideration", url: sourceUrl },
      { name: "India Today: Information minister confirms review of earlier austerity measures", url: "https://www.indiatoday.in/world/story/pakistan-fuel-prices-austerity-measures-west-asia-oil-surge-ptag-2994605-2026-09-14" },
      { name: "Geo News: Reported proposals and official assurance on fuel supplies", url: "https://www.geo.tv/latest/682175-govt-likely-to-impose-smart-lockdown-amid-worsening-fuel-crisis-sources" },
      { name: "Radio Pakistan: Most March conservation restrictions withdrawn in June", url: "https://www.radio.gov.pk/20-06-2026/pm-terminates-fuel-conservation-additional-austerity-measures" }
    ],
    tags: ["Fuel Conservation", "Shehbaz Sharif", "Petroleum Prices", "Four-Day Workweek", "Pakistan Government"],
    generationMode: "manual" as const, status: "published" as const, reviewStatus: "approved" as const,
    publishedAt, lastUpdatedAt: publishedAt, duplicateRisk: 0, rejectionReasons: [],
    featured: false, trending: false, breakingNews: false, allowComments: true, gallery: [], views: 0
  });
}

function validate(payload: ReturnType<typeof buildPayload>) {
  const parsed = articleSchema.parse(payload);
  const readiness = validatePublishReadiness(payload);
  assert(readiness.approved, readiness.reasons.join("; "));
  assert.deepEqual(articleIndexabilityIssues(payload), []);
  const structured = JSON.parse(payload.schemaMarkup);
  assert.equal(structured.author.name, author);
  assert.equal(structured.author["@type"], "Person");
  assert(structured.author.url.endsWith("/author/syeda-manal-tirmizi"));
  assert.equal(structured.articleSection, "Pakistan");
  assert(!/\*\*|^---$|^\|/m.test(payload.content), "Unsupported article formatting");
  assert(payload.content.includes("No new lockdown") && payload.content.includes("remain proposals rather than rules in force"));
  return parsed;
}

async function assertNoDuplicate(payload: ReturnType<typeof buildPayload>, session?: mongoose.ClientSession) {
  const match = await Article.findOne({ $or: [
    { slug: payload.slug }, { title: payload.title }, { sourceUrl }, { originalSourceUrl: sourceUrl }
  ] }).select("slug title author status sourceUrl").session(session || null).lean();
  assert(!match, `Existing article found: ${JSON.stringify(match)}`);
}

async function main() {
  const preview = buildPayload();
  validate(preview);
  if (!process.argv.includes("--apply")) {
    console.log(JSON.stringify({ mode: "dry-run", validation: "passed", title: preview.title,
      author: preview.author, category: preview.category, subcategory: preview.subcategory,
      words: preview.content.split(/\s+/).length, url: preview.canonicalUrl }, null, 2));
    return;
  }

  assert(process.env.MONGODB_URI, "MONGODB_URI is missing");
  assert(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET, "Cloudinary configuration is missing");
  await mongoose.connect(process.env.MONGODB_URI, { dbName: "news_website", autoIndex: false, serverSelectionTimeoutMS: 30000, connectTimeoutMS: 30000 });
  try {
    await assertNoDuplicate(preview);
    cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET });
    const publicId = `novexa-news/${slug}`;
    let uploaded: { secure_url: string };
    try {
      uploaded = await cloudinary.api.resource(publicId, { resource_type: "image" });
      console.log(JSON.stringify({ stage: "reusing-image", slug }));
    } catch {
      const bytes = readFileSync(resolve("exports/manal-fuel-saving-assets/aaj.webp"));
      uploaded = await cloudinary.uploader.upload(`data:image/webp;base64,${bytes.toString("base64")}`, {
        folder: "novexa-news", public_id: slug, overwrite: false, resource_type: "image", timeout: 60000
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
    const savedDoc = Array.isArray(fetched) ? fetched[0] : fetched;
    const report = { mode: "published", id: String((savedDoc as any)._id), title: (savedDoc as any).title, author: (savedDoc as any).author,
      category: (savedDoc as any).category, subcategory: (savedDoc as any).subcategory, url: (savedDoc as any).canonicalUrl,
      image: (savedDoc as any).image, publishedAt: (savedDoc as any).publishedAt };
    mkdirSync(resolve("exports"), { recursive: true });
    writeFileSync(resolve("exports", `manal-fuel-saving-publication-${new Date().toISOString().replace(/[:.]/g, "-")}.json`), `${JSON.stringify(report, null, 2)}\n`);
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
