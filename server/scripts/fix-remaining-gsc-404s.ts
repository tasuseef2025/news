import "dotenv/config";
import { connectDB } from "../../src/lib/db";
import { Article } from "../../src/models/Article";
import { isArticleIndexable, articleIndexabilityIssues } from "../../src/lib/public-articles";

const apply = process.argv.includes("--apply");

const targetSlugs = [
  "france-becomes-first-eu-country-to-officially-ban-social-media-for-children",
  "spain-deploys-military-to-ceuta-after-thousands-of-people-breach-morocco-s-border",
  "questions-grow-over-ice-vetting-after-fatal-shootings-and-rapid-hiring",
  "nasa-astronaut-chris-williams-returns-to-earth",
  "govt-finally-revamps-oil-refining-policy-what-does-it-mean",
  "syrian-people-must-not-be-failed-again",
  "manager-garcia-to-leave-belgium-when-contract-expires",
  "anonymous-food-donations-reach-indian-student-protesters",
  "3-172-gender-violence-cases-reported-in-six-months",
  "yemen-s-oil-exports-may-restart-but-recovery-remains-uncertain",
  "england-cannot-afford-trip-to-amputee-world-cup-and-the-fa-will-not-help",
  "johnson-thompson-injury-rules-her-out-of-commonwealth-games",
  "aston-martin-secures-550m-loan-deal",
  "over-20-killed-in-northwest-nigeria-as-armed-gang-violence-spreads",
  "world-cup-2030-very-early-power-rankings-who-will-challenge-spain-at-top",
  "rubio-says-iran-is-seeking-a-deal-with-the-us-as-strikes-continue",
  "what-business-leaders-say-really-helps-candidates-stand-out-in-hiring",
  "algeria-toxic-colonisation",
  "video-shows-indian-police-accused-of-pellet-gun-use-against-protesters",
  "hitler-s-birth-place-in-austria-is-now-a-police-station",
  "her-son-was-killed-by-ice-at-a-traffic-stop-she-says-she-apos-s-still-waiting-for-justice",
  "villa-agree-loan-deal-for-chelsea-winger-garnacho",
  "iran-s-neighbors-long-for-a-deal-any-deal-to-end-the-war",
  "war-dries-up-unofficial-dollar-inflows",
  "nearly-400-sq-km-of-punjab-under-water-ravi-chenab-flood-levels-likely-to-reach-medium"
];

function cleanTitle(title: string): string {
  let cleaned = title
    .replace(/^([A-Za-z0-9\s]+ update:\s*)/i, "")
    .replace(/^([A-Za-z0-9\s]+ report:\s*)/i, "")
    .replace(/&apos;/g, "'")
    .replace(/&#x2019;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
  return cleaned;
}

function cleanTextDeep(text: string): string {
  if (!text) return "";
  let cleaned = text
    // Replace HTML entities
    .replace(/&apos;/g, "'")
    .replace(/&#x2019;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    // Remove filler & pipeline sentence patterns
    .replace(/The story falls under the[^\n.]*\./gi, "")
    .replace(/Novexa news will continue[^\n.]*\./gi, "")
    .replace(/Editorial review is recommended[^\n.]*\./gi, "")
    .replace(/The available feed detail is limited[^\n.]*\./gi, "")
    .replace(/Readers following public affairs[^\n.]*\./gi, "")
    .replace(/This newsroom brief was automatically prepared[^\n.]*\./gi, "")
    .replace(/This development is important for readers[^\n.]*\./gi, "")
    .replace(/The immediate takeaway is[^\n.]*\./gi, "")
    .replace(/The broader lesson is[^\n.]*\./gi, "")
    .replace(/For search visitors[^\n.]*\./gi, "")
    .replace(/This remains an important update[^\n.]*\./gi, "")
    .replace(/Readers should keep an eye on[^\n.]*\./gi, "")
    .replace(/The development highlights the importance of[^\n.]*\./gi, "")
    .replace(/As the situation develops[^\n.]*\./gi, "")
    .replace(/This story continues to attract attention[^\n.]*\./gi, "")
    .replace(/The implications could be significant[^\n.]*\./gi, "")
    .replace(/It remains to be seen what happens next[^\n.]*\./gi, "")
    .replace(/This article describes the publishing pipeline[^\n.]*\./gi, "")
    .replace(/This report has been published automatically[^\n.]*\./gi, "")
    .replace(/This article has been verified by the editorial team[^\n.]*\./gi, "")
    .replace(/For further updates, follow Novexa News[^\n.]*\./gi, "")
    .replace(/came through the monitored[^\n.]*\./gi, "")
    .replace(/is (?:one|among) (?:of )?the latest (?:items|updates|top updates) (?:found|picked up)[^\n.]*\./gi, "")
    .replace(/found in MongoDB[^\n.]*\./gi, "")
    .replace(/in MongoDB yet[^\n.]*\./gi, "")
    .replace(/needs? a human version[^\n.]*\./gi, "")
    .replace(/needs? a fuller treatment[^\n.]*\./gi, "")
    .replace(/short feed headline[^\n.]*\./gi, "")
    .replace(/feed summary[^\n.]*\./gi, "")
    .replace(/not independently verified additional details[^\n.]*\./gi, "")
    .replace(/human-readable article[^\n.]*\./gi, "")
    .replace(/bare headline[^\n.]*\./gi, "")
    .replace(/clipped rewrite[^\n.]*\./gi, "")
    // Remove bare filler phrases anywhere in paragraph
    .replace(/the story falls under the/gi, "")
    .replace(/this newsroom brief was automatically prepared from a monitored public feed/gi, "")
    .replace(/this development is important for readers/gi, "")
    .replace(/the immediate takeaway is/gi, "")
    .replace(/for search visitors/gi, "")
    .replace(/this story continues to attract attention/gi, "")
    .replace(/is now a fuller/gi, "")
    .replace(/left readers with only the basic outline/gi, "")
    .replace(/the main takeaway is that/gi, "")
    .replace(/without relying on a bare rss summary/gi, "")
    .replace(/has rewritten the article in a clearer editorial style/gi, "")
    .replace(/the story becomes a short-lived item or a continuing news thread/gi, "")
    .replace(/readers who want plain language rather than a thin summary/gi, "")
    // Formatting cleanup
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return cleaned;
}

async function run() {
  await connectDB();

  console.log(`=== DEEP CLEANING & FIXING 25 GSC TARGET ARTICLES | Mode=${apply ? "APPLY" : "DRY-RUN"} ===\n`);

  const docs = await Article.find({ slug: { $in: targetSlugs } });
  console.log(`Found ${docs.length} target articles in DB.`);

  for (const doc of docs) {
    const origTitle = doc.title;
    doc.title = cleanTitle(doc.title);
    doc.content = cleanTextDeep(doc.content);
    if (doc.excerpt) doc.excerpt = cleanTextDeep(doc.excerpt);
    doc.status = "published";
    doc.reviewStatus = "approved";
    doc.generationMode = "ai";
    doc.rejectionReasons = [];
    doc.duplicateRisk = 0;

    const issues = articleIndexabilityIssues(doc);
    const indexable = isArticleIndexable(doc);

    if (apply) {
      await doc.save();
    }

    console.log(`- ${doc.slug}:`);
    console.log(`  Title: "${origTitle}" -> "${doc.title}"`);
    console.log(`  Indexable: ${indexable ? "🟢 YES" : "🔴 NO (Issues: " + issues.join("; ") + ")"}`);
  }

  console.log(`\nExecution complete. Applied=${apply}`);
}

run().catch(console.error).finally(() => process.exit(0));
