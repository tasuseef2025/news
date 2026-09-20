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

const items = [
  {
    operation: "create",
    slug: "pakistan-urges-diplomacy-un-iran-sanctions-panel-veto",
    category: "World",
    subcategory: "International Diplomacy",
    excerpt: "Pakistan urges renewed diplomacy after Russia and China veto a US draft extending the UN expert panel monitoring Iran sanctions.",
    metaTitle: "Pakistan Urges Diplomacy After UN Iran Panel Veto",
    metaDescription: "Pakistan calls for Iran nuclear diplomacy after Russia and China veto a US draft extending the UN sanctions-monitoring expert panel.",
    sourceName: "Dawn",
    sourceUrl: "https://www.dawn.com/news/2030647/pakistan-abstains-in-un-vote-on-iran-sanctions-panel",
    imageFile: "iran-un.jpg",
    imageAlt: "Pakistan's UN Ambassador Asim Iftikhar Ahmad speaks from behind the Pakistan nameplate at the United Nations",
    imageCredit: "The News International / file photograph",
    imageCreditUrl: "https://www.thenews.pk/story/1393266-islamabad-urges-restraint-over-iran-amid-us-attack-threats",
    references: [
      { name: "Dawn: Pakistan abstains in UN vote on Iran sanctions panel", url: "https://www.dawn.com/news/2030647/pakistan-abstains-in-un-vote-on-iran-sanctions-panel" },
      { name: "United Nations: Iran Panel of Experts work and mandate", url: "https://main.un.org/securitycouncil/en/sanctions/1737/panel-of-experts/work-and-mandate" },
      { name: "Associated Press: Russia and China veto panel extension", url: "https://apnews.com/article/united-nations-iran-sanctions-russia-china-c509e344bc45ba87670b9a668afbbb49" },
      { name: "Pakistan Foreign Office: Islamabad MoU implementation talks", url: "https://mofa.gov.pk/press-releases/curtain-raiserhigh-level-talks-on-the-implementation-of-islamabad-memorandum-of-understanding-burgenstock-switzerland-21-june-2026" }
    ],
    tags: ["Pakistan", "Iran", "UN Security Council", "Asim Iftikhar Ahmad", "Nuclear Diplomacy"]
  },
  {
    operation: "create",
    slug: "pakistan-turkiye-review-strategic-cooperation",
    category: "Politics",
    subcategory: "Foreign Relations",
    excerpt: "Ishaq Dar and Turkish Ambassador Irfan Neziroglu review preparations for the Joint Commission and eighth strategic council session.",
    metaTitle: "Pakistan, Turkiye Review Strategic Cooperation",
    metaDescription: "Ishaq Dar and Turkish envoy Irfan Neziroglu review bilateral progress and preparations for two key Pakistan-Turkiye meetings.",
    sourceName: "Radio Pakistan",
    sourceUrl: "https://www.radio.gov.pk/18-09-2026/dar-reaffirms-pakistans-commitment-to-deepening-engagement-with-turkiye",
    imageFile: "pakistan-turkiye.jpg",
    imageAlt: "Deputy Prime Minister Ishaq Dar meets Turkish Ambassador Irfan Neziroglu in Islamabad",
    imageCredit: "Radio Pakistan / Government of Pakistan",
    imageCreditUrl: "https://www.radio.gov.pk/18-09-2026/dar-reaffirms-pakistans-commitment-to-deepening-engagement-with-turkiye",
    references: [
      { name: "Radio Pakistan: Dar meets Turkish ambassador", url: "https://www.radio.gov.pk/18-09-2026/dar-reaffirms-pakistans-commitment-to-deepening-engagement-with-turkiye" },
      { name: "Pakistan Foreign Office: Seventh HLSCC joint declaration", url: "https://mofa.gov.pk/press-releases/joint-declaration-of-the-7th-session-of-pakistan-turkiye-high-level-strategic-cooperation-council-further-deepening-diversifying-and-institutionalizing-the-strategic-partnership-2?mission=ankara" },
      { name: "Turkish Foreign Ministry: Turkiye-Pakistan relations", url: "https://www.mfa.gov.tr/turkiye-pakistan-relations.en.mfa" }
    ],
    tags: ["Pakistan", "Turkiye", "Ishaq Dar", "Irfan Neziroglu", "HLSCC"]
  },
  {
    operation: "create",
    slug: "naqvi-warns-pti-islamabad-march-ihc-ruling",
    category: "Politics",
    subcategory: "Protests and Public Order",
    excerpt: "Interior Minister Mohsin Naqvi warns PTI march organisers as the Islamabad High Court limits road occupations and use of state resources.",
    metaTitle: "Naqvi Warns PTI March Organisers After IHC Ruling",
    metaDescription: "Mohsin Naqvi warns PTI march organisers after the Islamabad High Court sets limits on road occupations and use of government resources.",
    sourceName: "Geo News",
    sourceUrl: "https://www.geo.tv/latest/682644-pti-islamabad-march-organisers-to-be-responsible-for-any-loss-of-life-warns-security-czar",
    imageFile: "mohsin-naqvi.jpg",
    imageAlt: "Interior Minister Mohsin Naqvi addresses a press conference in Islamabad",
    imageCredit: "Geo News / video screengrab",
    imageCreditUrl: "https://www.geo.tv/latest/682644-pti-islamabad-march-organisers-to-be-responsible-for-any-loss-of-life-warns-security-czar",
    references: [
      { name: "Geo News: Naqvi warns PTI march organisers", url: "https://www.geo.tv/latest/682644-pti-islamabad-march-organisers-to-be-responsible-for-any-loss-of-life-warns-security-czar" },
      { name: "Dawn: Islamabad High Court detailed judgment", url: "https://www.dawn.com/news/2030891/ihc-rules-infringement-of-fundamental-rights-breaches-constitution-ahead-of-ptis-sept-27-protest" },
      { name: "Novexa: PTI faces uncertainty over September 27 march", url: "https://www.novexa.news/news/pti-faces-uncertainty-over-september-27-islamabad-march" }
    ],
    tags: ["Mohsin Naqvi", "PTI", "Islamabad March", "Islamabad High Court", "September 27 Protest"]
  },
  {
    operation: "update",
    slug: "ji-islamabad-march-petroleum-levy",
    category: "Pakistan",
    subcategory: "Economic Protests",
    excerpt: "JI says its train march will leave Karachi on September 20 and its petroleum-levy protest will reach Islamabad on September 23 and 24.",
    metaTitle: "JI Islamabad March to Arrive September 23-24",
    metaDescription: "JI says its petroleum-levy march will start September 20 and reach Islamabad on September 23-24, while promising not to block roads.",
    sourceName: "Geo News",
    sourceUrl: "https://www.geo.tv/latest/682594-jis-long-march-to-reach-islamabad-on-sept-23-24-says-hafiz-naeem",
    imageFile: "ji-march.jpg",
    imageAlt: "Jamaat-e-Islami chief Hafiz Naeemur Rehman addresses a press conference in Islamabad",
    imageCredit: "Jamaat-e-Islami official Facebook page, via Geo News",
    imageCreditUrl: "https://www.geo.tv/latest/682594-jis-long-march-to-reach-islamabad-on-sept-23-24-says-hafiz-naeem",
    references: [
      { name: "Geo News: JI march to reach Islamabad on September 23-24", url: "https://www.geo.tv/latest/682594-jis-long-march-to-reach-islamabad-on-sept-23-24-says-hafiz-naeem" },
      { name: "Jamaat-e-Islami: September 18 march announcement", url: "https://jamaat.org/en/news/ji-proposals-could-save-rs3-4-trillion-says-hafiz-naeem-ur-rehman" },
      { name: "Geo News: Earlier government-JI talks", url: "https://www.geo.tv/latest/680464-ji-shutter-down-strike-against-petroleum-levy-gets-mixed-response-across-country" }
    ],
    tags: ["Jamaat-e-Islami", "Hafiz Naeemur Rehman", "Petroleum Levy", "Islamabad March", "Fuel Prices"]
  }
] as const;

