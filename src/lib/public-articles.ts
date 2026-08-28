import { inspectArticleContent } from "@/lib/article-quality";

type PublicArticleLike = {
  content?: string;
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
  "this story continues to attract attention"
];

export function publicArticleFilter() {
  return {
    status: "published",
    reviewStatus: "approved",
    generationMode: { $in: ["manual", "ai"] },
    duplicateRisk: { $not: { $gt: maximumDuplicateRisk } }
  };
}

export function articleIndexabilityIssues(value: unknown) {
  const article = value as PublicArticleLike;
  const issues: string[] = [];
  if (article.status && article.status !== "published") issues.push("Article is not published");
  if (!article.generationMode || !["manual", "ai"].includes(article.generationMode)) issues.push("Generation mode is not approved for public discovery");
  if (article.reviewStatus !== "approved") issues.push("Editorial review is not approved");
  if (Number(article.duplicateRisk || 0) > maximumDuplicateRisk) issues.push("Duplicate-story risk exceeds the public threshold");

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
