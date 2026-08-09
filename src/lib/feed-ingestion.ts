import { createHash } from "crypto";
import { categories, categorySlug } from "@/lib/categories";
import { cleanText, normalizeArticlePayload, stripHtml } from "@/lib/content-automation";
import { Article } from "@/models/Article";
import { publishArticleToX } from "@/lib/x-publishing";
import { FeedSource } from "@/models/FeedSource";
import { findStockImage, type StockImageResult } from "@/lib/stock-images";
import { researchKeywords, type KeywordResearch } from "@/lib/trending-keywords";
import { assessArticleQuality, contentHash, normalizeSourceUrl, textSimilarity, type QualityAssessment } from "@/lib/article-quality";
import { ArticleRevision } from "@/models/ArticleRevision";

export type FeedEntry = {
  title: string;
  link: string;
  description: string;
  publishedAt?: Date;
  image?: string;
  category?: string;
  guid?: string;
  itemId?: string;
};

export type FeedAiBudget = {
  remainingThisRun: number;
  remainingToday: number;
  attempted: number;
  dailyLimit: number;
  pacedAllowance: number;
};

export type PreparedFeedSource = {
  sourceId: string;
  name: string;
  url: string;
  defaultCategory: string;
  autoPublish: boolean;
  entries: FeedEntry[];
};

export type FeedIngestionOptions = {
  aiBudget?: FeedAiBudget;
  deferWithoutAi?: boolean;
  keywordResearchByUrl?: Map<string, KeywordResearch>;
  priorityByUrl?: Map<string, number>;
};

type GenerationMode = "ai" | "feed";

type EditorialPackage = {
  title: string;
  slug?: string;
  excerpt: string;
  content: string;
  metaTitle: string;
  metaDescription: string;
  keywords?: string[];
  tags: string[];
  imageAlt?: string;
  factualClaims?: string[];
  qualityAssessment?: Partial<QualityAssessment>;
};

type EditorialResult = EditorialPackage & {
  generationMode: GenerationMode;
  aiAttempted: boolean;
  aiFailureReason?: string;
};

type AiEditorialResult = {
  editorial: EditorialPackage | null;
  failureReason?: string;
};

function decodeEntities(value = "") {
  return value
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_match, code) => String.fromCharCode(Number(code)))
    .trim();
}

function readTag(block: string, tag: string) {
  const match = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return decodeEntities(match?.[1] || "");
}

function readAttr(block: string, tag: string, attr: string) {
  const match = block.match(new RegExp(`<${tag}[^>]*${attr}=["']([^"']+)["'][^>]*>`, "i"));
  return decodeEntities(match?.[1] || "");
}

function blocks(xml: string, tag: string) {
  return [...xml.matchAll(new RegExp(`<${tag}(?:\\s[^>]*)?>[\\s\\S]*?<\\/${tag}>`, "gi"))].map((match) => match[0]);
}

function cleanUrl(value = "") {
  return decodeEntities(value).replace(/\s/g, "%20");
}

function isLikelyImageUrl(value = "") {
  if (!value) return false;
  try {
    const url = new URL(cleanUrl(value));
    const host = url.hostname.toLowerCase();
    if (host.includes("youtube.com") || host.includes("youtu.be") || host.includes("vimeo.com")) return false;
    if (/\.(avif|gif|jpe?g|png|webp)(\?|$)/i.test(url.pathname + url.search)) return true;
    return ["res.cloudinary.com", "images.unsplash.com", "images.pexels.com", "pixabay.com", "cdn.pixabay.com", "www.nasa.gov", "assets.science.nasa.gov"].some(
      (allowedHost) => host === allowedHost || host.endsWith(`.${allowedHost}`)
    );
  } catch {
    return false;
  }
}

function isLowRiskAutoImageUrl(value = "") {
  if (!value) return false;
  try {
    const url = new URL(cleanUrl(value));
    const host = url.hostname.toLowerCase();
    return ["res.cloudinary.com", "images.unsplash.com", "images.pexels.com", "pixabay.com", "cdn.pixabay.com", "www.nasa.gov", "assets.science.nasa.gov"].some(
      (allowedHost) => host === allowedHost || host.endsWith(`.${allowedHost}`)
    );
  } catch {
    return false;
  }
}

function firstImageUrl(...values: Array<string | undefined>) {
  return values.map((value) => cleanUrl(value || "")).find(isLikelyImageUrl) || "";
}

function imageFromEntry(block: string) {
  return firstImageUrl(
    readAttr(block, "media:content", "url"),
    readAttr(block, "media:thumbnail", "url"),
    readAttr(block, "enclosure", "url"),
    block.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1]
  );
}

export function parseFeed(xml: string): FeedEntry[] {
  const itemBlocks = blocks(xml, "item");
  const entryBlocks = itemBlocks.length ? itemBlocks : blocks(xml, "entry");

  return entryBlocks
    .map((block) => {
      const title = readTag(block, "title");
      const link = readTag(block, "link") || readAttr(block, "link", "href");
      const description = readTag(block, "description") || readTag(block, "summary") || readTag(block, "content:encoded") || readTag(block, "content");
      const dateValue = readTag(block, "pubDate") || readTag(block, "published") || readTag(block, "updated");
      const category = readTag(block, "category");
      const guid = readTag(block, "guid") || readTag(block, "id");
      const itemId = readTag(block, "id") || guid || link;
      return {
        title: stripHtml(title),
        link,
        description: stripHtml(description),
        publishedAt: dateValue ? new Date(dateValue) : undefined,
        image: imageFromEntry(block),
        category: stripHtml(category),
        guid: stripHtml(guid),
        itemId: stripHtml(itemId)
      };
    })
    .filter((entry) => entry.title && entry.link);
}

