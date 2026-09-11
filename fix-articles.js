/**
 * fix-articles.js
 *
 * Bulk-cleans templated boilerplate/disclaimer text out of article bodies
 * stored in MongoDB, pulls source attribution into its own structured field,
 * and flags thin/scraped articles that still need a real editorial rewrite.
 *
 * WHAT THIS SCRIPT DOES:
 *   1. Connects to your MongoDB.
 *   2. Scans every document in the articles collection.
 *   3. Strips out repeated disclaimer/boilerplate paragraphs from the body text.
 *   4. Extracts "Source: X - url" / "Image credit: ..." lines into their own
 *      fields (sourceName, sourceUrl, imageCredit) instead of leaving them
 *      inline as body copy.
 *   5. Flags articles that are still too short / too close to a pure rewrite
 *      so you know which ones need a human (or an LLM-assisted rewrite pass)
 *      to add real original value.
 *   6. Runs in DRY RUN mode by default, it will only print what it *would*
 *      change until you pass --apply.
 *
 * USAGE:
 *   npm install mongodb
 *   node fix-articles.js                # dry run, prints a report
 *   node fix-articles.js --apply        # actually writes the changes
 *   node fix-articles.js --apply --limit=50   # only touch the first 50 docs
 *
 * ---------------------------------------------------------------------------
 * CONFIG - edit these to match your actual setup
 * ---------------------------------------------------------------------------
 */
require("dotenv").config();

const CONFIG = {
  // Your MongoDB connection string. Prefer reading this from an env var
  // rather than hardcoding it, e.g.: process.env.MONGODB_URI
  uri: process.env.MONGODB_URI || "mongodb://localhost:27017",

  // Leave unset unless you need to override the database name embedded in
  // MONGODB_URI itself - passing undefined to client.db() below makes the
  // driver use whatever database the connection string already points to.
  dbName: process.env.MONGODB_DB || undefined,

  // The collection holding your articles
  collectionName: "articles",

  // Field name mappings - change these to match your schema
  fields: {
    title: "title",
    body: "content",        // the main article HTML/text field
    sourceName: "sourceName",   // will be created if it doesn't exist
    sourceUrl: "sourceUrl",     // will be created if it doesn't exist
    imageCredit: "imageCredit", // will be created if it doesn't exist
    wordCount: "wordCount",     // optional, informational only
  },

  // Word-count threshold below which an article gets flagged as "needs rewrite"
  thinContentWordThreshold: 220,
};

// ---------------------------------------------------------------------------
// Known boilerplate patterns found across Novexa articles.
// Each is a regex; matches are removed from the body entirely.
// Add more patterns here as you spot other repeated templates.
// ---------------------------------------------------------------------------
const BOILERPLATE_PATTERNS = [
  /Novexa News is presenting the core available details in original wording[^.]*\.\s*(As more confirmed information becomes available[^.]*\.)?/gi,
  /This report is based on a monitored public feed[^.]*\.\s*/gi,
  /The available feed detail is limited, so this report stays close to confirmed information[^.]*\.\s*/gi,
  /No further details about[^.]*were included in the feed information[^.]*\.\s*/gi,
  /Novexa News will continue watching for official statements[^.]*\.\s*/gi,
  /is among the latest updates being followed by Novexa News from [^.]*\.\s*/gi,
  /is one of the latest updates being tracked by Novexa News from [^.]*\.\s*/gi,
  /The story falls under the [A-Za-z ]+ desk and is being treated as a developing update based on verified feed metadata\.\s*/gi,
  /The story falls under the [A-Za-z ]+ desk and may matter to readers following[^.]*\.\s*/gi,
];

// Extracts "Source: NAME - URL" and "Image credit: ... - URL" lines
const SOURCE_LINE_REGEX = /Source:\s*([^-\n]+?)\s*-\s*(https?:\/\/\S+)/i;
const IMAGE_CREDIT_REGEX = /Image credit:\s*([^-\n]+?)\s*-\s*(https?:\/\/\S+)/i;

function stripBoilerplate(text) {
  let cleaned = text;
  let matched = false;
  for (const pattern of BOILERPLATE_PATTERNS) {
    const before = cleaned;
    cleaned = cleaned.replace(pattern, " ");
    if (cleaned !== before) matched = true;
  }
  // Only collapse whitespace (and thus report a change) when a pattern
  // actually matched - otherwise plenty of untouched articles with benign
  // double spaces or extra newlines get flagged as "changed" for no reason.
  if (matched) cleaned = cleaned.replace(/\s{2,}/g, " ").trim();
  return { cleaned, matched };
}

