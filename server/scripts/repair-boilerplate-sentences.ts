import "dotenv/config";
import { mkdirSync, writeFileSync } from "fs";
import { resolve } from "path";
import mongoose from "mongoose";
import { pipelineBoilerplateMatches } from "../../src/lib/article-quality";
import { publicArticleFilter } from "../../src/lib/public-articles";

/**
 * Removes leaked publishing-pipeline language from live articles, in place.
 *
 * Three passes, in order of how much they destroy:
 *
 *   1. Rewrite the attribution. Most leaked sentences carry real reporting and
 *      only name the wrong source ("The feed summary also notes concern about
 *      parasites capable of infecting humans"). Renaming keeps the fact.
 *   2. Delete what is left. A sentence still matching after pass 1 is pure
 *      meta-commentary ("A fresh RSS update gives the first reliable signal")
 *      and carries no reporting.
 *   3. Refuse the "<headline> is among the latest top updates found in Novexa
 *      News' active RSS feeds" construction, where the boilerplate IS the
 *      article's opening sentence. Deleting it would strip the lede, so these
 *      are reported for a human rewrite and left untouched.
 *
 * An article is written only if the result is completely clean, still long
 * enough, and still starts like a sentence. Anything else is reported in full,
 * never half-repaired.
 *
 * Dry run by default. Pass --apply to write.
 */