async function ogImage(url: string) {
  try {
    const response = await fetch(url, { headers: { "User-Agent": "NovexaNewsBot/1.0" }, signal: AbortSignal.timeout(6000) });
    if (!response.ok) return "";
    const html = await response.text();
    return firstImageUrl(
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1],
      html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i)?.[1]
    );
  } catch {
    return "";
  }
}

function autoCategory(entry: FeedEntry, fallback: string) {
  const text = `${entry.title} ${entry.description} ${entry.category || ""}`.toLowerCase();
  return categories.find((category) => text.includes(category.toLowerCase())) || fallback || "Breaking News";
}

function humanSummary(entry: FeedEntry) {
  const text = entry.description || entry.title;
  const clean = cleanText(text);
  const summary = clean.length > 260 ? clean.slice(0, 260).replace(/\s+\S*$/, "").replace(/[\s.,;:!?-]+$/, "") : clean;
  return summary || `A developing story is being tracked from ${new URL(entry.link).hostname}.`;
}

function sourceHost(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "the original publisher";
  }
}

function generatedOgPath(title: string, category: string) {
  return `/api/og?title=${encodeURIComponent(title)}&category=${encodeURIComponent(category)}`;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

type ExistingStory = {
  _id: unknown;
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  status: string;
  category: string;
  sourceContentHash?: string;
  sourceUrl?: string;
  sourceName?: string;
  publishedAt?: Date;
  image?: string;
  imageAlt?: string;
  imageCredit?: string;
  imageCreditUrl?: string;
  aiAttemptedAt?: Date;
  references?: Array<{ name: string; url: string; publishedAt?: Date }>;
};

type StoryMatch = {
  article: ExistingStory;
  kind: "exact" | "similar";
  similarity: number;
  sourceChanged: boolean;
};

async function findExistingStory(entry: FeedEntry, category: string, rssFeedUrl: string): Promise<StoryMatch | null> {
  const normalizedUrl = normalizeSourceUrl(entry.link);
  const incomingSourceHash = contentHash(`${entry.title}\n${entry.description}`);
  const exactChecks: Array<Record<string, unknown>> = [
    { sourceUrl: { $in: [entry.link, normalizedUrl] } },
    { originalSourceUrl: normalizedUrl }
  ];

  if (entry.guid) exactChecks.push({ sourceGuid: entry.guid, rssFeedUrl });
  if (entry.itemId) exactChecks.push({ sourceItemId: entry.itemId, rssFeedUrl });

  const exact = await Article.findOne({ $or: exactChecks })
    .select("_id title slug excerpt content status category sourceContentHash sourceUrl sourceName publishedAt image imageAlt imageCredit imageCreditUrl aiAttemptedAt references")
    .lean<ExistingStory>();

  if (exact) {
    return {
      article: exact,
      kind: "exact",
      similarity: 1,
      sourceChanged: exact.sourceContentHash !== incomingSourceHash
    };
  }

  const cutoff = new Date(Date.now() - Number(process.env.FEED_STORY_WINDOW_DAYS || 10) * 24 * 60 * 60 * 1000);
  const candidates = await Article.find({
    status: { $in: ["published", "draft"] },
    category: new RegExp(`^${escapeRegExp(category)}$`, "i"),
    createdAt: { $gte: cutoff }
  })
    .select("_id title slug excerpt content status category sourceContentHash sourceUrl sourceName publishedAt image imageAlt imageCredit imageCreditUrl aiAttemptedAt references")
    .sort({ publishedAt: -1 })
    .limit(120)
    .lean<ExistingStory[]>();

  const threshold = Number(process.env.FEED_STORY_SIMILARITY_THRESHOLD || 0.72);
  const best = candidates
    .map((article) => ({ article, similarity: textSimilarity(entry.title, article.title) }))
    .filter((candidate) => candidate.similarity >= threshold)
    .sort((left, right) => right.similarity - left.similarity)[0];

  return best ? { ...best, kind: "similar", sourceChanged: true } : null;
}

function normalizedForCompare(value = "") {
  return cleanText(value).toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function titleSimilarity(left: string, right: string) {
  const leftWords = new Set(normalizedForCompare(left).split(" ").filter((word) => word.length > 3));
  const rightWords = new Set(normalizedForCompare(right).split(" ").filter((word) => word.length > 3));
  if (!leftWords.size || !rightWords.size) return 0;
  const overlap = [...leftWords].filter((word) => rightWords.has(word)).length;
  return overlap / Math.min(leftWords.size, rightWords.size);
}

function isCopiedSourceTitle(title: string, sourceTitle: string) {
  const titleText = normalizedForCompare(title);
  const sourceText = normalizedForCompare(sourceTitle);
  return titleText === sourceText || titleText.includes(sourceText) || sourceText.includes(titleText) || titleSimilarity(title, sourceTitle) >= 0.72;
}

function alternativeHeadline(entry: FeedEntry, category: string) {
  const summary = cleanText(entry.description || entry.title);
  const words = summary.split(/\s+/).filter((word) => word.length > 3).slice(0, 8).join(" ");
  return cleanText(`${category} update: ${words || "latest verified details"}`).slice(0, 90).replace(/[\s.,;:!?-]+$/, "");
}

function compactText(value = "", max = 1800) {
  const text = stripHtml(value).replace(/\s+/g, " ").trim();
  return text.length > max ? text.slice(0, max).replace(/\s+\S*$/, "").replace(/[\s.,;:!?-]+$/, "") : text;
}

function cleanArticleContent(value = "") {
  return value
    .replace(/\r\n/g, "\n")
    .split(/\n+/)
    .map((block) => cleanText(block))
    .filter(Boolean)
    .join("\n\n");
}

function parseEditorialJson(value: string): Partial<EditorialPackage> | null {
  try {
    return JSON.parse(value) as Partial<EditorialPackage>;
  } catch {
    const match = value.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]) as Partial<EditorialPackage>;
    } catch {
      return null;
    }
  }
}