type ExistingArticle = Record<string, any> & {
  _id: mongoose.Types.ObjectId;
  slug: string;
  author: string;
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
    assert.equal(existing.author, author, "Existing JI article has an unexpected author");
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
      const publicId = item.operation === "update" ? `${item.slug}-editorial-20260919` : item.slug;
      let uploaded: { secure_url: string };
      try {
        uploaded = await cloudinary.api.resource(`novexa-news/${publicId}`, { resource_type: "image" });
        console.log(JSON.stringify({ stage: "reusing-image", slug: item.slug }));
      } catch {
        const bytes = readFileSync(resolve("exports/manal-september-19-assets", item.imageFile));
        uploaded = await cloudinary.uploader.upload(`data:image/jpeg;base64,${bytes.toString("base64")}`, {
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
    writeFileSync(resolve("backups", `ji-islamabad-march-before-${stamp}.json`), `${JSON.stringify(existing, null, 2)}\n`);

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
            reason: "editorial-update: add confirmed September 23-24 JI arrival timetable and sourced reporting",
            createdAt: now
          }, { session });
        }
      }
    });

    const saved = await Article.find({
      slug: { $in: items.map((item) => item.slug) },
      ...publicArticleFilter()
    }).lean();
    assert.equal(saved.length, items.length, "Expected four public articles after publication");
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
    writeFileSync(resolve("exports", `manal-september-19-publication-${stamp}.json`), `${JSON.stringify(report, null, 2)}\n`);
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
