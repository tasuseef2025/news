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
    slug: "iran-calls-regional-islamic-economic-political-bloc",
    category: "World",
    subcategory: "Middle East",
    excerpt: "Iran's first vice president has proposed closer Islamic economic and political cooperation as renewed fighting in Yemen raises concerns over Red Sea security.",
    metaTitle: "Iran Calls for Islamic Economic and Political Bloc",
    metaDescription: "Iran's Mohammad Reza Aref calls for an Islamic economic and political bloc as renewed fighting in Yemen raises regional and maritime security concerns.",
    sourceName: "Mehr News via Daftar Vakil",
    sourceUrl: "https://daftarvakil.ir/%D8%B3%DB%8C%D8%A7%D8%B3%DB%8C/214340/",
    sourceImage: "https://upload.wikimedia.org/wikipedia/commons/c/c8/Mohammad_Reza_Aref_in_2024_(1).jpg",
    imageFile: "iran.jpg",
    imageAlt: "Mohammad Reza Aref speaking at a government ceremony in August 2024; file photograph",
    imageCredit: "Fatemeh Amouzad / Mehr News Agency, via Wikimedia Commons. CC BY 4.0. File photo, August 2024.",
    imageCreditUrl: "https://commons.wikimedia.org/wiki/File:Mohammad_Reza_Aref_in_2024_(1).jpg",
    references: [
      { name: "Mehr News reporting republished by Daftar Vakil: Aref's statement", url: "https://daftarvakil.ir/%D8%B3%DB%8C%D8%A7%D8%B3%DB%8C/214340/" },
      { name: "Associated Press: Renewed fighting in Yemen", url: "https://apnews.com/article/e4e799701b382799a955969c212800ea" },
      { name: "Lead photograph license: Creative Commons Attribution 4.0", url: "https://creativecommons.org/licenses/by/4.0/" }
    ],
    tags: ["Iran", "Mohammad Reza Aref", "Regional Cooperation", "Yemen", "Red Sea"]
  },
  {
    slug: "anthropic-disrupts-ai-misuse-potential-biological-weapons-research",
    category: "Technology",
    subcategory: "Artificial Intelligence",
    excerpt: "Anthropic says it disrupted five cases of potentially dangerous biological research involving Claude, while cautioning that malicious intent was not established in every case.",
    metaTitle: "Anthropic Disrupts Potential Biological Research Misuse of AI",
    metaDescription: "Anthropic reports five cases of potential biological research misuse involving Claude, raising concerns about AI safeguards and legitimate scientific access.",
    sourceName: "Anthropic",
    sourceUrl: "https://www.anthropic.com/threat-intelligence-report-september-2026",
    sourceImage: "https://cdn.sanity.io/images/4zrzovbb/website/7a4426f8ffe57e7de23ff36906fb1cc3efe2a82b-1200x630.jpg",
    imageFile: "anthropic.jpg",
    imageAlt: "Anthropic's September 2026 threat intelligence report illustration, with a magnifying glass and highlighted grid",
    imageCredit: "Anthropic / September 2026 threat intelligence report illustration",
    imageCreditUrl: "https://www.anthropic.com/threat-intelligence-report-september-2026",
    references: [
      { name: "Anthropic: Detecting and countering misuse of AI, September 2026", url: "https://www.anthropic.com/threat-intelligence-report-september-2026" },
      { name: "Reuters via The National: Anthropic report on potential biological misuse", url: "https://www.thenationalnews.com/future/technology/2026/09/10/anthropic-ai-biological-weapons/" }
    ],
    tags: ["Anthropic", "Claude", "AI Safety", "Biosecurity", "Artificial Intelligence"]
  },
  {
    slug: "yemen-warns-houthi-threat-red-sea-security",
    category: "World",
    subcategory: "Middle East",
    excerpt: "Yemen's UN envoy has urged the Security Council to address Houthi escalation and enforce the arms embargo as renewed coastal fighting raises concerns over Red Sea shipping.",
    metaTitle: "Yemen Warns of Growing Houthi Threat to Red Sea Security",
    metaDescription: "Yemen urges Security Council action over Houthi escalation as renewed fighting along its western coast raises concerns for Bab al-Mandeb and Red Sea shipping.",
    sourceName: "Saba News Agency",
    sourceUrl: "https://www.sabanew.net/story/en/152193",
    sourceImage: "https://upload.wikimedia.org/wikipedia/commons/3/35/United_Nations_Security_Council.jpg",
    imageFile: "yemen.jpg",
    imageAlt: "The United Nations Security Council chamber in New York, pictured in 2006; file photograph",
    imageCredit: "Patrick Gruban / Wikimedia Commons, CC BY-SA 2.0. File photo, 2006; not the September 2026 meeting.",
    imageCreditUrl: "https://commons.wikimedia.org/wiki/File:United_Nations_Security_Council.jpg",
    references: [
      { name: "Security Council Report: Yemen emergency briefing, September 10", url: "https://www.securitycouncilreport.org/whatsinblue/2026/09/yemen-emergency-briefing.php" },
      { name: "Saba: Foreign minister discusses Houthi escalation with US charge d'affaires", url: "https://www.sabanew.net/story/en/152193" },
      { name: "Associated Press: Renewed fighting in Yemen", url: "https://apnews.com/article/e4e799701b382799a955969c212800ea" },
      { name: "Lead photograph license: Creative Commons Attribution-ShareAlike 2.0", url: "https://creativecommons.org/licenses/by-sa/2.0/" }
    ],
    tags: ["Yemen", "Houthis", "Red Sea", "Bab al-Mandeb", "United Nations"]
  },
  {
    slug: "shehbaz-sharif-agricultural-productivity-new-export-markets",
    category: "Pakistan",
    subcategory: "Agriculture",
    excerpt: "Prime Minister Shehbaz Sharif has called for higher farm productivity, digital tools and stronger export promotion to improve opportunities for Pakistan's farmers and producers.",
    metaTitle: "Shehbaz Sharif Calls for Higher Farm Output and Export Markets",
    metaDescription: "PM Shehbaz Sharif urges federal and provincial coordination, digital farm records and export promotion to raise agricultural output and reach new markets.",
    sourceName: "Business Recorder",
    sourceUrl: "https://www.brecorder.com/news/40439042/pm-shehbaz-calls-for-higher-farm-output-boost-in-agricultural-exports",
    sourceImage: "https://i.brecorder.com/large/2026/09/11142241105dd34.webp",
    imageFile: "agriculture.webp",
    imageAlt: "Prime Minister Shehbaz Sharif chairs a government meeting, in the photograph accompanying Business Recorder's agriculture report",
    imageCredit: "Business Recorder / photograph accompanying its September 11 agriculture report",
    imageCreditUrl: "https://www.brecorder.com/news/40439042/pm-shehbaz-calls-for-higher-farm-output-boost-in-agricultural-exports",
    references: [
      { name: "Business Recorder: PM calls for higher farm output and agricultural exports", url: "https://www.brecorder.com/news/40439042/pm-shehbaz-calls-for-higher-farm-output-boost-in-agricultural-exports" }
    ],
    tags: ["Shehbaz Sharif", "Agriculture", "Pakistan Exports", "Food Security", "Digital Farming"]
  },
  {
    slug: "shehbaz-sharif-polio-eradication-trade-reforms",
    category: "Pakistan",
    subcategory: "Government",
    excerpt: "PM Shehbaz Sharif reaffirmed support for polio eradication in talks with the Gates Foundation and separately approved measures to streamline Pakistan's trade procedures.",
    metaTitle: "Shehbaz Sharif Reaffirms Polio Goal, Pushes Trade Reforms",
    metaDescription: "PM Shehbaz Sharif reaffirms Pakistan's polio eradication commitment and, in a separate meeting, approves trade reforms to speed up cargo clearance.",
    sourceName: "Associated Press of Pakistan",
    sourceUrl: "https://www.app.com.pk/national/pm-shehbaz-reaffirms-commitment-to-eradicate-polio-in-meeting-with-gates-foundation-delegation/",
    sourceImage: "https://www.app.com.pk/wp-content/uploads/2026/09/WhatsApp-Image-2026-09-10-at-6.34.48-PM-2.jpeg",
    imageFile: "polio.jpg",
    imageAlt: "Prime Minister Shehbaz Sharif meets Gates Foundation representatives in Islamabad on September 10, 2026",
    imageCredit: "Associated Press of Pakistan / Prime Minister's Office meeting photograph",
    imageCreditUrl: "https://www.app.com.pk/national/pm-shehbaz-reaffirms-commitment-to-eradicate-polio-in-meeting-with-gates-foundation-delegation/",
    references: [
      { name: "APP: PM reaffirms polio eradication commitment in Gates Foundation meeting", url: "https://www.app.com.pk/national/pm-shehbaz-reaffirms-commitment-to-eradicate-polio-in-meeting-with-gates-foundation-delegation/" },
      { name: "Business Recorder: PM approves targets to speed up trade and cargo clearance", url: "https://www.brecorder.com/news/40438967" }
    ],
    tags: ["Shehbaz Sharif", "Polio Eradication", "Gates Foundation", "Trade Reforms", "Pakistan"]
  }
];

