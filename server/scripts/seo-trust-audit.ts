import "dotenv/config";
import mongoose from "mongoose";

/** Read-only investigation for the SEO/trust audit. Performs no writes. */

const LEAK_PATTERNS: Array<{ label: string; regex: RegExp }> = [
  { label: "active RSS feeds", regex: /active RSS feeds/i },
  { label: "monitored RSS feeds", regex: /monitored RSS feeds/i },
  { label: "human-readable article", regex: /human-readable article/i },
  { label: "MongoDB", regex: /MongoDB/i }
];

const TRAILING_STOPWORDS = [
  "of", "the", "is", "and", "to", "in", "for", "on", "at", "with", "by",
  "from", "as", "a", "an", "or", "but", "that", "this", "its", "it", "was",
  "were", "has", "have", "will", "after", "before", "over", "under", "into"
];

function fields(doc: Record<string, unknown>) {
  return {
    title: String(doc.title || ""),
    excerpt: String(doc.excerpt || ""),
    content: String(doc.content || "")
  };
}

/** "h2:" that is NOT at the start of a block, so the renderer prints it literally. */
function inlineH2Count(content: string) {
  return content
    .split(/\n+/)
    .filter((block) => {
      const trimmed = block.trim();
      if (!trimmed) return false;
      const withoutLeading = trimmed.replace(/^(h2:|h3:|##\s+|###\s+)/i, "");
      return /\bh[23]:/i.test(withoutLeading);
    }).length;
}

function looksTruncated(title: string) {
  const clean = title.trim().replace(/[\s.,;:!?-]+$/, "");
  if (!clean) return false;
  const last = clean.split(/\s+/).pop()?.toLowerCase() || "";
  if (TRAILING_STOPWORDS.includes(last)) return true;
  if (/[a-z],$/i.test(title.trim())) return true;
  return false;
}

async function run() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not configured");
  await mongoose.connect(process.env.MONGODB_URI, { dbName: "news_website", bufferCommands: false });
  const col = mongoose.connection.db.collection("articles");

  const published = await col
    .find({ status: "published" })
    .project({ title: 1, slug: 1, excerpt: 1, content: 1, category: 1, reviewStatus: 1, generationMode: 1, publishedAt: 1 })
    .toArray();

  console.log("=".repeat(78));
  console.log("PUBLISHED ARTICLES:", published.length);
  console.log("=".repeat(78));

  // ---- Q2 leaked boilerplate -------------------------------------------------
  console.log("\n## Q2 LEAKED BOILERPLATE\n");
  for (const pattern of LEAK_PATTERNS) {
    const hits = published.filter((doc) => {
      const f = fields(doc);
      return pattern.regex.test(f.title) || pattern.regex.test(f.excerpt) || pattern.regex.test(f.content);
    });
    const inTitle = hits.filter((doc) => pattern.regex.test(String(doc.title || ""))).length;
    const inExcerpt = hits.filter((doc) => pattern.regex.test(String(doc.excerpt || ""))).length;
    const inBody = hits.filter((doc) => pattern.regex.test(String(doc.content || ""))).length;

    console.log(`"${pattern.label}": ${hits.length} published articles  (title=${inTitle} excerpt=${inExcerpt} body=${inBody})`);
    for (const doc of hits.slice(0, 3)) {
      const f = fields(doc);
      const where = pattern.regex.test(f.title) ? f.title : pattern.regex.test(f.excerpt) ? f.excerpt : f.content;
      const index = where.search(pattern.regex);
      console.log(`   - /news/${doc.slug}`);
      console.log(`     ...${where.slice(Math.max(0, index - 90), index + 130).replace(/\s+/g, " ")}...`);
    }
    console.log("");
  }

  const h2Hits = published.filter((doc) => inlineH2Count(String(doc.content || "")) > 0);
  console.log(`literal "h2:" inside a paragraph: ${h2Hits.length} published articles`);
  for (const doc of h2Hits.slice(0, 3)) {
    const content = String(doc.content || "");
    const index = content.search(/\bh[23]:/i);
    console.log(`   - /news/${doc.slug}`);
    console.log(`     ...${content.slice(Math.max(0, index - 90), index + 130).replace(/\s+/g, " ")}...`);
  }

  // ---- Q3 truncated headlines ------------------------------------------------
  console.log("\n## Q3 TRUNCATED HEADLINES\n");
  const truncated = published.filter((doc) => looksTruncated(String(doc.title || "")));
  console.log(`titles ending mid-sentence: ${truncated.length} of ${published.length}`);
  for (const doc of truncated.slice(0, 12)) {
    console.log(`   - "${doc.title}"`);
    console.log(`     /news/${doc.slug}`);
  }

  const lengths = published.map((doc) => String(doc.title || "").length);
  const atCap = lengths.filter((len) => len >= 88 && len <= 96).length;
  console.log(`\ntitles 88-96 chars (near the 90/95 truncation caps): ${atCap}`);

  // ---- Q6 category counts ----------------------------------------------------
  console.log("\n## Q6 CATEGORY COUNTS (published)\n");
  const byCategory = new Map<string, number>();
  for (const doc of published) {
    const key = String(doc.category || "(none)");
    byCategory.set(key, (byCategory.get(key) || 0) + 1);
  }
  const sorted = [...byCategory].sort((a, b) => b[1] - a[1]);
  for (const [category, count] of sorted) {
    console.log(`   ${String(count).padStart(5)}  ${category}${count < 2 ? "   <-- thin, excluded from sitemap" : ""}`);
  }
  console.log(`\n   distinct categories: ${sorted.length}`);
  console.log(`   categories with <2 published: ${sorted.filter(([, count]) => count < 2).length}`);

  // ---- Indexability reality check -------------------------------------------
  console.log("\n## INDEXABILITY OF PUBLISHED SET\n");
  const minChars = Math.max(1800, Number(process.env.SEO_MIN_LISTING_CHARACTERS || 2400));
  const tooShort = published.filter((doc) => String(doc.content || "").length < minChars).length;
  const badMode = published.filter((doc) => !["manual", "ai"].includes(String(doc.generationMode || ""))).length;
  const badReview = published.filter((doc) => ["pending", "rejected", "needs_review"].includes(String(doc.reviewStatus || ""))).length;
  console.log(`   published but under ${minChars} chars: ${tooShort}`);
  console.log(`   published but generationMode not manual/ai: ${badMode}`);
  console.log(`   published but reviewStatus pending/rejected/needs_review: ${badReview}`);

  await mongoose.disconnect();
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}).finally(() => mongoose.disconnect());
