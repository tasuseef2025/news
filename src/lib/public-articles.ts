type PublicArticleLike = {
  content?: string;
  duplicateRisk?: number;
  generationMode?: "manual" | "ai" | "feed";
  reviewStatus?: "pending" | "approved" | "rejected" | "needs_review";
  status?: string;
};

const minimumIndexWords = Math.max(300, Number(process.env.SEO_MIN_INDEX_WORDS || 500));
const minimumListingCharacters = Math.max(1800, Number(process.env.SEO_MIN_LISTING_CHARACTERS || 2400));
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
    reviewStatus: { $nin: ["pending", "rejected", "needs_review"] },
    generationMode: { $in: ["manual", "ai"] },
    duplicateRisk: { $not: { $gt: maximumDuplicateRisk } },
    $expr: {
      $gte: [
        { $strLenCP: { $ifNull: ["$content", ""] } },
        minimumListingCharacters
      ]
    }
  };
}

export function isArticleIndexable(value: unknown) {
  const article = value as PublicArticleLike;
  if (article.status && article.status !== "published") return false;
  if (!article.generationMode || !["manual", "ai"].includes(article.generationMode)) return false;
  if (["pending", "rejected", "needs_review"].includes(article.reviewStatus || "")) return false;
  if (Number(article.duplicateRisk || 0) > maximumDuplicateRisk) return false;

  const normalized = String(article.content || "").toLowerCase();
  if (fallbackPhrases.some((phrase) => normalized.includes(phrase))) return false;

  return normalized.split(/\s+/).filter(Boolean).length >= minimumIndexWords;
}
