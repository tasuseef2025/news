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
  "this newsroom brief was automatically prepared",
  "this development is important for readers",
  "the immediate takeaway is",
  "the broader lesson is",
  "for search visitors",
  "this remains an important update",
  "readers should keep an eye on",
  "the development highlights the importance of",
  "as the situation develops",
  "this story continues to attract attention",
  "the implications could be significant",
  "it remains to be seen what happens next"
];

const PROMPT_LEAKAGE_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
  { label: "search-term instructions", pattern: /\b(?:natural|target|primary|secondary) search (?:term|terms|query|queries|keyword|keywords)\b/i },
  { label: "search-engine instructions", pattern: /\b(?:this|the) (?:article|page|content|headline) (?:is|was|has been) optimized (?:for|to)\b/i },
  { label: "ranking instructions", pattern: /\b(?:for|to improve) (?:ranking|rankings|indexing|search visibility|google visibility)\b/i },
  { label: "keyword-density instructions", pattern: /\bkeyword density\b/i },
  { label: "prompt instructions", pattern: /\b(?:system|developer|editorial|publishing|generation) instructions?\b/i },
  { label: "model self-reference", pattern: /\bas an ai(?: language model)?\b/i },
  { label: "token instructions", pattern: /\b(?:maximum|max|minimum|min) (?:output )?tokens?\b/i },
  { label: "JSON response instructions", pattern: /\breturn only valid json\b/i }
];

const PLACEHOLDER_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
  { label: "template variable", pattern: /\{\{[^{}]+\}\}|\$\{[^{}]+\}/ },
  { label: "editorial placeholder", pattern: /\[(?:insert|add|replace|author|source|headline|title|date|location|quote|image)[^\]]*\]/i },
  { label: "unfinished marker", pattern: /\b(?:TODO|TBD|FIXME|lorem ipsum)\b/i }
];

export type ContentQualityIssue = {
  code: "prompt_leakage" | "placeholder" | "malformed_heading" | "raw_json" | "broken_markup" | "repetition" | "generic_filler";
  message: string;
};

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

