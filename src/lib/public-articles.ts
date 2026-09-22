import { inspectArticleContent } from "@/lib/article-quality";

type PublicArticleLike = {
  content?: string;
  title?: string;
  duplicateRisk?: number;
  generationMode?: "manual" | "ai" | "feed";
  reviewStatus?: "pending" | "approved" | "rejected" | "needs_review";
  status?: string;
};

const minimumIndexWords = Math.max(50, Number(process.env.SEO_ABSOLUTE_MIN_INDEX_WORDS || 100));
const maximumDuplicateRisk = Math.min(100, Number(process.env.FEED_MAX_DUPLICATE_RISK || 72));

const fallbackPhrases = [
  "the story falls under the",
  "this newsroom brief was automatically prepared from a monitored public feed",
  "this development is important for readers",
  "the immediate takeaway is",
  "for search visitors",
  "this story continues to attract attention",
  "is now a fuller",
  "left readers with only the basic outline",
  "the main takeaway is that",
  "without relying on a bare rss summary",
  "has rewritten the article in a clearer editorial style",
  "the story becomes a short-lived item or a continuing news thread",
  "readers who want plain language rather than a thin summary"
];

// Keep leaked ingestion copy off every discovery surface. These mirror the
// broader checks in inspectArticleContent(), but are expressed as MongoDB
// predicates so homepage/category/footer queries can reject bad rows before
// selecting card fields.
const pipelineContentPatterns = [
  "\\bRSS\\s+(?:feeds?|updates?|alerts?|reviews?|monitoring|metadata|items?|snippets?)\\b",
  "\\b(?:active|monitored|latest)\\s+RSS\\b",
  "\\b(?:story|update|item) came through the\\b",
  "\\bneeds? a human version\\b",
  "\\bneeds? a fuller treatment\\b",
  "\\bshort feed headline\\b",
  "\\bfeed summary\\b",
  "\\bnot independently verified additional details\\b",
  "\\bhuman-readable article\\b",
  "\\bbare headline\\b",
  "\\bclipped rewrite\\b",
  "\\bcame through the monitored\\b",
  "\\bis (?:one|among) (?:of )?the latest (?:items|updates|top updates) (?:found|picked up)\\b",
  "\\bfound in MongoDB\\b|\\bin MongoDB yet\\b|\\bMongoDB (?:collection|database|query|document)s?\\b"
];

const malformedExcerptPattern = "(?:^|\\s)h[1-6]:\\s";

const garbledTitlePattern = /^(Pakistan|World|Technology|Business|Sports|Politics|Health|Entertainment|Science)\s+update:/i;

export function publicArticleFilter() {
  const contentExclusions = [
    ...fallbackPhrases.map((phrase) => ({ content: { $regex: phrase, $options: "i" } })),
    ...pipelineContentPatterns.map((pattern) => ({ content: { $regex: pattern, $options: "i" } })),
    { excerpt: { $regex: malformedExcerptPattern, $options: "i" } }
  ];

  return {
    status: "published",
    reviewStatus: "approved",
    generationMode: { $in: ["manual", "ai"] },
    duplicateRisk: { $not: { $gt: maximumDuplicateRisk } },
    title: { $not: garbledTitlePattern },
    $nor: contentExclusions
  };
}

export function articleIndexabilityIssues(value: unknown) {
  const article = value as PublicArticleLike;
  const issues: string[] = [];
  if (article.status && article.status !== "published") issues.push("Article is not published");
  if (!article.generationMode || !["manual", "ai"].includes(article.generationMode)) issues.push("Generation mode is not approved for public discovery");
  if (article.reviewStatus !== "approved") issues.push("Editorial review is not approved");
  if (Number(article.duplicateRisk || 0) > maximumDuplicateRisk) issues.push("Duplicate-story risk exceeds the public threshold");
  if (garbledTitlePattern.test(article.title || "")) issues.push("Title matches a legacy auto-generated pattern");

  const normalized = String(article.content || "").toLowerCase();
  if (fallbackPhrases.some((phrase) => normalized.includes(phrase))) issues.push("Article contains legacy automation filler");
  issues.push(...inspectArticleContent(article.content || "").map((issue) => issue.message));

  const wordCount = normalized.split(/\s+/).filter(Boolean).length;
  if (wordCount < minimumIndexWords) issues.push(`Article body is extremely thin (${wordCount} words)`);

  return [...new Set(issues)];
}

export function isArticleIndexable(value: unknown) {
  return articleIndexabilityIssues(value).length === 0;
}