function buildPayload(item: typeof articles[number], image = item.sourceImage) {
  const lines = readFileSync(resolve("docs/articles", `${item.slug}.md`), "utf8").trim().split(/\r?\n/);
  assert(lines[0].startsWith("# "), "Missing article headline");
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
  assert(readiness.approved, `${payload.slug}: ${readiness.reasons.join("; ")}`);
  assert.deepEqual(articleIndexabilityIssues(payload), []);
  const structured = JSON.parse(payload.schemaMarkup);
  assert.equal(structured.author.name, author);
  assert.equal(structured.author["@type"], "Person");
  assert(structured.author.url.endsWith("/author/syeda-manal-tirmizi"));
  assert(!/\*\*|^---$/m.test(payload.content), "Unsupported article formatting");
  return parsed;
}

async function assertNoDuplicates(previews: ReturnType<typeof buildPayload>[], session?: mongoose.ClientSession) {
  const matches = await Article.find({ $or: previews.flatMap((item) => [
    { slug: item.slug }, { title: item.title },
    { sourceUrl: item.sourceUrl }, { originalSourceUrl: item.sourceUrl }
  ]) }).select("slug author status").session(session || null).lean();
  assert.equal(matches.length, 0, `Existing articles found; publication stopped: ${JSON.stringify(matches)}`);
}