function cleanTags(tags: unknown[], category: string, feedTag?: string) {
  return [category, feedTag, ...tags]
    .filter((tag): tag is string => typeof tag === "string" && Boolean(tag.trim()))
    .map((tag) => tag.trim())
    .filter((tag, index, all) => all.findIndex((item) => item.toLowerCase() === tag.toLowerCase()) === index)
    .slice(0, 8);
}

function minimumPublishWords() {
  return Math.max(300, Number(process.env.FEED_MIN_PUBLISH_WORDS || 500));
}

function validateEditorialPackage(input: Partial<EditorialPackage> | null, entry: FeedEntry, sourceName: string, category: string): EditorialPackage | null {
  if (!input?.title || !input.content) return null;
  const proposedTitle = cleanText(input.title).slice(0, 95).replace(/[\s.,;:!?-]+$/, "");
  const title = isCopiedSourceTitle(proposedTitle, entry.title) ? alternativeHeadline(entry, category) : proposedTitle;
  const content = cleanArticleContent(input.content);
  if (!title || content.split(/\s+/).filter(Boolean).length < minimumPublishWords()) return null;

  const excerpt = cleanText(input.excerpt || humanSummary(entry)).slice(0, 240).replace(/[\s.,;:!?-]+$/, "");
  const metaTitle = cleanText(input.metaTitle || title).slice(0, 68).replace(/[\s.,;:!?-]+$/, "");
  const metaDescription = cleanText(input.metaDescription || excerpt).slice(0, 160).replace(/[\s.,;:!?-]+$/, "");
  const slug = typeof input.slug === "string" ? categorySlug(cleanText(input.slug)) : undefined;
  const keywords = Array.isArray(input.keywords) ? input.keywords : [];
  const imageAlt = cleanText(input.imageAlt || `${title} news image`).slice(0, 125).replace(/[\s.,;:!?-]+$/, "");

  return {
    title,
    slug,
    excerpt,
    content,
    metaTitle,
    metaDescription,
    keywords: cleanTags(keywords, category, entry.category),
    tags: cleanTags([...(Array.isArray(input.tags) ? input.tags : []), ...keywords], category, entry.category),
    imageAlt,
    factualClaims: Array.isArray(input.factualClaims) ? input.factualClaims.map((claim) => cleanText(String(claim))).filter(Boolean).slice(0, 12) : [],
    qualityAssessment: input.qualityAssessment
  };
}

function feedSummaryLength(entry: FeedEntry) {
  return cleanText(entry.description || "").length;
}

