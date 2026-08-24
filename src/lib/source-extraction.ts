export type ExtractedArticle = {
  ok: boolean;
  text: string;
  wordCount: number;
  paragraphs: string[];
  title?: string;
  reason?: string;
  authoritativeLinks: Array<{ url: string; label: string }>;
};

/**
 * Domains whose pages are safe, stable citation targets. Outbound links are harvested
 * from the source page rather than generated, so a model can never invent a URL.
 */
const AUTHORITATIVE_HOSTS = [
  "who.int", "un.org", "unicef.org", "imf.org", "worldbank.org", "wto.org", "unesco.org",
  "europa.eu", "oecd.org", "nato.int", "icrc.org", "unhcr.org", "fao.org", "ilo.org",
  "nasa.gov", "noaa.gov", "cdc.gov", "nih.gov", "fda.gov", "usgs.gov", "state.gov",
  "sec.gov", "federalreserve.gov", "bls.gov", "census.gov", "ec.europa.eu",
  "sbp.org.pk", "pbs.gov.pk", "na.gov.pk", "pmd.gov.pk", "nadra.gov.pk",
  "reuters.com", "apnews.com", "bbc.co.uk", "bbc.com", "theguardian.com", "npr.org",
  "nature.com", "science.org", "thelancet.com", "nejm.org", "arxiv.org", "ieee.org"
];

const NAVIGATION_PATH = /\b(account|login|sign-?in|sign-?up|register|subscribe|newsletter|privacy|terms|cookies?|contact|about|help|support|search|tags?|topics?|categor(y|ies)|archive|feed|rss|sitemap|advertis|careers?|jobs)\b/i;

/** bbc.co.uk and bbc.com share an organisation; a self-link is not an external citation. */
function organizationKey(host: string) {
  const labels = host.toLowerCase().replace(/^www\./, "").split(".");
  const suffixes = new Set(["com", "org", "net", "gov", "edu", "int", "co", "uk", "pk", "us", "eu", "io"]);
  while (labels.length > 1 && suffixes.has(labels[labels.length - 1])) labels.pop();
  return labels[labels.length - 1] || host;
}

/** Section fronts and homepages carry no citable claim; require an article-shaped path. */
function isArticleShapedPath(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length < 2) return false;
  const last = segments[segments.length - 1];
  return last.length > 12 || last.includes("-") || /\d/.test(last);
}

function isAuthoritativeUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    if (NAVIGATION_PATH.test(url.pathname)) return false;
    if (!isArticleShapedPath(url.pathname)) return false;
    if (host.endsWith(".gov") || host.endsWith(".edu") || host.endsWith(".int")) return true;
    return AUTHORITATIVE_HOSTS.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
  } catch {
    return false;
  }
}