export type PublishReadinessInput = {
  title?: string;
  slug?: string;
  excerpt?: string;
  content?: string;
  author?: string;
  category?: string;
  image?: string;
  imageAlt?: string;
  metaTitle?: string;
  metaDescription?: string;
  canonicalUrl?: string;
  ogImage?: string;
  sourceName?: string;
  sourceUrl?: string;
  originalSourceName?: string;
  originalSourceUrl?: string;
  references?: Array<{ name?: string; url?: string }>;
  tags?: string[];
  status?: string;
  generationMode?: "manual" | "ai" | "feed";
  duplicateRisk?: number;
  reviewStatus?: string;
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

function normalizedSentences(value = "") {
  return cleanText(value)
    .split(/[.!?]\s+/)
    .map(normalizedText)
    .filter((sentence) => sentence.length > 25);
}

function sentenceRepeatRatio(content = "") {
  const sentences = normalizedSentences(content);
  if (sentences.length < 4) return 0;
  const unique = new Set(sentences);
  return (sentences.length - unique.size) / sentences.length;
}

function topKeywordDensity(input: PublishReadinessInput) {
  const titleWords = significantWords(input.title || "");
  const contentWords = significantWords(input.content || "");
  if (!titleWords.length || !contentWords.length) return 0;
  const titleTerms = [...new Set(titleWords)].filter((word) => word.length >= 4);
  if (!titleTerms.length) return 0;
  const hits = contentWords.filter((word) => titleTerms.includes(word)).length;
  return hits / Math.max(1, contentWords.length);
}

export function genericFillerMatches(content = "") {
  const normalizedContent = normalizedText(content);
  return GENERIC_FILLER.filter((phrase) => normalizedContent.includes(phrase));
}

export function inspectArticleContent(content = ""): ContentQualityIssue[] {
  const issues: ContentQualityIssue[] = [];
  const trimmed = content.trim();
  const repeatedRatio = Math.max(repeatedParagraphRatio(content), sentenceRepeatRatio(content));

  for (const item of PROMPT_LEAKAGE_PATTERNS) {
    if (item.pattern.test(content)) issues.push({ code: "prompt_leakage", message: `Article contains ${item.label}` });
  }
  for (const item of PLACEHOLDER_PATTERNS) {
    if (item.pattern.test(content)) issues.push({ code: "placeholder", message: `Article contains ${item.label}` });
  }
  if (/^(?:h[1-6]:|#{1,6})\s*(?:[a-z]|n\/a)?\s*$/im.test(content)) {
    issues.push({ code: "malformed_heading", message: "Article contains an empty or malformed heading" });
  }
  if (/^\s*\{[\s\S]*"(?:title|slug|metaTitle|metaDescription|content)"\s*:/i.test(trimmed)) {
    issues.push({ code: "raw_json", message: "Article body appears to contain a raw JSON package" });
  }
  if (/&(?:apos|quot|amp|lt|gt);|<\/?(?:html|head|body|script|style)\b/i.test(content)) {
    issues.push({ code: "broken_markup", message: "Article contains escaped entities or document-level markup" });
  }
  if (repeatedRatio > 0.12) {
    issues.push({ code: "repetition", message: "Article has repeated paragraphs or sentences" });
  }
  if (genericFillerMatches(content).length) {
    issues.push({ code: "generic_filler", message: "Article contains generic AI/editorial filler" });
  }

  return issues.filter((issue, index, values) => values.findIndex((item) => item.code === issue.code && item.message === issue.message) === index);
}

export function validatePublishReadiness(input: PublishReadinessInput) {
  const reasons: string[] = [];
  const status = input.status || "draft";
  if (!["published", "scheduled"].includes(status)) return { approved: true, reasons };

  const text = cleanText(input.content || "");
  const words = text.split(/\s+/).filter(Boolean).length;
  const metaTitleLength = cleanText(input.metaTitle || "").length;
  const metaDescriptionLength = cleanText(input.metaDescription || "").length;
  const contentIssues = inspectArticleContent(input.content || "");
  const sources = [
    input.sourceUrl,
    input.originalSourceUrl,
    ...(input.references || []).map((reference) => reference.url)
  ].filter(Boolean);
  const externallyBased = input.generationMode !== "manual" || Boolean(input.sourceName || input.sourceUrl || input.originalSourceName || input.originalSourceUrl);

  if (words < 100) reasons.push(`Article body is extremely thin (${words} words) and needs meaningful reporting or context`);
  if (!cleanText(input.title || "") || cleanText(input.title || "").length < 8) reasons.push("Headline is missing or too short");
  if (!cleanText(input.excerpt || "") || cleanText(input.excerpt || "").length < 80) reasons.push("Excerpt is missing or too thin");
  if (!cleanText(input.author || "")) reasons.push("Author is missing");
  if (!cleanText(input.category || "")) reasons.push("Category is missing");
  if (!input.image) reasons.push("Article image is missing");
  if (!cleanText(input.imageAlt || "") || cleanText(input.imageAlt || "").length < 20) reasons.push("Image alt text is missing or too thin");
  if (metaTitleLength < 30 || metaTitleLength > 70) reasons.push("Meta title should be 30-70 characters");
  if (metaDescriptionLength < 120 || metaDescriptionLength > 170) reasons.push("Meta description should be 120-170 characters");
  if (!input.canonicalUrl || !String(input.canonicalUrl).includes("/news/")) reasons.push("Self-referencing article canonical URL is missing");
  if (!input.ogImage) reasons.push("Open Graph image is missing");
  if (externallyBased && sources.length === 0) reasons.push("Externally sourced articles need at least one source URL or reference");
  if (input.sourceName && normalizedText(input.author || "") === normalizedText(input.sourceName)) {
    reasons.push("External publisher cannot be used as the Novexa article author");
  }
  reasons.push(...contentIssues.map((issue) => issue.message));
  if (Number(input.duplicateRisk || 0) > Number(process.env.FEED_MAX_DUPLICATE_RISK || 72)) reasons.push("Duplicate-story risk is too high");
  if (topKeywordDensity(input) > 0.12) reasons.push("Potential keyword stuffing detected");

  return {
    approved: reasons.length === 0,
    reasons: [...new Set(reasons)]
  };
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
  const contentIssues = inspectArticleContent(input.content);
  const fillerMatches = contentIssues.filter((issue) => issue.code === "generic_filler");
  const duplicateRisk = Math.round(Math.max(input.duplicateSimilarity || 0, sourceTitleSimilarity * 0.45) * 100);

  if (!input.sourceUrl) reasons.push("Missing original source URL");
  if (cleanText(input.sourceSummary).length < Number(process.env.FEED_MIN_SOURCE_CHARS || 180)) reasons.push("Source metadata is too thin");
  if (words.length < minimumWords) reasons.push(`Article has ${words.length} words; minimum is ${minimumWords}`);
  if (titleContentScore < 0.22) reasons.push("Headline does not sufficiently match the article");
  if (sourceTitleSimilarity >= 0.82) reasons.push("Headline is too similar to the source headline");
  reasons.push(...contentIssues.map((issue) => issue.message));
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
