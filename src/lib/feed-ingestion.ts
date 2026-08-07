import { createHash } from "crypto";
import { categories, categorySlug } from "@/lib/categories";
import { cleanText, normalizeArticlePayload, stripHtml } from "@/lib/content-automation";
import { Article } from "@/models/Article";
import { publishArticleToX } from "@/lib/x-publishing";
import { FeedSource } from "@/models/FeedSource";
import { findStockImage, type StockImageResult } from "@/lib/stock-images";
import { researchKeywords, type KeywordResearch } from "@/lib/trending-keywords";

export type FeedEntry = {
  title: string;
  link: string;
  description: string;
  publishedAt?: Date;
  image?: string;
  category?: string;
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
};

type EditorialResult = EditorialPackage & { generationMode: GenerationMode };

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
      return {
        title: stripHtml(title),
        link,
        description: stripHtml(description),
        publishedAt: dateValue ? new Date(dateValue) : undefined,
        image: imageFromEntry(block),
        category: stripHtml(category)
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

async function hasDuplicateArticle(entry: FeedEntry) {
  const title = entry.title.trim();
  const duplicateChecks: Array<Record<string, unknown>> = [{ sourceUrl: entry.link }];

  if (title) {
    duplicateChecks.push({ title: new RegExp(`^${escapeRegExp(title)}$`, "i") });
  }

  return Article.exists({ $or: duplicateChecks });
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

function validateEditorialPackage(input: Partial<EditorialPackage> | null, entry: FeedEntry, sourceName: string, category: string): EditorialPackage | null {
  if (!input?.title || !input.content) return null;
  const proposedTitle = cleanText(input.title).slice(0, 95).replace(/[\s.,;:!?-]+$/, "");
  const title = isCopiedSourceTitle(proposedTitle, entry.title) ? alternativeHeadline(entry, category) : proposedTitle;
  const content = cleanArticleContent(input.content);
  if (!title || content.split(/\s+/).filter(Boolean).length < 300) return null;

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
    imageAlt
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
  const minSummaryChars = Number(process.env.FEED_AI_MIN_SUMMARY_CHARS || 120);
  if (feedSummaryLength(entry) < minSummaryChars) return false;
  const allowedCategories = aiCategories();
  return !allowedCategories.length || allowedCategories.includes(category.toLowerCase());
}

async function editorialPackage(entry: FeedEntry, sourceName: string, category: string, useAi: boolean, keywordResearch: KeywordResearch): Promise<EditorialResult> {
  if (useAi) {
    const generated = await aiEditorialPackage(entry, sourceName, category, keywordResearch);
    if (generated) return { ...generated, generationMode: "ai" };
  }

  return { ...fallbackEditorialPackage(entry, sourceName, category), generationMode: "feed" };
}

async function aiEditorialPackage(entry: FeedEntry, sourceName: string, category: string, keywordResearch: KeywordResearch) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

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
        input: [
          {
            role: "system",
            content:
              "You are a senior digital news editor for Novexa News. Create original, copyright-safe journalism from RSS/feed metadata only. You may use the source as reference, but never copy publisher sentences, structure, images, thumbnails, or distinctive phrasing. Do not invent facts, quotes, numbers, dates, allegations, causes, or outcomes. If feed details are thin, write a useful concise brief with context and attribution instead of pretending to know more. Write in a natural human newsroom voice, not a repetitive template. Return only valid JSON."
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
  "metaTitle": "SEO title, 50-60 characters",
  "metaDescription": "SEO meta description, 150-160 characters",
  "keywords": ["primary keyword", "secondary keyword"],
  "tags": ["5 to 8 relevant tags"],
  "imageAlt": "descriptive image alt text suggestion",
  "content": "650-900 words when verified feed detail supports it; 300-500 words if the feed metadata is thin. Use a strong introduction, H2: heading lines, short paragraphs, a conclusion, and a short FAQ only when appropriate."
}

Editorial rules:
- Use a professional journalistic tone.
- Preserve only verified facts from the feed/source metadata and avoid speculation.
- Do not copy sentences, distinctive phrasing, article structure, images, thumbnails, or the source headline.
- Rewrite the headline with a clearly different angle and wording while keeping verified facts accurate.
- Use the researched primary keyword naturally in the title, introduction, one heading, metadata, and body only when grammar and facts support it.
- Do not claim a query is trending or mention search volume inside the article.
- Never change the story angle or introduce unrelated facts merely to fit a high-volume keyword.
- If the feed has limited verified detail, write a shorter factual brief instead of inventing details.
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
      return null;
    }
    const data = await response.json();
    const text = typeof data.output_text === "string"
      ? data.output_text
      : data.output?.flatMap((item: { content?: Array<{ text?: string }> }) => item.content || []).map((item: { text?: string }) => item.text).filter(Boolean).join("\n");

    const validated = validateEditorialPackage(parseEditorialJson(text || ""), entry, sourceName, category);
    if (!validated) return null;
    return {
      ...validated,
      keywords: cleanTags([keywordResearch.primaryKeyword, ...keywordResearch.relatedKeywords, ...(validated.keywords || [])], category, entry.category),
      tags: cleanTags([keywordResearch.primaryKeyword, ...validated.tags], category, entry.category)
    };
  } catch (error) {
    console.error("OpenAI editorial generation failed", error instanceof Error ? error.message : "Unknown error");
    return null;
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

export async function ingestFeedSource(sourceId: string) {
  const source = await FeedSource.findById(sourceId);
  if (!source) throw new Error("Feed source not found");

  const response = await fetch(source.url, { headers: { "User-Agent": "NovexaNewsBot/1.0" }, signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error(`Feed fetch failed: ${response.status}`);

  const xml = await response.text();
  const entries = parseFeed(xml).slice(0, Number(process.env.FEED_IMPORT_LIMIT || 3));
  const created = [];
  const skipped = [];
  const aiSkipped = [];
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const dailyAiLimit = Number(process.env.FEED_AI_DAILY_LIMIT || 20);
  const runAiLimit = Number(process.env.FEED_AI_RUN_LIMIT || 3);
  const dailyPublishLimit = Number(process.env.FEED_DAILY_PUBLISH_LIMIT || 12);
  const minimumPublishWords = Number(process.env.FEED_MIN_PUBLISH_WORDS || 600);
  let aiUsedToday = await Article.countDocuments({ generationMode: "ai", createdAt: { $gte: startOfDay } });
  let aiUsedThisRun = 0;
  let publishedToday = await Article.countDocuments({
    status: "published",
    sourceUrl: { $exists: true, $ne: "" },
    createdAt: { $gte: startOfDay }
  });

  for (const entry of entries) {
    const duplicate = await hasDuplicateArticle(entry);
    if (duplicate) {
      skipped.push(entry.link);
      continue;
    }

    const category = autoCategory(entry, source.defaultCategory);
    const useAi = shouldUseAiForEntry(entry, category) && aiUsedThisRun < runAiLimit && aiUsedToday < dailyAiLimit;
    if (!useAi) aiSkipped.push(entry.link);

    const keywordResearch = await researchKeywords(entry);
    const editorial = await editorialPackage(entry, source.name, category, useAi, keywordResearch);
    if (useAi) aiUsedThisRun += 1;
    if (editorial.generationMode === "ai") aiUsedToday += 1;

    const contentWordCount = cleanText(editorial.content).split(/\s+/).filter(Boolean).length;
    const shouldPublish = source.autoPublish
      && editorial.generationMode === "ai"
      && contentWordCount >= minimumPublishWords
      && publishedToday < dailyPublishLimit;
    const { image, stockImage } = await feedImage(entry, editorial.title, category);
    const content = editorial.content;
    const initialPayload = normalizeArticlePayload({
      title: editorial.title,
      excerpt: editorial.excerpt,
      content,
      category,
      author: "Novexa News Desk",
      sourceName: source.name,
      sourceUrl: entry.link,
      generationMode: editorial.generationMode,
      primaryKeyword: keywordResearch.primaryKeyword,
      keywordResearch: {
        source: keywordResearch.source,
        relatedKeywords: keywordResearch.relatedKeywords,
        geo: keywordResearch.geo,
        approximateTraffic: keywordResearch.approximateTraffic,
        researchedAt: keywordResearch.researchedAt
      },
      image,
      imageAlt: editorial.imageAlt || stockImage?.alt || editorial.title,
      imageCredit: stockImage?.credit,
      imageCreditUrl: stockImage?.pageUrl,
      ogImage: generatedOgPath(editorial.title, category),
      slug: editorial.slug,
      metaTitle: editorial.metaTitle,
      metaDescription: editorial.metaDescription,
      status: shouldPublish ? "published" : "draft",
      tags: editorial.tags,
      publishedAt: entry.publishedAt?.toISOString()
    });
    const slug = await uniqueArticleSlug(initialPayload.slug, entry.link);
    const articlePayload = slug === initialPayload.slug ? initialPayload : normalizeArticlePayload({ ...initialPayload, slug });

    const article = await Article.create({
      ...articlePayload,
      publishedAt: shouldPublish ? entry.publishedAt || new Date() : undefined
    });
    await publishArticleToX(article);
    if (shouldPublish) publishedToday += 1;
    created.push(article);
  }

  source.lastFetchedAt = new Date();
  await source.save();

  return { created, skipped, aiSkipped, total: entries.length };
}

export function sourceSlug(name: string) {
  return categorySlug(name);
}