const REWRITES: Array<[RegExp, string]> = [
  [/\bthe research described in the feed summary\b/gi, "the research"],
  // "the list" would break agreement in "The names ... show the scale".
  [/\bthe names in the feed summary\b/gi, "the names listed"],
  [/\ba short alert or feed summary\b/gi, "a short alert"],
  [/\b(?:the )?feed summary(?:['’]s)?\b/gi, "the source report"],
  // "Express Tribune's Technology RSS item said NADRA had begun..." carries real
  // reporting; only the transport is wrong. Keep the publisher and the fact.
  // The [?] handles a mojibake apostrophe present in some rows.
  // Possessive form: "Express Tribune's Technology RSS item said", and
  // "Express Tribune?s latest RSS item said" (lowercase section word).
  [/\b([A-Z][\w’']+(?:\s[A-Z][\w’']+)*)['’?]s(?:\s[\w’']+)?\sRSS item said\b/g, "$1 reported"],
  // Bare form: "The Guardian World RSS item said".
  [/\b([A-Z][\w’']+(?:\s[A-Z][\w’']+)*)\sRSS item said\b/g, "$1 reported"],
  [/\b([A-Z][\w'’]+)['’]s RSS feed\b/g, "$1"],
  [/\bthe RSS metadata provided\b/gi, "the source material"],
  [/\bRSS metadata\b/gi, "source material"],
  [/\ba short RSS item\b/gi, "an early report"],
  [/\bfresh RSS items\b/gi, "early reports"],
  [/\ba fresh RSS update\b/gi, "an early report"],
  [/\bearly RSS alerts\b/gi, "early reports"],
  [/\bthe RSS item\b/gi, "the source report"],
  [/\bthe short feed headline\b/gi, "the original headline"],
  [/\bthe latest RSS (?:review|monitoring)\b/gi, "the source report"],
  [/\bthe monitored RSS feeds\b/gi, "the source report"],
  [/\bRSS feeds?\b/gi, "news feeds"]
];

/**
 * Phrases this script introduces. A rewrite can land at the start of a sentence
 * ("The feed summary says" -> "the source report says"), so only these known
 * openers are re-capitalised — a blanket rule would also "fix" words that are
 * lowercase on purpose, such as iPhone.
 */
const INTRODUCED = [
  "the source report", "the source material", "the research", "the names listed",
  "an early report", "early reports", "news feeds", "the original headline", "a short alert"
];

function restoreSentenceCase(text: string) {
  const alternatives = INTRODUCED.map((phrase) => phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const pattern = new RegExp(`(^|[.!?]["'”’)]?\\s+|\\n\\s*)(${alternatives})\\b`, "g");
  return text.replace(pattern, (_match, lead: string, phrase: string) => `${lead}${phrase.charAt(0).toUpperCase()}${phrase.slice(1)}`);
}

function applyRewrites(text: string) {
  let out = text;
  for (const [pattern, replacement] of REWRITES) out = out.replace(pattern, replacement);
  // Rewrites can leave a doubled article ("the the source report").
  out = out.replace(/\bthe the\b/gi, "the").replace(/[ \t]{2,}/g, " ");
  return restoreSentenceCase(out);
}

// The boilerplate here doubles as the lede; removing it needs a real rewrite.
const UNSAFE = /\bis (?:one|among) (?:of )?the latest (?:items|updates|top updates) (?:found|picked up)/i;

const MIN_WORDS = Math.max(50, Number(process.env.SEO_ABSOLUTE_MIN_INDEX_WORDS || 100));
const FIELDS = ["content", "excerpt", "metaDescription"] as const;

type Doc = {
  _id: mongoose.Types.ObjectId;
  slug?: string;
  title?: string;
  content?: string;
  excerpt?: string;
  metaDescription?: string;
};

const flag = (name: string) => process.argv.includes(`--${name}`);
const wordCount = (text: string) => text.split(/\s+/).filter(Boolean).length;

/** Split on sentence ends, keeping paragraph breaks intact. */
function splitSentences(text: string) {
  return text.split(/(?<=[.!?])(?=\s)/);
}

function repairText(original: string) {
  if (!original) return { text: original, removed: [] as string[], rewritten: false, unsafe: false };

  const text = applyRewrites(original);
  const rewritten = text !== original;
  const removed: string[] = [];
  let unsafe = false;

  const paragraphs = text.split(/\n{2,}/).map((paragraph) => {
    const kept = splitSentences(paragraph).filter((sentence) => {
      if (!pipelineBoilerplateMatches(sentence).length) return true;
      if (UNSAFE.test(sentence)) {
        unsafe = true;
        return true; // leave it; this one needs a human
      }
      removed.push(sentence.trim());
      return false;
    });
    return kept.join("").replace(/[ \t]{2,}/g, " ").trim();
  });

  return { text: paragraphs.filter(Boolean).join("\n\n"), removed, rewritten, unsafe };
}

async function run() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not configured");
  const apply = flag("apply");

  await mongoose.connect(process.env.MONGODB_URI, { dbName: "news_website", bufferCommands: false });
  const col = mongoose.connection.db.collection<Doc>("articles");

  const docs = await col
    .find({ ...publicArticleFilter() })
    .project<Doc>({ slug: 1, title: 1, content: 1, excerpt: 1, metaDescription: 1 })
    .toArray();

  const repaired: Array<{ doc: Doc; update: Record<string, string>; removed: string[]; rewritten: boolean }> = [];
  const needsHuman: Array<{ doc: Doc; reason: string }> = [];
  let untouched = 0;

  for (const doc of docs) {
    if (!FIELDS.some((field) => pipelineBoilerplateMatches(String(doc[field] || "")).length > 0)) {
      untouched++;
      continue;
    }

    const update: Record<string, string> = {};
    const removed: string[] = [];
    let unsafe = false;
    let rewritten = false;

    for (const field of FIELDS) {
      const original = String(doc[field] || "");
      if (!pipelineBoilerplateMatches(original).length) continue;
      const result = repairText(original);
      unsafe = unsafe || result.unsafe;
      rewritten = rewritten || result.rewritten;
      removed.push(...result.removed);
      if (result.text !== original) update[field] = result.text;
    }

    // Every acceptance condition, checked against the repaired text.
    const merged = { ...doc, ...update } as Doc;
    const body = String(merged.content || "").trim();
    const stillLeaking = FIELDS.some((field) => pipelineBoilerplateMatches(String(merged[field] || "")).length > 0);

    if (unsafe || stillLeaking) {
      needsHuman.push({ doc, reason: unsafe ? "boilerplate is the article's lede - needs a rewrite" : "boilerplate survived repair" });
      continue;
    }
    if (wordCount(body) < MIN_WORDS) {
      needsHuman.push({ doc, reason: `body would fall to ${wordCount(body)} words, under the ${MIN_WORDS} minimum` });
      continue;
    }
    if (!/^[A-Z"'“‘]/.test(body)) {
      needsHuman.push({ doc, reason: "body would no longer start like a sentence" });
      continue;
    }
    if (String(merged.excerpt || "").trim().length < 80) {
      needsHuman.push({ doc, reason: "excerpt would be left too thin" });
      continue;
    }
    if (!Object.keys(update).length) {
      untouched++;
      continue;
    }

    repaired.push({ doc, update, removed, rewritten });
  }

  console.log("=".repeat(76));
  console.log(apply ? "MODE: APPLY (writes to MongoDB)" : "MODE: DRY RUN (no writes)");
  console.log("=".repeat(76));
  console.log(`public articles scanned : ${docs.length}`);
  console.log(`already clean           : ${untouched}`);
  console.log(`repairable cleanly      : ${repaired.length}`);
  console.log(`need a human rewrite    : ${needsHuman.length}`);
  console.log(`attributions rewritten  : ${repaired.filter((item) => item.rewritten).length}`);
  console.log(`sentences deleted       : ${repaired.reduce((total, item) => total + item.removed.length, 0)}`);

  if (needsHuman.length) {
    console.log("\nreasons articles need a human:");
    const reasons = new Map<string, number>();
    for (const item of needsHuman) reasons.set(item.reason, (reasons.get(item.reason) || 0) + 1);
    for (const [reason, count] of [...reasons.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${String(count).padStart(4)}  ${reason}`);
  }

  console.log("\nsample repairs:");
  for (const item of repaired.slice(0, 5)) {
    console.log(`\n  /news/${item.doc.slug}`);
    const field = Object.keys(item.update)[0];
    const before = String((item.doc as unknown as Record<string, string>)[field] || "");
    const marker = before.search(/RSS|feed summary/i);
    if (marker >= 0) {
      console.log(`    before: …${before.slice(Math.max(0, marker - 60), marker + 130).replace(/\s+/g, " ").trim()}…`);
      const after = item.update[field];
      const spot = Math.max(0, Math.min(after.length - 1, marker - 60));
      console.log(`    after : …${after.slice(spot, spot + 190).replace(/\s+/g, " ").trim()}…`);
    }
    for (const sentence of item.removed.slice(0, 1)) console.log(`    deleted: "${sentence.replace(/\s+/g, " ").slice(0, 120)}"`);
  }

  mkdirSync(resolve(process.cwd(), "exports"), { recursive: true });
  const reportPath = resolve(process.cwd(), `exports/repair-${apply ? "applied" : "dryrun"}-${Date.now()}.json`);
  writeFileSync(reportPath, JSON.stringify({
    generatedAt: new Date().toISOString(),
    mode: apply ? "apply" : "dry-run",
    repaired: repaired.map((item) => ({
      id: String(item.doc._id),
      slug: item.doc.slug,
      title: item.doc.title,
      deletedSentences: item.removed,
      before: Object.fromEntries(Object.keys(item.update).map((field) => [field, String((item.doc as unknown as Record<string, string>)[field] || "")])),
      after: item.update
    })),
    needsHumanRewrite: needsHuman.map((item) => ({ id: String(item.doc._id), slug: item.doc.slug, title: item.doc.title, reason: item.reason }))
  }, null, 2));
  console.log(`\nfull before/after report: ${reportPath}`);

  if (!apply) {
    console.log("\nDry run only. Nothing was written. Re-run with --apply to repair.");
    await mongoose.disconnect();
    return;
  }

  let modified = 0;
  for (const item of repaired) {
    // contentUpdatedAt is set explicitly: this genuinely changes reader-visible
    // copy, and a bulk update cannot trigger the model's pre-save hook.
    const result = await col.updateOne({ _id: item.doc._id }, { $set: { ...item.update, contentUpdatedAt: new Date() } });
    modified += result.modifiedCount;
  }

  console.log(`\nrepaired ${modified} articles in place.`);
  console.log(`${needsHuman.length} articles still contain boilerplate; they are listed in the report as needing a rewrite.`);

  await mongoose.disconnect();
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}).finally(() => mongoose.disconnect());
