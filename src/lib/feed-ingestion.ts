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

function imageFromEntry(block: string) {
  return (
    readAttr(block, "media:content", "url") ||
    readAttr(block, "media:thumbnail", "url") ||
    readAttr(block, "enclosure", "url") ||
    block.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1] ||
    ""
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
    return html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1] || "";
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

function humanContent(entry: FeedEntry, sourceName: string) {
  const summary = humanSummary(entry);
  return [
    summary,
    "This newsroom brief was automatically prepared from a monitored public feed and rewritten as a concise summary for readers.",
    `Source attribution: ${sourceName}. Read the original report at ${entry.link}`
  ].join("\n\n");
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

    const image = entry.image || (await ogImage(entry.link));
    const category = autoCategory(entry, source.defaultCategory);
    const content = humanContent(entry, source.name);
    const articlePayload = normalizeArticlePayload({
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
