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
    return ["ichef.bbci.co.uk", "media.npr.org", "media.guim.co.uk", "www.nasa.gov", "assets.science.nasa.gov"].some(
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
    const response = await fetch(url, { headers: { "User-Agent": "NewsroomBot/1.0" }, signal: AbortSignal.timeout(6000) });
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

function humanContent(entry: FeedEntry, sourceName: string) {
  const summary = humanSummary(entry);
  const categoryLine = entry.category ? `The story was tagged by the source under ${entry.category}.` : "The story is being monitored as a developing newsroom item.";
  const publisher = sourceHost(entry.link);

  return [
    summary,
    "This article is an original newsroom brief based on publicly available feed metadata. It does not reproduce the publisher's full report; readers should follow the source link for the complete original coverage.",
    `What happened: ${summary}`,
    `Why it matters: The update may affect readers following ${entry.category || "this topic"}, policy developments, markets, public services, or communities connected to the story. Our newsroom is tracking it because it fits the ${entry.category || "news"} desk and may develop further as more verified details emerge.`,
    `Context: ${categoryLine} Automated publishing systems can surface fast-moving stories quickly, but editorial review should still check names, figures, quotes, legal sensitivity, and local relevance before heavy promotion.`,
    "What to watch next: Look for official statements, confirmed timelines, responses from affected parties, and whether other credible outlets independently verify the same details.",
    `Source attribution: ${sourceName} via ${publisher}. Original report: ${entry.link}`
  ].join("\n\n");
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

export async function ingestFeedSource(sourceId: string) {
  const source = await FeedSource.findById(sourceId);
  if (!source) throw new Error("Feed source not found");

  const response = await fetch(source.url, { headers: { "User-Agent": "NewsroomBot/1.0" }, signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error(`Feed fetch failed: ${response.status}`);

  const xml = await response.text();
  const entries = parseFeed(xml).slice(0, 20);
  const created = [];
  const skipped = [];

  for (const entry of entries) {
    const exists = await Article.exists({ sourceUrl: entry.link });
    if (exists) {
      skipped.push(entry.link);
      continue;
    }

    const image = firstImageUrl(entry.image) || (await ogImage(entry.link));
    const category = autoCategory(entry, source.defaultCategory);
    const content = humanContent(entry, source.name);
    const initialPayload = normalizeArticlePayload({
      title: entry.title,
      excerpt: humanSummary(entry),
      content,
      category,
      author: source.name,
      sourceName: source.name,
      sourceUrl: entry.link,
      image: image || `/api/og?title=${encodeURIComponent(entry.title)}&category=${encodeURIComponent(category)}`,
      status: source.autoPublish ? "published" : "draft",
      tags: [category, ...(entry.category ? [entry.category] : [])].filter(Boolean),
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
