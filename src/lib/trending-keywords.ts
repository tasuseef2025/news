import { cleanText } from "@/lib/content-automation";
import type { FeedEntry } from "@/lib/feed-ingestion";

export type KeywordResearch = {
  primaryKeyword: string;
  relatedKeywords: string[];
  source: "google-trends" | "editorial";
  geo?: string;
  approximateTraffic?: number;
  researchedAt: Date;
};

type TrendItem = {
  query: string;
  approximateTraffic: number;
  geo: string;
  newsTitles: string[];
};

type TrendCache = {
  expiresAt: number;
  items: TrendItem[];
};

const cache = new Map<string, TrendCache>();
const CACHE_MS = 15 * 60 * 1000;
const STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "been", "by", "for", "from", "has", "have", "how",
  "in", "into", "is", "it", "latest", "news", "of", "on", "or", "that", "the", "this", "to", "update",
  "was", "were", "what", "when", "where", "which", "who", "why", "with", "year", "today", "result", "results",
  "breaking", "official", "2025", "2026"
]);

function decodeEntities(value = "") {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&#(\d+);/g, (_match, code) => String.fromCharCode(Number(code)))
    .trim();
}

function readTag(block: string, tag: string) {
  const match = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return decodeEntities(match?.[1] || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function readTags(block: string, tag: string) {
  return [...block.matchAll(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "gi"))]
    .map((match) => decodeEntities(match[1] || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function tokenize(value = "") {
  return cleanText(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/[\s-]+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));
}

function approximateTraffic(value = "") {
  const normalized = value.trim().toUpperCase().replace(/,/g, "");
  const parsed = Number(normalized.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(parsed)) return 0;
  if (normalized.includes("M")) return Math.round(parsed * 1_000_000);
  if (normalized.includes("K")) return Math.round(parsed * 1_000);
  return Math.round(parsed);
}

async function fetchGeoTrends(geo: string): Promise<TrendItem[]> {
  const cached = cache.get(geo);
  if (cached && cached.expiresAt > Date.now()) return cached.items;

  const response = await fetch(`https://trends.google.com/trending/rss?geo=${encodeURIComponent(geo)}`, {
    headers: { "User-Agent": "NovexaNewsBot/1.0" },
    signal: AbortSignal.timeout(8000),
    cache: "no-store"
  });
  if (!response.ok) throw new Error(`Google Trends RSS returned ${response.status} for ${geo}`);

  const xml = await response.text();
  const items = [...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)]
    .map((match) => {
      const block = match[1];
      return {
        query: readTag(block, "title"),
        approximateTraffic: approximateTraffic(readTag(block, "ht:approx_traffic")),
        geo,
        newsTitles: readTags(block, "ht:news_item_title")
      };
    })
    .filter((item) => item.query);

  cache.set(geo, { expiresAt: Date.now() + CACHE_MS, items });
  return items;
}

function relevance(item: TrendItem, storyText: string) {
  const storyTokens = new Set(tokenize(storyText));
  const queryTokens = tokenize(item.query);
  if (!queryTokens.length) return 0;

  const overlap = queryTokens.filter((token) => storyTokens.has(token)).length;
  const minimumOverlap = queryTokens.length === 1 ? 1 : 2;
  if (overlap < Math.min(minimumOverlap, queryTokens.length)) return 0;

  const queryCoverage = overlap / queryTokens.length;
  const newsContext = item.newsTitles.join(" ");
  const contextTokens = new Set(tokenize(newsContext));
  const storyContextOverlap = [...contextTokens].filter((token) => storyTokens.has(token)).length;
  const contextScore = Math.min(1, storyContextOverlap / 4);
  const phraseMatch = cleanText(storyText).toLowerCase().includes(item.query.toLowerCase()) ? 0.2 : 0;

  return queryCoverage * 0.7 + contextScore * 0.1 + phraseMatch;
}

function editorialKeyword(entry: FeedEntry) {
  const words = tokenize(entry.title).slice(0, 7);
  return words.join(" ") || cleanText(entry.title).toLowerCase();
}

function relatedKeywords(primaryKeyword: string, entry: FeedEntry) {
  const titleKeyword = editorialKeyword(entry);
  return [
    primaryKeyword,
    titleKeyword,
    `${primaryKeyword} latest`,
    `${primaryKeyword} what happened`
  ]
    .map((keyword) => keyword.trim().toLowerCase())
    .filter((keyword, index, all) => keyword && all.indexOf(keyword) === index)
    .slice(0, 5);
}

export async function researchKeywords(entry: FeedEntry): Promise<KeywordResearch> {
  const fallback = editorialKeyword(entry);
  const researchedAt = new Date();

  if (process.env.FEED_TRENDS_ENABLED === "false") {
    return { primaryKeyword: fallback, relatedKeywords: relatedKeywords(fallback, entry), source: "editorial", researchedAt };
  }

  const geos = (process.env.FEED_TRENDS_GEOS || "US,PK,GB,IN")
    .split(",")
    .map((geo) => geo.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 6);

  const settled = await Promise.allSettled(geos.map(fetchGeoTrends));
  const trends = settled.flatMap((result) => result.status === "fulfilled" ? result.value : []);
  const storyText = `${entry.title} ${entry.description} ${entry.category || ""}`;
  const matches = trends
    .map((trend) => ({ trend, score: relevance(trend, storyText) }))
    .filter((match) => match.score >= 0.55)
    .sort((left, right) => right.trend.approximateTraffic - left.trend.approximateTraffic || right.score - left.score);

  const best = matches[0]?.trend;
  if (!best) {
    return { primaryKeyword: fallback, relatedKeywords: relatedKeywords(fallback, entry), source: "editorial", researchedAt };
  }

  return {
    primaryKeyword: best.query.toLowerCase(),
    relatedKeywords: relatedKeywords(best.query, entry),
    source: "google-trends",
    geo: best.geo,
    approximateTraffic: best.approximateTraffic,
    researchedAt
  };
}
