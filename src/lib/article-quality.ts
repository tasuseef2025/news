import { createHash } from "crypto";
import { cleanText } from "@/lib/content-automation";

const TRACKING_PARAMETERS = new Set([
  "at_campaign", "at_medium", "fbclid", "gclid", "mc_cid", "mc_eid", "ref", "source",
  "utm_campaign", "utm_content", "utm_medium", "utm_source", "utm_term"
]);

const GENERIC_FILLER = [
  "the story falls under the",
  "novexa news will continue",
  "editorial review is recommended",
  "the available feed detail is limited",
  "readers following public affairs",
  "what to watch next",
  "this newsroom brief was automatically prepared"
];

export type QualityAssessment = {
  approved: boolean;
  reason: string;
  reasons: string[];
  qualityScore: number;
  originalityScore: number;
  factualConfidence: number;
  duplicateRisk: number;
  wordCount: number;
};

export function normalizeSourceUrl(value = "") {
  try {
    const url = new URL(value.trim());
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (TRACKING_PARAMETERS.has(key.toLowerCase()) || key.toLowerCase().startsWith("utm_")) {
        url.searchParams.delete(key);
      }
    }
    url.hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    url.pathname = url.pathname.replace(/\/{2,}/g, "/").replace(/\/$/, "") || "/";
    url.searchParams.sort();
    return url.toString();
  } catch {
    return value.trim();
  }
}

export function contentHash(value = "") {
  return createHash("sha256").update(normalizedText(value)).digest("hex");
}

export function normalizedText(value = "") {
  return cleanText(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function significantWords(value = "") {
  const stop = new Set(["a", "an", "and", "as", "at", "by", "for", "from", "in", "is", "of", "on", "or", "the", "to", "with"]);
  return normalizedText(value).split(" ").filter((word) => word.length > 2 && !stop.has(word));
}

export function textSimilarity(left = "", right = "") {
  const leftWords = new Set(significantWords(left));
  const rightWords = new Set(significantWords(right));
  if (!leftWords.size || !rightWords.size) return 0;
  const overlap = [...leftWords].filter((word) => rightWords.has(word)).length;
  const union = new Set([...leftWords, ...rightWords]).size;
  const containment = overlap / Math.min(leftWords.size, rightWords.size);
  const jaccard = overlap / union;
  return Math.max(0, Math.min(1, containment * 0.7 + jaccard * 0.3));
}

function repeatedParagraphRatio(content = "") {
  const paragraphs = content.split(/\n+/).map(normalizedText).filter((paragraph) => paragraph.length > 40);
  if (paragraphs.length < 2) return 0;
  const unique = new Set(paragraphs);
  return (paragraphs.length - unique.size) / paragraphs.length;
}

export function assessArticleQuality(input: {
  title: string;
  content: string;
  metaDescription?: string;
  sourceTitle: string;
  sourceSummary: string;
  sourceUrl: string;
  duplicateSimilarity?: number;
  updatingExisting?: boolean;
  modelScores?: Partial<Pick<QualityAssessment, "qualityScore" | "originalityScore" | "factualConfidence" | "duplicateRisk">>;
}) {
  const words = cleanText(input.content).split(/\s+/).filter(Boolean);
  const minimumWords = Math.max(300, Number(process.env.FEED_MIN_PUBLISH_WORDS || 500));
  const reasons: string[] = [];
  const normalizedContent = normalizedText(input.content);
  const titleContentScore = textSimilarity(input.title, input.content.slice(0, 1800));
  const sourceTitleSimilarity = textSimilarity(input.title, input.sourceTitle);
  const repeatedRatio = repeatedParagraphRatio(input.content);
  const fillerMatches = GENERIC_FILLER.filter((phrase) => normalizedContent.includes(phrase));
  const duplicateRisk = Math.round(Math.max(input.duplicateSimilarity || 0, sourceTitleSimilarity * 0.45) * 100);

  if (!input.sourceUrl) reasons.push("Missing original source URL");
  if (cleanText(input.sourceSummary).length < Number(process.env.FEED_MIN_SOURCE_CHARS || 180)) reasons.push("Source metadata is too thin");
  if (words.length < minimumWords) reasons.push(`Article has ${words.length} words; minimum is ${minimumWords}`);
  if (titleContentScore < 0.22) reasons.push("Headline does not sufficiently match the article");
  if (sourceTitleSimilarity >= 0.82) reasons.push("Headline is too similar to the source headline");
  if (repeatedRatio > 0.12) reasons.push("Article repeats paragraphs");
  if (fillerMatches.length) reasons.push("Article contains generic automation filler");
  if (!input.metaDescription || cleanText(input.metaDescription).length < 120) reasons.push("Meta description is missing or too short");
  if (!input.updatingExisting && duplicateRisk >= Number(process.env.FEED_MAX_DUPLICATE_RISK || 72)) reasons.push("Duplicate-story risk is too high");

  let qualityScore = 100;
  qualityScore -= Math.max(0, minimumWords - words.length) / Math.max(1, minimumWords) * 45;
  qualityScore -= repeatedRatio * 100;
  qualityScore -= fillerMatches.length * 12;
  if (titleContentScore < 0.22) qualityScore -= 20;
  if (!input.metaDescription || cleanText(input.metaDescription).length < 120) qualityScore -= 12;

  let originalityScore = 100 - Math.round(sourceTitleSimilarity * 55) - fillerMatches.length * 10;
  let factualConfidence = cleanText(input.sourceSummary).length >= 350 ? 88 : cleanText(input.sourceSummary).length >= 180 ? 76 : 45;

  if (input.modelScores) {
    qualityScore = Math.min(qualityScore, Number(input.modelScores.qualityScore ?? 100));
    originalityScore = Math.min(originalityScore, Number(input.modelScores.originalityScore ?? 100));
    factualConfidence = Math.min(factualConfidence, Number(input.modelScores.factualConfidence ?? 100));
  }

  qualityScore = Math.max(0, Math.min(100, Math.round(qualityScore)));
  originalityScore = Math.max(0, Math.min(100, Math.round(originalityScore)));
  factualConfidence = Math.max(0, Math.min(100, Math.round(factualConfidence)));

  if (qualityScore < Number(process.env.FEED_MIN_QUALITY_SCORE || 70)) reasons.push("Quality score is below threshold");
  if (originalityScore < Number(process.env.FEED_MIN_ORIGINALITY_SCORE || 65)) reasons.push("Originality score is below threshold");
  if (factualConfidence < Number(process.env.FEED_MIN_FACTUAL_CONFIDENCE || 70)) reasons.push("Factual confidence is below threshold");

  const uniqueReasons = [...new Set(reasons)];
  return {
    approved: uniqueReasons.length === 0,
    reason: uniqueReasons.join("; ") || "Passed deterministic quality validation",
    reasons: uniqueReasons,
    qualityScore,
    originalityScore,
    factualConfidence,
    duplicateRisk,
    wordCount: words.length
  } satisfies QualityAssessment;
}