function extractSource(text) {
  const match = text.match(SOURCE_LINE_REGEX);
  if (!match) return null;
  return { name: match[1].trim(), url: match[2].trim(), fullMatch: match[0] };
}

function extractImageCredit(text) {
  const match = text.match(IMAGE_CREDIT_REGEX);
  if (!match) return null;
  return { credit: match[1].trim(), url: match[2].trim(), fullMatch: match[0] };
}

function wordCount(text) {
  return text.split(/\s+/).filter(Boolean).length;
}

async function main() {
  const { MongoClient } = require("mongodb");

  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const limitArg = args.find((a) => a.startsWith("--limit="));
  const limit = limitArg ? parseInt(limitArg.split("=")[1], 10) : 0;

  console.log(`Mode: ${apply ? "APPLY (writing changes)" : "DRY RUN (no writes)"}`);
  if (limit) console.log(`Limit: ${limit} documents`);

  const client = new MongoClient(CONFIG.uri);
  await client.connect();
  const db = client.db(CONFIG.dbName);
  const collection = db.collection(CONFIG.collectionName);

  const cursor = limit
    ? collection.find({}).limit(limit)
    : collection.find({});

  let scanned = 0;
  let changed = 0;
  let flaggedThin = 0;
  const bulkOps = [];
  const thinArticleIds = [];

  for await (const doc of cursor) {
    scanned++;
    const f = CONFIG.fields;
    const originalBody = doc[f.body];
    if (!originalBody || typeof originalBody !== "string") continue;

    const sourceInfo = extractSource(originalBody);
    const imageInfo = extractImageCredit(originalBody);

    const stripped = stripBoilerplate(originalBody);
    let cleanedBody = stripped.cleaned;
    let bodyChanged = stripped.matched;
    if (sourceInfo) {
      cleanedBody = cleanedBody.replace(sourceInfo.fullMatch, "").trim();
      bodyChanged = true;
    }
    if (imageInfo) {
      cleanedBody = cleanedBody.replace(imageInfo.fullMatch, "").trim();
      bodyChanged = true;
    }
    if (bodyChanged) cleanedBody = cleanedBody.replace(/\s{2,}/g, " ").trim();

    // Word count is always computed on the cleaned text so the thin-content
    // flag reflects real content length even for docs with no boilerplate.
    const wc = wordCount(cleanedBody);
    const isThin = wc < CONFIG.thinContentWordThreshold;
    if (isThin) {
      flaggedThin++;
      thinArticleIds.push({ id: doc._id, title: doc[f.title], words: wc });
    }

    if (bodyChanged) {
      changed++;
      const setFields = {};
      if (bodyChanged) setFields[f.body] = cleanedBody;
      if (sourceInfo) {
        setFields[f.sourceName] = sourceInfo.name;
        setFields[f.sourceUrl] = sourceInfo.url;
      }
      if (imageInfo) {
        setFields[f.imageCredit] = imageInfo.credit;
      }
      setFields[f.wordCount] = wc;
      setFields.needsRewrite = isThin;

      bulkOps.push({
        updateOne: {
          filter: { _id: doc._id },
          update: { $set: setFields },
        },
      });
    }
  }

  console.log(`\nScanned: ${scanned}`);
  console.log(`Docs with boilerplate/source lines to clean: ${changed}`);
  console.log(`Docs flagged as thin (< ${CONFIG.thinContentWordThreshold} words after cleaning): ${flaggedThin}`);

  if (thinArticleIds.length) {
    console.log(`\nSample of thin articles needing a real rewrite pass:`);
    thinArticleIds.slice(0, 15).forEach((a) =>
      console.log(`  - [${a.words}w] ${a.title} (_id: ${a.id})`)
    );
    if (thinArticleIds.length > 15) {
      console.log(`  ...and ${thinArticleIds.length - 15} more`);
    }
  }

  if (apply && bulkOps.length) {
    console.log(`\nWriting ${bulkOps.length} updates...`);
    const result = await collection.bulkWrite(bulkOps, { ordered: false });
    console.log(`Modified: ${result.modifiedCount}`);
  } else if (!apply) {
    console.log(`\nDry run only, re-run with --apply to write these changes.`);
  }

  await client.close();
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
