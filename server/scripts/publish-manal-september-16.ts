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
const retainedMakkahSlug = "saudi-arabia-intercepts-houthi-drone-near-makkah";

const articles = [
  {
    slug: "pakistan-france-ties-nicolas-galey-farewell",
    category: "Pakistan",
    subcategory: "Diplomacy",
    excerpt: "Prime Minister Shehbaz Sharif and outgoing French Ambassador Nicolas Galey call for deeper political, economic and people-to-people ties.",
    metaTitle: "Pakistan and France Pledge Broader Political, Economic Ties",
    metaDescription: "Shehbaz Sharif and outgoing French Ambassador Nicolas Galey discuss deeper political dialogue, economic engagement and people-to-people exchanges.",
    sourceName: "Radio Pakistan",
    sourceUrl: "https://radio.gov.pk/16-09-2026/pm-reaffirms-pakistans-commitment-to-expand-ties-with-france",
    sourceImage: "https://newsimage.radio.gov.pk/20260916/816377741789552347.jpg",
    imageFile: "france.jpg",
    imageAlt: "Prime Minister Shehbaz Sharif meets outgoing French Ambassador Nicolas Galey in Islamabad",
    imageCredit: "Radio Pakistan / Prime Minister's Office",
    imageCreditUrl: "https://radio.gov.pk/16-09-2026/pm-reaffirms-pakistans-commitment-to-expand-ties-with-france",
    references: [
      { name: "Radio Pakistan: PM reaffirms commitment to expand ties with France", url: "https://radio.gov.pk/16-09-2026/pm-reaffirms-pakistans-commitment-to-expand-ties-with-france" },
      { name: "Radio Pakistan: President values longstanding friendship with France", url: "https://www.radio.gov.pk/14-09-2026/pakistan-values-longstanding-friendship-with-france-president" }
    ],
    tags: ["Pakistan", "France", "Shehbaz Sharif", "Nicolas Galey", "Diplomacy"]
  },
  {
    slug: "uzbek-media-delegation-pakistan-visit",
    category: "Media",
    subcategory: "Media Diplomacy",
    excerpt: "Uzbek journalists visit Pakistan's Foreign Office and leading broadcasters during an eight-day tour focused on media and cultural ties.",
    metaTitle: "Uzbek Media Delegation Builds New Links in Pakistan",
    metaDescription: "A nine-member Uzbek media delegation visits Pakistan's Foreign Office, PTV and private broadcasters to deepen professional and cultural links.",
    sourceName: "Associated Press of Pakistan",
    sourceUrl: "https://www.app.com.pk/national/uzbekistans-media-delegation-explores-pakistans-diplomatic-media-landscape/",
    sourceImage: "https://www.app.com.pk/wp-content/uploads/2026/09/WhatsApp-Image-2026-09-16-at-7.04.00-PM-1.jpeg",
    imageFile: "uzbek.jpg",
    imageAlt: "Members of an Uzbek media delegation meet Pakistani officials at the Foreign Office in Islamabad",
    imageCredit: "Associated Press of Pakistan",
    imageCreditUrl: "https://www.app.com.pk/national/uzbekistans-media-delegation-explores-pakistans-diplomatic-media-landscape/",
    references: [
      { name: "APP: Uzbekistan's media delegation explores Pakistan", url: "https://www.app.com.pk/national/uzbekistans-media-delegation-explores-pakistans-diplomatic-media-landscape/" },
      { name: "APP: Uzbek media delegation arrives to deepen ties", url: "https://www.app.com.pk/national/uzbek-media-delegation-arrives-to-deepen-pak-uzbek-ties/" }
    ],
    tags: ["Uzbekistan", "Pakistan", "Media", "Foreign Office", "Cultural Diplomacy"]
  },
  {
    slug: "asim-munir-powerus-defence-technology-talks",
    category: "Technology",
    subcategory: "Defence Technology",
    excerpt: "Field Marshal Syed Asim Munir and a POWERUS delegation discuss defence technology, manufacturing, procurement and critical infrastructure.",
    metaTitle: "Asim Munir, POWERUS Discuss Defence Technology",
    metaDescription: "Field Marshal Syed Asim Munir meets a POWERUS delegation at GHQ for talks on defence technology, manufacturing and critical infrastructure.",
    sourceName: "Dunya News",
    sourceUrl: "https://dunyanews.tv/en/Pakistan/973230-field-marshal-asim-munir-us-delegation-discuss-defence-technology-and",
    sourceImage: "https://img.dunyanews.tv/news/2026/September/09-16-26/news_big_images/973230_98501114.jpg",
    imageFile: "powerus.jpg",
    imageAlt: "Field Marshal Syed Asim Munir stands with members of the POWERUS delegation at General Headquarters",
    imageCredit: "Inter-Services Public Relations, via Dunya News",
    imageCreditUrl: "https://dunyanews.tv/en/Pakistan/973230-field-marshal-asim-munir-us-delegation-discuss-defence-technology-and",
    references: [
      { name: "Dunya News: Asim Munir and POWERUS discuss defence technology", url: "https://dunyanews.tv/en/Pakistan/973230-field-marshal-asim-munir-us-delegation-discuss-defence-technology-and" },
      { name: "Aaj News: Field Marshal stresses technology innovation", url: "https://english.aaj.tv/news/330472663/field-marshal-stresses-tech-innovation-for-national-security" }
    ],
    tags: ["Asim Munir", "POWERUS", "Defence Technology", "Pakistan Army", "Critical Infrastructure"]
  },
  {
    slug: "pakistan-nepal-flood-technical-support",
    category: "Climate",
    subcategory: "Disaster Response",
    excerpt: "Pakistan offers Nepal satellite, drone, AI and glacial-risk expertise to support flood rescue, recovery and long-term disaster preparedness.",
    metaTitle: "Pakistan Offers Nepal Technical Support for Flood Recovery",
    metaDescription: "Pakistan offers Nepal satellite, drone, AI and glacial-risk expertise for flood rescue, recovery, early warning and climate resilience.",
    sourceName: "Associated Press of Pakistan",
    sourceUrl: "https://www.app.com.pk/national/pakistan-offers-nepal-support-amid-flood-crisis/",
    sourceImage: "https://www.app.com.pk/wp-content/uploads/2026/09/WhatsApp-Image-2026-09-16-at-6.00.50-PM-1024x652.jpeg",
    imageFile: "nepal.jpg",
    imageAlt: "Pakistan climate minister Musadik Malik meets Nepal's Ambassador Rita Dhital in Islamabad",
    imageCredit: "Associated Press of Pakistan",
    imageCreditUrl: "https://www.app.com.pk/national/pakistan-offers-nepal-support-amid-flood-crisis/",
    references: [
      { name: "APP: Pakistan offers Nepal support amid flood crisis", url: "https://www.app.com.pk/national/pakistan-offers-nepal-support-amid-flood-crisis/" },
      { name: "APP: Pakistan dispatches emergency relief assistance to Nepal", url: "https://www.app.com.pk/national/pm-visits-nepal-embassy-signs-condolence-book-for-flood-victims-announces-relief-assistance/" }
    ],
    tags: ["Nepal Floods", "Climate Change", "Disaster Response", "GLOF", "Musadik Malik"]
  },
  {
    slug: "pakistan-extends-indian-aircraft-ban-october-24",
    category: "Pakistan",
    subcategory: "Aviation",
    excerpt: "Pakistan extends its ban on Indian civil and military aircraft through October 24, keeping restrictions across both flight information regions.",
    metaTitle: "Pakistan Extends Indian Aircraft Ban to October 24",
    metaDescription: "Pakistan extends its airspace ban on Indian civil and military aircraft to October 24 across the Karachi and Lahore flight information regions.",
    sourceName: "Arab News Pakistan",
    sourceUrl: "https://www.arabnews.pk/pakistan/pakistan-extends-airspace-ban-on-indian-aircraft-until-oct-24-3001395",
    sourceImage: "https://assets.maestronewsroom.com/media/5dd7c4a4-a961-498c-8029-59f9255b4c95/proxies/e067a0b1-ee57-4e3a-a5d3-99a7b1fe3eef.webp",
    imageFile: "airspace.webp",
    imageAlt: "An IndiGo passenger aircraft approaches an airport in a file photograph",
    imageCredit: "Reuters file photograph, via Arab News Pakistan",
    imageCreditUrl: "https://www.arabnews.pk/pakistan/pakistan-extends-airspace-ban-on-indian-aircraft-until-oct-24-3001395",
    references: [
      { name: "Arab News Pakistan: Airspace ban extended until October 24", url: "https://www.arabnews.pk/pakistan/pakistan-extends-airspace-ban-on-indian-aircraft-until-oct-24-3001395" },
      { name: "Business Recorder: Pakistan extends Indian aircraft ban", url: "https://www.brecorder.com/news/40439766/pakistan-extends-airspace-ban-on-indian-aircraft-till-october-24" }
    ],
    tags: ["Pakistan Airspace", "India", "Aviation", "Pakistan Airports Authority", "NOTAM"]
  },
  {
    slug: "pakistan-backs-saudi-self-defence-yemen-talks",
    category: "World",
    subcategory: "Middle East",
    excerpt: "Pakistan backs Saudi Arabia's right to defend its territory while calling for de-escalation, secure Red Sea shipping and renewed Yemen talks.",
    metaTitle: "Pakistan Backs Saudi Self-Defence, Calls for Yemen Talks",
    metaDescription: "Pakistan condemns Houthi attacks, backs Saudi defensive measures and urges de-escalation, Red Sea security and an inclusive Yemen peace process.",
    sourceName: "Radio Pakistan",
    sourceUrl: "https://radio.gov.pk/11-09-2026/pakistan-reaffirms-support-for-sincere-efforts-aimed-at-de-escalation-dialogue-in-yemen",
    sourceImage: "https://newsimage.radio.gov.pk/20260911/14999115521789103683.jpg",
    imageFile: "saudi-un.jpg",
    imageAlt: "Pakistan's UN Ambassador Asim Iftikhar Ahmad addresses a United Nations meeting",
    imageCredit: "Radio Pakistan / Pakistan Mission to the United Nations",
    imageCreditUrl: "https://radio.gov.pk/11-09-2026/pakistan-reaffirms-support-for-sincere-efforts-aimed-at-de-escalation-dialogue-in-yemen",
    references: [
      { name: "Radio Pakistan: Pakistan calls for dialogue and de-escalation in Yemen", url: "https://radio.gov.pk/11-09-2026/pakistan-reaffirms-support-for-sincere-efforts-aimed-at-de-escalation-dialogue-in-yemen" },
      { name: "Dawn: Pakistan condemns Houthi attacks on Saudi Arabia", url: "https://www.dawn.com/news/2030332" },
      { name: "Associated Press: Saudi Arabia says drone was intercepted near Makkah", url: "https://apnews.com/article/895320bde6dc589cebb628b63832c38a" }
    ],
    tags: ["Saudi Arabia", "Yemen", "Houthis", "United Nations", "Red Sea"]
  },
  {
    slug: "supreme-court-fcc-imran-khan-hospital-case",
    category: "Law",
    subcategory: "Supreme Court",
    excerpt: "The Supreme Court seeks the attorney general's help on the Federal Constitutional Court's role in Imran Khan's hospital-transfer proceedings.",
    metaTitle: "Supreme Court Seeks Clarity on FCC Role in Imran Khan Case",
    metaDescription: "Pakistan's Supreme Court seeks guidance on the FCC's jurisdiction over proceedings tied to Imran Khan's hospital treatment and adjourns for three weeks.",
    sourceName: "The Express Tribune",
    sourceUrl: "https://tribune.com.pk/story/2629609/sc-seeks-agps-assistance-on-fcc-jurisdiction-over-imran-khans-hospital-transfer-case",
    sourceImage: "https://i.tribune.com.pk/media/images/untitled-design-31760350753-0/untitled-design-31760350753-0-640x480.webp",
    imageFile: "fcc.webp",
    imageAlt: "The Supreme Court of Pakistan building illuminated at night in Islamabad",
    imageCredit: "The Express Tribune",
    imageCreditUrl: "https://tribune.com.pk/story/2629609/sc-seeks-agps-assistance-on-fcc-jurisdiction-over-imran-khans-hospital-transfer-case",
    references: [
      { name: "The Express Tribune: SC seeks assistance on FCC jurisdiction", url: "https://tribune.com.pk/story/2629609/sc-seeks-agps-assistance-on-fcc-jurisdiction-over-imran-khans-hospital-transfer-case" },
      { name: "Dunya News: SC adjourns Imran Khan hospital case", url: "https://www.dunyanews.tv/en/Pakistan/973178-sc-seeks-agps-assistance-on-fcc-jurisdiction-in-imran-khan-case" },
      { name: "Associated Press: Supreme Court's August hospital order", url: "https://apnews.com/article/043c3cbb38df2f26ebd77244c5a4eac5" }
    ],
    tags: ["Imran Khan", "Supreme Court", "Federal Constitutional Court", "Article 175-E", "Pakistan Law"]
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
  assert.deepEqual(articleIndexabilityIssues(payload), [], `${payload.slug}: indexability validation failed`);
  const structured = JSON.parse(payload.schemaMarkup);
  assert.equal(structured.author.name, author);
  assert.equal(structured.author["@type"], "Person");
  assert(structured.author.url.endsWith("/author/syeda-manal-tirmizi"));
  assert(!/\*\*|^---$|^\|/m.test(payload.content), `${payload.slug}: unsupported article formatting`);
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

async function assertRetainedMakkahArticle(session?: mongoose.ClientSession) {
  const existing = await Article.findOne({ slug: retainedMakkahSlug, ...publicArticleFilter() })
    .select("slug title author category status content canonicalUrl generationMode reviewStatus duplicateRisk")
    .session(session || null)
    .lean();
  assert(existing, "The existing Makkah drone article is no longer publicly available");
  assert.equal(existing.author, author);
  assert.equal(existing.category, "World");
  assert.deepEqual(articleIndexabilityIssues(existing), []);
  return existing;
}

async function main() {
  assert.equal(articles.length, 7);
  const previews = articles.map((item) => buildPayload(item));
  previews.forEach(validate);

  if (!process.argv.includes("--apply")) {
    console.log(JSON.stringify({
      mode: "dry-run",
      validation: "passed",
      newArticles: previews.map((item) => ({
        title: item.title,
        author: item.author,
        category: item.category,
        subcategory: item.subcategory,
        words: item.content.split(/\s+/).length,
        url: item.canonicalUrl
      })),
      duplicateRetained: `https://www.novexa.news/news/${retainedMakkahSlug}`
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
    const retained = await assertRetainedMakkahArticle();
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
        const bytes = readFileSync(resolve("exports/manal-september-16-assets", item.imageFile));
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
      await assertRetainedMakkahArticle(session);
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

    const saved = await Article.find({
      slug: { $in: payloads.map((item) => item.slug) },
      ...publicArticleFilter()
    }).lean();
    assert.equal(saved.length, articles.length, `Expected ${articles.length} new public articles after commit`);

    const report = {
      mode: "published",
      newArticles: saved.map((article) => ({
        id: String(article._id),
        title: article.title,
        author: article.author,
        category: article.category,
        subcategory: article.subcategory,
        url: article.canonicalUrl,
        image: article.image,
        publishedAt: article.publishedAt
      })),
      duplicateRetained: {
        id: String(retained._id),
        title: retained.title,
        author: retained.author,
        category: retained.category,
        url: retained.canonicalUrl
      }
    };

    mkdirSync(resolve("exports"), { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    writeFileSync(resolve("exports", `manal-september-16-publication-${timestamp}.json`), `${JSON.stringify(report, null, 2)}\n`);
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