function harvestAuthoritativeLinks(html: string, sourceHost: string) {
  const found = new Map<string, string>();
  const sourceOrganization = organizationKey(sourceHost);
  for (const match of html.matchAll(/<a\b[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const [, href, inner] = match;
    if (!isAuthoritativeUrl(href)) continue;
    let host = "";
    try {
      host = new URL(href).hostname.replace(/^www\./, "");
    } catch {
      continue;
    }
    if (organizationKey(host) === sourceOrganization) continue;
    const label = stripTags(inner).slice(0, 80);
    if (!label || label.split(/\s+/).length > 14) continue;
    if (!found.has(href)) found.set(href, label);
    if (found.size >= 6) break;
  }
  return [...found].map(([url, label]) => ({ url, label }));
}

const BOILERPLATE = [
  /^advertisement$/i,
  /^sponsored/i,
  /cookie|consent|privacy policy|terms of (use|service)/i,
  /subscribe|newsletter|sign up|sign in|log in|create an account/i,
  /follow us|share this|read more|related stories|most read|trending now/i,
  /^copyright|^all rights reserved|^©/i,
  /^(photo|image|picture|file photo|getty|reuters|ap photo|afp)[:\s]/i,
  /^by\s+[a-z .'-]+$/i,
  /^published\s|^updated\s|^last updated/i,
  /javascript is disabled|enable javascript|browser (is )?not supported/i
];

const DEFAULT_USER_AGENT =
  process.env.SOURCE_FETCH_USER_AGENT ||
  "Mozilla/5.0 (compatible; NovexaNewsBot/1.0; +https://www.novexa.news/about)";

function decodeEntities(value = "") {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&(?:apos|#39|rsquo|lsquo);/gi, "'")
    .replace(/&(?:ldquo|rdquo);/gi, '"')
    .replace(/&(?:ndash|mdash);/gi, "-")
    .replace(/&hellip;/gi, "...")
    .replace(/&#(\d+);/g, (_match, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_match, code) => String.fromCharCode(parseInt(code, 16)));
}

function stripTags(value = "") {
  return decodeEntities(value.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function removeNoise(html: string) {
  return html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|template|svg|iframe|form|select|button)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<(nav|header|footer|aside)\b[\s\S]*?<\/\1>/gi, " ");
}

function isBoilerplate(paragraph: string) {
  return BOILERPLATE.some((pattern) => pattern.test(paragraph));
}

function usableParagraphs(candidates: string[]) {
  const seen = new Set<string>();
  return candidates
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => {
      if (paragraph.split(/\s+/).filter(Boolean).length < 12) return false;
      if (isBoilerplate(paragraph)) return false;
      const key = paragraph.toLowerCase().slice(0, 120);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function fromJsonLd(html: string) {
  const blocks = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const block of blocks) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(decodeEntities(block[1].trim()));
    } catch {
      continue;
    }
    const queue = Array.isArray(parsed) ? [...parsed] : [parsed];
    while (queue.length) {
      const node = queue.shift() as Record<string, unknown> | null;
      if (!node || typeof node !== "object") continue;
      if (Array.isArray((node as { "@graph"?: unknown[] })["@graph"])) {
        queue.push(...((node as { "@graph": unknown[] })["@graph"]));
      }
      const body = node.articleBody;
      if (typeof body === "string" && body.trim().split(/\s+/).length > 60) {
        return {
          paragraphs: body.split(/\n+/).map(stripTags).filter(Boolean),
          title: typeof node.headline === "string" ? node.headline : undefined
        };
      }
    }
  }
  return null;
}

function fromParagraphs(html: string) {
  const cleaned = removeNoise(html);
  const containerMatch =
    cleaned.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i) ||
    cleaned.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i) ||
    cleaned.match(/<div[^>]+(?:class|id)=["'][^"']*(?:article-?body|story-?body|post-?content|entry-content|content__body|rich-text)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
  const scope = containerMatch?.[1] || cleaned;
  const paragraphs = [...scope.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map((match) => stripTags(match[1]));
  return { paragraphs, title: undefined };
}

function pageTitle(html: string) {
  const og = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1];
  const tag = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  return stripTags(og || tag || "") || undefined;
}

export async function extractSourceArticle(url: string, timeoutMs = 12000): Promise<ExtractedArticle> {
  const empty = { text: "", wordCount: 0, paragraphs: [] as string[], authoritativeLinks: [] };

  let target: URL;
  try {
    target = new URL(url);
  } catch {
    return { ok: false, ...empty, reason: "invalid-url" };
  }
  if (!["http:", "https:"].includes(target.protocol)) {
    return { ok: false, ...empty, reason: "unsupported-protocol" };
  }

  let html = "";
  try {
    const response = await fetch(target, {
      headers: {
        "User-Agent": DEFAULT_USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9"
      },
      redirect: "follow",
      signal: AbortSignal.timeout(timeoutMs)
    });
    if (!response.ok) return { ok: false, ...empty, reason: `http-${response.status}` };
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("html")) return { ok: false, ...empty, reason: "non-html" };
    html = await response.text();
  } catch (error) {
    const message = error instanceof Error ? error.message : "fetch-failed";
    return { ok: false, ...empty, reason: /timeout|aborted/i.test(message) ? "timeout" : "fetch-failed" };
  }

  const structured = fromJsonLd(html);
  const fallback = fromParagraphs(html);
  const structuredParagraphs = usableParagraphs(structured?.paragraphs || []);
  const fallbackParagraphs = usableParagraphs(fallback.paragraphs);
  const paragraphs = structuredParagraphs.join(" ").length >= fallbackParagraphs.join(" ").length
    ? structuredParagraphs
    : fallbackParagraphs;

  const text = paragraphs.join("\n\n");
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const authoritativeLinks = harvestAuthoritativeLinks(html, target.hostname.replace(/^www\./, ""));

  if (wordCount < 120) {
    return {
      ok: false,
      text,
      wordCount,
      paragraphs,
      authoritativeLinks,
      reason: wordCount ? "too-short" : "no-content-found"
    };
  }

  return {
    ok: true,
    text,
    wordCount,
    paragraphs,
    authoritativeLinks,
    title: structured?.title || pageTitle(html)
  };
}