function aiCategories() {
  return (process.env.FEED_AI_CATEGORIES || "Pakistan,World,Politics,Business,Economy,Technology,Artificial Intelligence,Sports,Health")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function shouldUseAiForEntry(entry: FeedEntry, category: string) {
  if (process.env.FEED_AI_ENABLED === "false") return false;
  const minSummaryChars = Number(process.env.FEED_MIN_SOURCE_CHARS || process.env.FEED_AI_MIN_SUMMARY_CHARS || 180);
  if (feedSummaryLength(entry) < minSummaryChars) return false;
  const allowedCategories = aiCategories();
  return !allowedCategories.length || allowedCategories.includes(category.toLowerCase());
}

export function isFeedEntryAiEligible(entry: FeedEntry, fallbackCategory: string) {
  return shouldUseAiForEntry(entry, autoCategory(entry, fallbackCategory));
}

export function scoreFeedCandidate(entry: FeedEntry, fallbackCategory: string, keywordResearch: KeywordResearch) {
  const category = autoCategory(entry, fallbackCategory).toLowerCase();
  const categoryWeight = new Map([
    ["breaking news", 24], ["pakistan", 22], ["world", 22], ["politics", 20],
    ["business", 20], ["economy", 20], ["technology", 18], ["artificial intelligence", 18],
    ["health", 16], ["sports", 14], ["entertainment", 12]
  ]).get(category) || 8;
  const evidenceScore = Math.min(30, feedSummaryLength(entry) / 20);
  const ageHours = entry.publishedAt ? Math.max(0, (Date.now() - entry.publishedAt.getTime()) / 3_600_000) : 24;
  const freshnessScore = Math.max(0, 24 - ageHours);
  const trendScore = keywordResearch.source === "google-trends"
    ? 55 + Math.min(35, Math.log10(Math.max(10, keywordResearch.approximateTraffic || 10)) * 8)
    : 0;
  return Math.round((trendScore + evidenceScore + freshnessScore + categoryWeight) * 100) / 100;
}

export async function createPacedFeedAiBudget(): Promise<FeedAiBudget> {
  const dailyLimit = Math.max(0, Number(process.env.FEED_AI_DAILY_LIMIT || 20));
  const perCronLimit = Math.max(0, Number(process.env.FEED_AI_PER_CRON_LIMIT || 1));
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setUTCHours(0, 0, 0, 0);
  const usedToday = await Article.countDocuments({ aiAttemptedAt: { $gte: startOfDay } });
  const elapsedFraction = Math.min(1, Math.max(0, (now.getTime() - startOfDay.getTime()) / 86_400_000));
  const pacingEnabled = process.env.FEED_AI_PACE_DAILY_LIMIT !== "false";
  const pacedAllowance = pacingEnabled
    ? Math.min(dailyLimit, Math.max(1, Math.floor(elapsedFraction * dailyLimit) + 1))
    : dailyLimit;
  const remainingToday = Math.max(0, dailyLimit - usedToday);
  const availableByPace = Math.max(0, pacedAllowance - usedToday);

  return {
    remainingThisRun: Math.min(perCronLimit, remainingToday, availableByPace),
    remainingToday,
    attempted: 0,
    dailyLimit,
    pacedAllowance
  };
}

async function editorialPackage(entry: FeedEntry, sourceName: string, category: string, useAi: boolean, keywordResearch: KeywordResearch): Promise<EditorialResult> {
  if (useAi) {
    const generated = await aiEditorialPackage(entry, sourceName, category, keywordResearch);
    if (generated.editorial) return { ...generated.editorial, generationMode: "ai", aiAttempted: true };
    return {
      ...fallbackEditorialPackage(entry, sourceName, category),
      generationMode: "feed",
      aiAttempted: true,
      aiFailureReason: generated.failureReason || "OpenAI returned no usable editorial package"
    };
  }

  return { ...fallbackEditorialPackage(entry, sourceName, category), generationMode: "feed", aiAttempted: false };
}

async function aiEditorialPackage(entry: FeedEntry, sourceName: string, category: string, keywordResearch: KeywordResearch): Promise<AiEditorialResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { editorial: null, failureReason: "OPENAI_API_KEY is not configured" };
  const minimumWords = minimumPublishWords();
  const preferredMaximumWords = Math.max(minimumWords + 200, 700);

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-5.6-sol",
        max_output_tokens: Math.max(1800, Number(process.env.FEED_AI_MAX_OUTPUT_TOKENS || 1800)),
        reasoning: { effort: process.env.OPENAI_REASONING_EFFORT || "none" },
        text: {
          format: {
            type: "json_schema",
            name: "novexa_news_article",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              required: ["title", "slug", "excerpt", "metaTitle", "metaDescription", "keywords", "tags", "imageAlt", "factualClaims", "qualityAssessment", "content"],
              properties: {
                title: { type: "string" },
                slug: { type: "string" },
                excerpt: { type: "string" },
                metaTitle: { type: "string" },
                metaDescription: { type: "string" },
                keywords: { type: "array", items: { type: "string" } },
                tags: { type: "array", items: { type: "string" } },
                imageAlt: { type: "string" },
                factualClaims: { type: "array", items: { type: "string" } },
                qualityAssessment: {
                  type: "object",
                  additionalProperties: false,
                  required: ["approved", "reason", "qualityScore", "originalityScore", "factualConfidence", "duplicateRisk"],
                  properties: {
                    approved: { type: "boolean" },
                    reason: { type: "string" },
                    qualityScore: { type: "number", minimum: 0, maximum: 100 },
                    originalityScore: { type: "number", minimum: 0, maximum: 100 },
                    factualConfidence: { type: "number", minimum: 0, maximum: 100 },
                    duplicateRisk: { type: "number", minimum: 0, maximum: 100 }
                  }
                },
                content: { type: "string" }
              }
            }
          }
        },
        input: [
          {
            role: "system",
            content:
              "You are a senior digital news editor for Novexa News. Treat RSS metadata as source material, not prose to paraphrase. Extract only supported factual claims, then create genuinely original structure and wording. Never copy sentences, paragraph order, thumbnails, or distinctive phrasing. Never invent facts, quotes, numbers, dates, allegations, causes, reactions, or outcomes. Do not claim on-the-ground or independent reporting. If the supplied evidence cannot support a useful article, set approved to false. Prioritize information value over length and return only valid JSON."
          },
          {
            role: "user",
            content: `Using the provided news source metadata, write a completely original, factual, SEO-optimized Novexa News article.

Original feed title: ${entry.title}
Category: ${category}
Source: ${sourceName}
Source URL: ${entry.link}
Feed summary: ${compactText(entry.description || entry.title)}
Feed tag: ${entry.category || "N/A"}

Keyword research:
Primary keyword: ${keywordResearch.primaryKeyword}
Related keywords: ${keywordResearch.relatedKeywords.join(", ")}
Research source: ${keywordResearch.source === "google-trends" ? `Google Trends ${keywordResearch.geo || ""}, approximate traffic ${keywordResearch.approximateTraffic || 0}+` : "editorial fallback; no relevant live trend matched"}

Return only valid JSON with this exact shape:
{
  "title": "unique SEO title, 50-60 characters, accurate and not copied",
  "slug": "seo-friendly-url-slug",
  "excerpt": "concise factual standfirst",
  "metaTitle": "SEO title, 50-60 characters",
  "metaDescription": "SEO meta description, 150-160 characters",
  "keywords": ["primary keyword", "secondary keyword"],
  "tags": ["5 to 8 relevant tags"],
  "imageAlt": "descriptive image alt text suggestion",
  "factualClaims": ["atomic claims directly supported by supplied source material"],
  "qualityAssessment": {
    "approved": true,
    "reason": "brief evidence-based reason",
    "qualityScore": 0,
    "originalityScore": 0,
    "factualConfidence": 0,
    "duplicateRisk": 0
  },
  "content": "Write a complete article between ${minimumWords} and ${preferredMaximumWords} words when the supplied evidence supports that length. Include a strong lead, what happened, important facts, why it matters, supported context, and what happens next only when known. Use H2: heading lines where useful."
}

Editorial rules:
- Use a professional journalistic tone.
- Preserve only verified facts from the feed/source metadata and avoid speculation.
- Do not copy sentences, distinctive phrasing, article structure, images, thumbnails, or the source headline.
- Rewrite the headline with a clearly different angle and wording while keeping verified facts accurate.
- Use the researched primary keyword naturally in the title, introduction, one heading, metadata, and body only when grammar and facts support it.
- Do not claim a query is trending or mention search volume inside the article.
- Never change the story angle or introduce unrelated facts merely to fit a high-volume keyword.
- Do not paraphrase the RSS summary sentence by sentence or preserve its structure.
- Explain why the story matters and add background only when that context is supported by the supplied source metadata.
- A publishable article must contain at least ${minimumWords} words. Use the available verified facts to add useful explanation and supported context, not repetition.
- If the evidence cannot support at least ${minimumWords} factual words, return qualityAssessment.approved=false instead of adding filler or inventing details.
- Keep attribution inside the article naturally using the source/outlet name only; do not print the source URL in the article body.
- Do not say the article was written by AI.
- Do not include markdown symbols, bullet characters, underscores, asterisks, placeholder ellipses, escaped apostrophes, or HTML entities such as &apos; or &amp;.
- Do not include any image URL.`
          }
        ]
      })
    });

    if (!response.ok) {
      const failure = await response.json().catch(() => null);
      console.error("OpenAI editorial request failed", {
        status: response.status,
        code: failure?.error?.code || "unknown"
      });
      return {
        editorial: null,
        failureReason: `OpenAI request failed (${response.status}: ${failure?.error?.code || failure?.error?.type || "unknown"})`
      };
    }
    const data = await response.json();
    const text = typeof data.output_text === "string"
      ? data.output_text
      : data.output?.flatMap((item: { content?: Array<{ text?: string }> }) => item.content || []).map((item: { text?: string }) => item.text).filter(Boolean).join("\n");

    const parsed = parseEditorialJson(text || "");
    if (!parsed) return { editorial: null, failureReason: "OpenAI response was not valid editorial JSON" };
    if (parsed.qualityAssessment?.approved === false) {
      return { editorial: null, failureReason: cleanText(parsed.qualityAssessment.reason || "OpenAI found insufficient source evidence") };
    }
    const validated = validateEditorialPackage(parsed, entry, sourceName, category);
    if (!validated) {
      const words = cleanText(parsed.content || "").split(/\s+/).filter(Boolean).length;
      return { editorial: null, failureReason: `OpenAI package failed validation (${words} content words)` };
    }
    return {
      editorial: {
        ...validated,
        keywords: cleanTags([keywordResearch.primaryKeyword, ...keywordResearch.relatedKeywords, ...(validated.keywords || [])], category, entry.category),
        tags: cleanTags([keywordResearch.primaryKeyword, ...validated.tags], category, entry.category)
      }
    };
  } catch (error) {
    console.error("OpenAI editorial generation failed", error instanceof Error ? error.message : "Unknown error");
    return { editorial: null, failureReason: error instanceof Error ? error.message : "Unknown OpenAI generation error" };
  }
}

