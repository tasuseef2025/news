import { createHash } from "crypto";
import { categories, categorySlug } from "@/lib/categories";
import { normalizeArticlePayload, stripHtml } from "@/lib/content-automation";
import { Article } from "@/models/Article";
import { FeedSource } from "@/models/FeedSource";

export type FeedEntry = {
  title: string;
  link: string;
  description: string;
  publishedAt?: Date;
  image?: string;
  category?: string;
};

type EditorialPackage = {
  title: string;
  excerpt: string;
  content: string;
  metaTitle: string;
  metaDescription: string;
  tags: string[];
};

function decodeEntities(value = "") {
  return value
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
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
  const clean = text.length > 260 ? `${text.slice(0, 260).replace(/\s+\S*$/, "")}...` : text;
  return clean || `A developing story is being tracked from ${new URL(entry.link).hostname}.`;
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

function compactText(value = "", max = 1800) {
  const text = stripHtml(value).replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max).replace(/\s+\S*$/, "")}...` : text;
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
  const title = stripHtml(input.title).replace(/\s+/g, " ").trim().slice(0, 95);
  const content = stripHtml(input.content).replace(/\n{3,}/g, "\n\n").trim();
  if (!title || content.split(/\s+/).filter(Boolean).length < 180) return null;

  const excerpt = stripHtml(input.excerpt || humanSummary(entry)).slice(0, 240);
  const metaTitle = stripHtml(input.metaTitle || title).slice(0, 68);
  const metaDescription = stripHtml(input.metaDescription || excerpt).slice(0, 158);

  return {
    title,
    excerpt,
    content: `${content}\n\nSource: ${sourceName} - ${entry.link}`,
    metaTitle,
    metaDescription,
    tags: cleanTags(Array.isArray(input.tags) ? input.tags : [], category, entry.category)
  };
}

async function editorialPackage(entry: FeedEntry, sourceName: string, category: string) {
  return (await aiEditorialPackage(entry, sourceName, category)) || fallbackEditorialPackage(entry, sourceName, category);
}

async function aiEditorialPackage(entry: FeedEntry, sourceName: string, category: string) {
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
        max_output_tokens: Number(process.env.FEED_AI_MAX_OUTPUT_TOKENS || 2200),
        input: [
          {
            role: "system",
            content:
              "You are a senior digital news editor for Novexa News. Create original, copyright-safe journalism from RSS/feed metadata only. You may use the source as reference, but never copy publisher sentences, structure, images, thumbnails, or distinctive phrasing. Do not invent facts, quotes, numbers, dates, allegations, causes, or outcomes. If feed details are thin, write a useful concise brief with context and attribution instead of pretending to know more. Write in a natural human newsroom voice, not a repetitive template. Return only valid JSON."
          },
          {
            role: "user",
            content: `Create a click-worthy but accurate editorial package for Novexa News.\n\nOriginal feed title: ${entry.title}\nCategory: ${category}\nSource: ${sourceName}\nSource URL: ${entry.link}\nFeed summary: ${compactText(entry.description || entry.title)}\nFeed tag: ${entry.category || "N/A"}\n\nReturn this JSON shape exactly:\n{\n  "title": "original SEO/news headline, 55-90 characters, no clickbait, not copied from source",\n  "excerpt": "one human summary sentence, 120-220 characters",\n  "metaTitle": "SEO title under 68 characters",\n  "metaDescription": "search description under 158 characters",\n  "tags": ["3 to 7 relevant tags"],\n  "content": "450-900 words when the feed has enough verified detail; use short paragraphs; add useful context, reader impact, and what remains unclear; include no markdown headings; do not say follow the source link; do not copy source wording"\n}\n\nQuality rules:\n- Optimize for Google Discover/Search CTR with clarity, specificity, and curiosity, not exaggeration.\n- Keep attribution inside the body naturally.\n- Make it sound written by an editor, not generated from a rigid template.\n- If the story is sensitive, legal, health, conflict, crime, politics, or death-related, use cautious language and avoid sensational phrasing.\n- Do not include any image URL.`
          }
        ]
      })
    });

    if (!response.ok) return null;
    const data = await response.json();
    const text = typeof data.output_text === "string"
      ? data.output_text
      : data.output?.flatMap((item: { content?: Array<{ text?: string }> }) => item.content || []).map((item: { text?: string }) => item.text).filter(Boolean).join("\n");

    return validateEditorialPackage(parseEditorialJson(text || ""), entry, sourceName, category);
  } catch {
    return null;
  }
}

function fallbackEditorialPackage(entry: FeedEntry, sourceName: string, category: string): EditorialPackage {
  const summary = humanSummary(entry);
  const source = sourceHost(entry.link);
  const title = entry.title.length > 90 ? `${entry.title.slice(0, 90).replace(/\s+\S*$/, "")}...` : entry.title;
  const content = [
    `${entry.title} is one of the latest updates being tracked by Novexa News from ${sourceName}. ${summary}`,
    `The story falls under the ${category} desk and may matter to readers following public affairs, markets, technology, communities, policy decisions, or global developments connected to the subject. The available feed detail is limited, so this report stays close to confirmed information instead of adding unverified claims.`,
    `Novexa News will continue watching for official statements, clearer timelines, responses from affected parties, and independent confirmation from credible sources. Editorial review is recommended before heavy promotion if the story involves legal, political, health, crime, or conflict-sensitive details.`,
    `Source: ${sourceName} via ${source} - ${entry.link}`
  ].join("\n\n");

  return {
    title,
    excerpt: summary.slice(0, 220),
    content,
    metaTitle: title.slice(0, 68),
    metaDescription: summary.slice(0, 158),
    tags: cleanTags([], category, entry.category)
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

async function feedImage(entry: FeedEntry, title: string, category: string) {
  const generated = generatedOgPath(title, category);
  const sourceImage = firstImageUrl(entry.image) || (await ogImage(entry.link));
  if (!sourceImage) return generated;
  if (isLowRiskAutoImageUrl(sourceImage)) return sourceImage;
  if (process.env.FEED_USE_SOURCE_IMAGES === "true") return sourceImage;
  return generated;
}

export async function ingestFeedSource(sourceId: string) {
  const source = await FeedSource.findById(sourceId);
  if (!source) throw new Error("Feed source not found");

  const response = await fetch(source.url, { headers: { "User-Agent": "NovexaNewsBot/1.0" }, signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error(`Feed fetch failed: ${response.status}`);

  const xml = await response.text();
  const entries = parseFeed(xml).slice(0, Number(process.env.FEED_IMPORT_LIMIT || 12));
  const created = [];
  const skipped = [];

  for (const entry of entries) {
    const duplicate = await hasDuplicateArticle(entry);
    if (duplicate) {
      skipped.push(entry.link);
      continue;
    }

    const category = autoCategory(entry, source.defaultCategory);
    const editorial = await editorialPackage(entry, source.name, category);
    const image = await feedImage(entry, editorial.title, category);
    const initialPayload = normalizeArticlePayload({
      title: editorial.title,
      excerpt: editorial.excerpt,
      content: editorial.content,
      category,
      author: source.name,
      sourceName: source.name,
      sourceUrl: entry.link,
      image,
      ogImage: generatedOgPath(editorial.title, category),
      metaTitle: editorial.metaTitle,
      metaDescription: editorial.metaDescription,
      status: source.autoPublish ? "published" : "draft",
      tags: editorial.tags,
      publishedAt: entry.publishedAt?.toISOString()
    });
    const slug = await uniqueArticleSlug(initialPayload.slug, entry.link);
    const articlePayload = slug === initialPayload.slug ? initialPayload : normalizeArticlePayload({ ...initialPayload, slug });

    const article = await Article.create({
      ...articlePayload,
      publishedAt: source.autoPublish ? entry.publishedAt || new Date() : undefined
    });
    created.push(article);
  }

  source.lastFetchedAt = new Date();
  await source.save();

  return { created, skipped, total: entries.length };
}

export function sourceSlug(name: string) {
  return categorySlug(name);
}