async function main() {
  assert.equal(articles.length, 5);
  assert.equal(new Set(articles.map((item) => item.slug)).size, 5);
  const previews = articles.map((item) => buildPayload(item));
  previews.forEach(validate);
  if (!process.argv.includes("--apply")) {
    console.log(JSON.stringify({ mode: "dry-run", validation: "passed", articles: previews.map((item) => ({
      title: item.title, author: item.author, words: item.content.split(/\s+/).length, url: item.canonicalUrl
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
      const bytes = readFileSync(resolve("exports/manal-publication-assets", item.imageFile));
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

    // Publish the five validated documents together, without updating existing records.
    await mongoose.connection.transaction(async (session) => {
      await assertNoDuplicates(payloads, session);
      for (const payload of payloads) {
        const parsed = validate(payload);
        const [article] = await Article.create([{ ...payload, ...parsed, scheduledAt: undefined }], { session });
        const saved = await Article.findOne({ _id: article._id, ...publicArticleFilter() }).session(session).lean();
        assert(saved, `Article does not pass public listing filter: ${payload.slug}`);
        assert.deepEqual(articleIndexabilityIssues(saved), []);
      }
    });
    const saved = await Article.find({ slug: { $in: payloads.map((item) => item.slug) }, ...publicArticleFilter() }).lean();
    assert.equal(saved.length, 5, "Expected five publicly available articles after commit");
    const published = saved.map((article) => ({ id: String(article._id), title: article.title, author: article.author, url: article.canonicalUrl, image: article.image, publishedAt: article.publishedAt }));
    const report = { mode: "published", articles: published };
    mkdirSync(resolve("exports"), { recursive: true });
    writeFileSync(resolve("exports", `manal-publication-${new Date().toISOString().replace(/[:.]/g, "-")}.json`), `${JSON.stringify(report, null, 2)}\n`);
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  const message = error && typeof error === "object" && "message" in error ? String(error.message) : "Batch publication failed";
  console.error(message.replace(/mongodb(?:\+srv)?:\/\/\S+/gi, "[database connection redacted]"));
  process.exitCode = 1;
});