function fallbackEditorialPackage(entry: FeedEntry, sourceName: string, category: string): EditorialPackage {
  const summary = humanSummary(entry);
  const cleanTitle = cleanText(entry.title);
  const baseTitle = cleanTitle.length > 90 ? cleanTitle.slice(0, 90).replace(/\s+\S*$/, "").replace(/[\s.,;:!?-]+$/, "") : cleanTitle;
  const title = isCopiedSourceTitle(baseTitle, entry.title) ? alternativeHeadline(entry, category) : baseTitle;

  return {
    title,
    excerpt: summary.slice(0, 220),
    content: summary,
    metaTitle: title.slice(0, 68),
    metaDescription: summary.slice(0, 158),
    tags: cleanTags([], category, entry.category),
    imageAlt: title + " news image"
  };
}
function sourceHash(value: string) {
  return createHash("sha1").update(value).digest("hex").slice(0, 8);
}

async function uniqueArticleSlug(baseSlug: string, sourceUrl: string) {
  if (!(await Article.exists({ slug: baseSlug }))) return baseSlug;

  const withSourceHash = `${baseSlug}-${sourceHash(sourceUrl)}`;
  if (!(await Article.exists({ slug: withSourceHash }))) return withSourceHash;

  for (let index = 2; index < 100; index += 1) {
    const candidate = `${withSourceHash}-${index}`;
    if (!(await Article.exists({ slug: candidate }))) return candidate;
  }

  return `${withSourceHash}-${Date.now()}`;
}

async function feedImage(entry: FeedEntry, title: string, category: string): Promise<{ image: string; stockImage: StockImageResult | null }> {
  const generated = generatedOgPath(title, category);
  const sourceImage = firstImageUrl(entry.image) || (await ogImage(entry.link));

  if (sourceImage && isLowRiskAutoImageUrl(sourceImage)) return { image: sourceImage, stockImage: null };
  if (sourceImage && process.env.FEED_USE_SOURCE_IMAGES === "true") return { image: sourceImage, stockImage: null };

  const recentArticles = await Article.find({ image: { $type: "string" } }).select({ image: 1 }).sort({ createdAt: -1 }).limit(300).lean();
  const recentImages = recentArticles.map((article) => article.image).filter((image): image is string => Boolean(image));
  const stockImage = await findStockImage({ title, category, excludeUrls: recentImages });
  if (stockImage?.url) return { image: stockImage.url, stockImage };

  return { image: generated, stockImage: null };
}

export async function prepareFeedSource(sourceId: string): Promise<PreparedFeedSource> {
  const source = await FeedSource.findById(sourceId).select("_id name url defaultCategory autoPublish").lean<{
    _id: { toString: () => string };
    name: string;
    url: string;
    defaultCategory: string;
    autoPublish: boolean;
  }>();
  if (!source) throw new Error("Feed source not found");

  const response = await fetch(source.url, { headers: { "User-Agent": "NovexaNewsBot/1.0" }, signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error(`Feed fetch failed: ${response.status}`);

  const xml = await response.text();
  const entries = parseFeed(xml).slice(0, Number(process.env.FEED_IMPORT_LIMIT || 3));
  return {
    sourceId: source._id.toString(),
    name: source.name,
    url: source.url,
    defaultCategory: source.defaultCategory,
    autoPublish: source.autoPublish,
    entries
  };
}

export async function ingestPreparedFeedSource(source: PreparedFeedSource, options: FeedIngestionOptions = {}) {
  const entries = [...source.entries].sort((left, right) => {
    const leftPriority = options.priorityByUrl?.get(normalizeSourceUrl(left.link)) || 0;
    const rightPriority = options.priorityByUrl?.get(normalizeSourceUrl(right.link)) || 0;
    return rightPriority - leftPriority || (right.publishedAt?.getTime() || 0) - (left.publishedAt?.getTime() || 0);
  });
  const created = [];
  const updated = [];
  const skipped = [];
  const rejected: Array<{ sourceUrl: string; reason: string; parentStoryId?: string }> = [];
  const aiSkipped = [];
  const deferred: Array<{ sourceUrl: string; reason: string }> = [];
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const dailyAiLimit = Number(process.env.FEED_AI_DAILY_LIMIT || 20);
  const runAiLimit = Number(process.env.FEED_AI_RUN_LIMIT || 3);
  const dailyPublishLimit = Number(process.env.FEED_DAILY_PUBLISH_LIMIT || 12);
  let aiUsedToday = await Article.countDocuments({ aiAttemptedAt: { $gte: startOfDay } });
  let aiUsedThisRun = 0;
  let publishedToday = await Article.countDocuments({
    status: "published",
    originalSourceUrl: { $exists: true, $ne: "" },
    createdAt: { $gte: startOfDay }
  });

  for (const entry of entries) {
    const category = autoCategory(entry, source.defaultCategory);
    const normalizedUrl = normalizeSourceUrl(entry.link);
    const incomingSourceHash = contentHash(`${entry.title}\n${entry.description}`);
    const storyMatch = await findExistingStory(entry, category, source.url);

    const retryHours = Math.max(1, Number(process.env.FEED_AI_RETRY_HOURS || 24));
    const retryCutoff = Date.now() - retryHours * 60 * 60 * 1000;
    const canRetryExactDraft = storyMatch?.kind === "exact"
      && storyMatch.article.status === "draft"
      && source.autoPublish
      && shouldUseAiForEntry(entry, category)
      && (!storyMatch.article.aiAttemptedAt || storyMatch.article.aiAttemptedAt.getTime() <= retryCutoff);

    if (storyMatch?.kind === "exact" && !storyMatch.sourceChanged && !canRetryExactDraft) {
      skipped.push(entry.link);
      continue;
    }

    if (storyMatch?.kind === "similar") {
      const reason = `Possible developing-story match (${Math.round(storyMatch.similarity * 100)}% title similarity); editorial merge review required`;
      const draftTitle = cleanText(entry.title).slice(0, 95);
      const draftPayload = normalizeArticlePayload({
        title: draftTitle,
        excerpt: humanSummary(entry),
        content: humanSummary(entry),
        category,
        author: "Novexa News Desk",
        sourceName: source.name,
        sourceUrl: normalizedUrl,
        originalSourceName: source.name,
        originalSourceUrl: normalizedUrl,
        rssFeedUrl: source.url,
        sourceGuid: entry.guid || undefined,
        sourceItemId: entry.itemId || normalizedUrl,
        sourcePublishedAt: entry.publishedAt,
        importedAt: new Date(),
        references: [{ name: source.name, url: normalizedUrl, publishedAt: entry.publishedAt }],
        sourceContentHash: incomingSourceHash,
        contentHash: contentHash(humanSummary(entry)),
        generationMode: "feed",
        reviewStatus: "needs_review",
        rejectionReasons: [reason],
        duplicateRisk: Math.round(storyMatch.similarity * 100),
        isDevelopingStory: true,
        parentStoryId: storyMatch.article._id,
        image: generatedOgPath(draftTitle, category),
        imageAlt: `${draftTitle} news image`,
        status: "draft",
        tags: cleanTags([], category, entry.category)
      });
      const slug = await uniqueArticleSlug(draftPayload.slug, normalizedUrl);
      const draft = await Article.create({ ...draftPayload, slug, publishedAt: undefined });
      created.push(draft);
      rejected.push({ sourceUrl: normalizedUrl, reason, parentStoryId: String(storyMatch.article._id) });
      continue;
    }

    const aiEligible = shouldUseAiForEntry(entry, category) && (!options.deferWithoutAi || source.autoPublish);
    const hasAiCapacity = options.aiBudget
      ? options.aiBudget.remainingThisRun > 0 && options.aiBudget.remainingToday > 0
      : aiUsedThisRun < runAiLimit && aiUsedToday < dailyAiLimit;
    const useAi = aiEligible && hasAiCapacity;
    if (!useAi) {
      aiSkipped.push(entry.link);
      if (options.deferWithoutAi) {
        deferred.push({
          sourceUrl: normalizedUrl,
          reason: aiEligible ? "Deferred for a later paced AI slot" : "Source evidence or category is not eligible for AI publishing"
        });
        continue;
      }
    }

    const keywordResearch = useAi
      ? options.keywordResearchByUrl?.get(normalizedUrl) || await researchKeywords(entry)
      : {
          primaryKeyword: cleanText(entry.title).toLowerCase(),
          relatedKeywords: [cleanText(entry.title).toLowerCase()],
          source: "editorial" as const,
          researchedAt: new Date()
        };

    const editorial = await editorialPackage(entry, source.name, category, useAi, keywordResearch);
    if (editorial.aiAttempted) {
      aiUsedThisRun += 1;
      aiUsedToday += 1;
      if (options.aiBudget) {
        options.aiBudget.remainingThisRun = Math.max(0, options.aiBudget.remainingThisRun - 1);
        options.aiBudget.remainingToday = Math.max(0, options.aiBudget.remainingToday - 1);
        options.aiBudget.attempted += 1;
      }
    }

    let assessment = assessArticleQuality({
      title: editorial.title,
      content: editorial.content,
      metaDescription: editorial.metaDescription,
      sourceTitle: entry.title,
      sourceSummary: entry.description,
      sourceUrl: normalizedUrl,
      duplicateSimilarity: storyMatch?.similarity,
      updatingExisting: storyMatch?.kind === "exact",
      modelScores: editorial.qualityAssessment
    });

    if (editorial.qualityAssessment?.approved === false) {
      const modelReason = cleanText(editorial.qualityAssessment.reason || "Model found insufficient evidence");
      assessment = {
        ...assessment,
        approved: false,
        reasons: [...new Set([...assessment.reasons, modelReason])],
        reason: [...new Set([...assessment.reasons, modelReason])].join("; ")
      };
    }

    const approved = editorial.generationMode === "ai" && assessment.approved;
    const shouldPublish = source.autoPublish && approved && publishedToday < dailyPublishLimit;
    const rejectionReasons = approved
      ? []
      : [...new Set([...(editorial.aiFailureReason ? [editorial.aiFailureReason] : []), ...assessment.reasons, ...(assessment.reasons.length ? [] : ["AI generation was not available"])])];
    const sourceFields = {
      sourceName: source.name,
      sourceUrl: normalizedUrl,
      originalSourceName: source.name,
      originalSourceUrl: normalizedUrl,
      rssFeedUrl: source.url,
      sourceGuid: entry.guid || undefined,
      sourceItemId: entry.itemId || normalizedUrl,
      sourcePublishedAt: entry.publishedAt,
      importedAt: new Date(),
      aiGeneratedAt: editorial.generationMode === "ai" ? new Date() : undefined,
      aiAttemptedAt: editorial.aiAttempted ? new Date() : undefined,
      aiFailureReason: editorial.aiFailureReason,
      lastUpdatedAt: storyMatch ? new Date() : undefined,
      references: [{ name: source.name, url: normalizedUrl, publishedAt: entry.publishedAt }],
      sourceContentHash: incomingSourceHash,
      contentHash: contentHash(editorial.content),
      reviewStatus: approved ? "approved" : editorial.generationMode === "ai" ? "rejected" : "needs_review",
      rejectionReasons,
      qualityScore: assessment.qualityScore,
      originalityScore: assessment.originalityScore,
      factualConfidence: assessment.factualConfidence,
      duplicateRisk: assessment.duplicateRisk,
      generationMode: editorial.generationMode,
      primaryKeyword: keywordResearch.primaryKeyword,
      keywordResearch: {
        source: keywordResearch.source,
        relatedKeywords: keywordResearch.relatedKeywords,
        geo: keywordResearch.geo,
        approximateTraffic: keywordResearch.approximateTraffic,
        researchedAt: keywordResearch.researchedAt
      }
    };

    if (storyMatch?.kind === "exact") {
      if (!shouldPublish) {
        await Article.findByIdAndUpdate(storyMatch.article._id, {
          $set: {
            aiAttemptedAt: sourceFields.aiAttemptedAt,
            aiFailureReason: sourceFields.aiFailureReason,
            importedAt: sourceFields.importedAt,
            keywordResearch: sourceFields.keywordResearch,
            primaryKeyword: sourceFields.primaryKeyword,
            reviewStatus: sourceFields.reviewStatus,
            rejectionReasons: sourceFields.rejectionReasons,
            qualityScore: sourceFields.qualityScore,
            originalityScore: sourceFields.originalityScore,
            factualConfidence: sourceFields.factualConfidence,
            duplicateRisk: sourceFields.duplicateRisk
          }
        });
        rejected.push({
          sourceUrl: normalizedUrl,
          reason: rejectionReasons.join("; ") || assessment.reason,
          parentStoryId: String(storyMatch.article._id)
        });
        continue;
      }

      const wasPublished = storyMatch.article.status === "published";
      if (wasPublished) {
        await ArticleRevision.create({
          articleId: storyMatch.article._id,
          title: storyMatch.article.title,
          excerpt: storyMatch.article.excerpt,
          content: storyMatch.article.content,
          sourceUrl: storyMatch.article.sourceUrl,
          sourceName: storyMatch.article.sourceName,
          reason: "Source item changed; canonical developing story updated"
        });
      }

      const existingImage = storyMatch.article.image || "";
      const needsEditorialImage = !existingImage || existingImage.startsWith("/api/og");
      const imageResult = needsEditorialImage
        ? await feedImage(entry, editorial.title, category)
        : { image: existingImage, stockImage: null };

      const updatedPayload = normalizeArticlePayload({
        title: editorial.title,
        slug: storyMatch.article.slug,
        excerpt: editorial.excerpt,
        content: editorial.content,
        category,
        author: "Novexa News Desk",
        ...sourceFields,
        references: [
          ...(storyMatch.article.references || []).filter((reference) => reference.url !== normalizedUrl),
          sourceFields.references[0]
        ],
        image: imageResult.image,
        imageAlt: editorial.imageAlt || storyMatch.article.imageAlt || editorial.title,
        imageCredit: imageResult.stockImage?.credit || storyMatch.article.imageCredit,
        imageCreditUrl: imageResult.stockImage?.pageUrl || storyMatch.article.imageCreditUrl,
        ogImage: generatedOgPath(editorial.title, category),
        metaTitle: editorial.metaTitle,
        metaDescription: editorial.metaDescription,
        status: "published",
        tags: editorial.tags,
        isDevelopingStory: wasPublished,
        publishedAt: storyMatch.article.publishedAt || entry.publishedAt || new Date()
      });

      const article = await Article.findByIdAndUpdate(
        storyMatch.article._id,
        { $set: updatedPayload },
        { new: true }
      );
      if (article) {
        await publishArticleToX(article);
        if (!wasPublished) publishedToday += 1;
        updated.push(article);
      }
      continue;
    }

    const imageResult = shouldPublish
      ? await feedImage(entry, editorial.title, category)
      : { image: generatedOgPath(editorial.title, category), stockImage: null };

    const initialPayload = normalizeArticlePayload({
      title: editorial.title,
      excerpt: editorial.excerpt,
      content: editorial.content,
      category,
      author: "Novexa News Desk",
      ...sourceFields,
      image: imageResult.image,
      imageAlt: editorial.imageAlt || imageResult.stockImage?.alt || editorial.title,
      imageCredit: imageResult.stockImage?.credit,
      imageCreditUrl: imageResult.stockImage?.pageUrl,
      ogImage: generatedOgPath(editorial.title, category),
      slug: editorial.slug,
      metaTitle: editorial.metaTitle,
      metaDescription: editorial.metaDescription,
      status: shouldPublish ? "published" : "draft",
      tags: editorial.tags,
      publishedAt: entry.publishedAt?.toISOString()
    });
    const slug = await uniqueArticleSlug(initialPayload.slug, normalizedUrl);
    const articlePayload = slug === initialPayload.slug ? initialPayload : normalizeArticlePayload({ ...initialPayload, slug });

    const article = await Article.create({
      ...articlePayload,
      publishedAt: shouldPublish ? entry.publishedAt || new Date() : undefined
    });
    if (shouldPublish) {
      await publishArticleToX(article);
      publishedToday += 1;
    } else {
      rejected.push({ sourceUrl: normalizedUrl, reason: rejectionReasons.join("; ") || assessment.reason || "Held for editorial review" });
    }
    created.push(article);
  }

  await FeedSource.findByIdAndUpdate(source.sourceId, { $set: { lastFetchedAt: new Date() } });

  return { created, updated, skipped, rejected, aiSkipped, deferred, total: entries.length };
}

export async function ingestFeedSource(sourceId: string, options: FeedIngestionOptions = {}) {
  const prepared = await prepareFeedSource(sourceId);
  return ingestPreparedFeedSource(prepared, options);
}
export function sourceSlug(name: string) {
  return categorySlug(name);
}















