import { absoluteUrl } from "@/lib/utils";
import { siteConfig, socialSameAs } from "@/lib/site";
import { authorProfilePath } from "@/lib/authors";

type ArticleLike = {
  title?: string;
  slug?: string;
  excerpt?: string;
  content?: string;
  author?: string;
  image?: string;
  category?: string;
  metaTitle?: string;
  metaDescription?: string;
  ogImage?: string;
  canonicalUrl?: string;
  schemaMarkup?: string;
  readingTime?: number;
  sourceName?: string;
  sourceUrl?: string;
  originalSourceName?: string;
  originalSourceUrl?: string;
  references?: Array<{ name: string; url: string; publishedAt?: string | Date }>;
  generationMode?: "manual" | "ai" | "feed";
  primaryKeyword?: string;
  keywordResearch?: {
    source: "google-trends" | "editorial";
    relatedKeywords: string[];
    geo?: string;
    approximateTraffic?: number;
    researchedAt: Date;
  };
  imageCredit?: string;
  imageCreditUrl?: string;
  publishedAt?: string | Date;
  updatedAt?: string | Date;
};

export function generateSlug(value = "") {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || `article-${Date.now()}`;
}

export function cleanText(value = "") {
  return value
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, "$1")
    .replace(/<[^>]*>/g, " ")
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_match, code) => String.fromCharCode(Number(code)))
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/(^|\s)[*_]{1,3}(?=\s|$)/g, " ")
    .replace(/\s+([,.!?;:])/g, "$1")
    .replace(/\.{3,}/g, ".")
    .replace(/\s+/g, " ")
    .trim();
}

export function stripHtml(value = "") {
  return cleanText(value);
}

/**
 * Converts the generator's "H2: Heading" convention into canonical markdown, so
 * a literal marker can never reach a rendered page. Applied on every save via
 * normalizeArticlePayload. Markers appearing mid-paragraph are deliberately left
 * alone: those signal a malformed body and are rejected by the publish gate
 * rather than silently patched here.
 */
export function normalizeHeadingMarkers(content = "") {
  return content
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.replace(/^\s*h([1-6]):\s*/i, (_match, level: string) => `${"#".repeat(Number(level))} `))
    .join("\n");
}

export function generateExcerpt(content = "", max = 155) {
  const text = stripHtml(content);
  if (text.length <= max) return text;
  return text.slice(0, max).replace(/\s+\S*$/, "").replace(/[\s.,;:!?-]+$/, "");
}

export function generateReadingTime(content = "") {
  const words = stripHtml(content).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 220));
}

export function generateMetaTitle(title = "", max = 55) {
  const clean = cleanText(title).replace(/\s+\|\s+Novexa News$/i, "").trim() || "Latest News";
  if (clean.length <= max) return clean;
  return clean.slice(0, max).replace(/\s+\S*$/, "").replace(/[\s.,;:!?-]+$/, "");
}

export function generateStructuredData(article: Required<Pick<ArticleLike, "title" | "slug">> & ArticleLike) {
  const canonicalUrl = absoluteUrl(`/news/${article.slug}`);
  const authorName = article.author || `${siteConfig.name} Desk`;
  const author = authorName === `${siteConfig.name} Desk` || authorName === "Novexa News Desk"
    ? { "@type": "Organization", name: authorName, url: absoluteUrl("/about") }
    : {
        "@type": "Person",
        name: authorName,
        url: absoluteUrl(authorProfilePath(authorName))
      };
  const citations = [
    ...(article.references || []).map((reference) => reference.url),
    article.originalSourceUrl,
    article.sourceUrl
  ].filter((value, index, values): value is string => Boolean(value) && values.indexOf(value) === index);

  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title,
    alternativeHeadline: article.metaTitle,
    description: article.metaDescription || article.excerpt,
    image: [article.ogImage || article.image].filter(Boolean),
    author,
    publisher: {
      "@type": "Organization",
      name: siteConfig.name,
      logo: { "@type": "ImageObject", url: absoluteUrl(siteConfig.iconPath) },
      sameAs: socialSameAs()
    },
    articleSection: article.category,
    inLanguage: "en",
    datePublished: article.publishedAt,
    dateModified: article.updatedAt || article.publishedAt,
    copyrightHolder: { "@type": "Organization", name: siteConfig.name },
    isBasedOn: article.originalSourceUrl || article.sourceUrl,
    citation: citations.length ? citations : undefined,
    wordCount: stripHtml(article.content || "").split(/\s+/).filter(Boolean).length,
    timeRequired: `PT${article.readingTime || generateReadingTime(article.content || "")}M`,
    isAccessibleForFree: true,
    mainEntityOfPage: { "@type": "WebPage", "@id": canonicalUrl }
  });
}

export function normalizeArticlePayload<T extends ArticleLike>(payload: T) {
  const title = payload.title?.trim() || "Untitled Article";
  const slug = payload.slug?.trim() ? generateSlug(payload.slug) : generateSlug(title);
  const content = payload.content === undefined ? payload.content : normalizeHeadingMarkers(payload.content);
  const excerpt = payload.excerpt?.trim() || generateExcerpt(content || title, 220);
  const metaTitle = payload.metaTitle?.trim() || generateMetaTitle(title);
  const metaDescription = payload.metaDescription?.trim() || generateExcerpt(excerpt || content || title, 160);
  const canonicalUrl = absoluteUrl(`/news/${slug}`);
  const ogImage = payload.ogImage?.trim() || absoluteUrl(`/api/og?title=${encodeURIComponent(title)}&category=${encodeURIComponent(payload.category || "News")}`);
  const readingTime = payload.readingTime || generateReadingTime(content || "");
  const schemaMarkup = payload.schemaMarkup?.trim() || generateStructuredData({
    ...payload,
    content,
    title,
    slug,
    excerpt,
    metaTitle,
    metaDescription,
    canonicalUrl,
    ogImage,
    readingTime
  });

  return {
    ...payload,
    title,
    slug,
    content,
    excerpt,
    metaTitle,
    metaDescription,
    canonicalUrl,
    ogImage,
    readingTime,
    schemaMarkup
  };
}


export function normalizeArticleUpdate<T extends ArticleLike>(payload: T) {
  const next = { ...payload };
  if (payload.content !== undefined) next.content = normalizeHeadingMarkers(payload.content);
  if (payload.title !== undefined || payload.slug !== undefined) {
    const title = payload.title?.trim();
    if (title) next.title = title;
    next.slug = payload.slug?.trim() ? generateSlug(payload.slug) : title ? generateSlug(title) : payload.slug;
    if (title && !payload.metaTitle?.trim()) next.metaTitle = generateMetaTitle(title);
  }
  if (payload.content !== undefined && !payload.readingTime) {
    next.readingTime = generateReadingTime(payload.content || "");
  }
  if ((payload.excerpt !== undefined || payload.content !== undefined) && !payload.metaDescription?.trim()) {
    next.metaDescription = generateExcerpt(payload.excerpt || payload.content || "", 160);
  }
  if ((next.slug || payload.title) && !payload.canonicalUrl?.trim()) {
    next.canonicalUrl = absoluteUrl(`/news/${next.slug || generateSlug(payload.title)}`);
  }
  if ((payload.title || payload.category) && !payload.ogImage?.trim()) {
    next.ogImage = absoluteUrl(`/api/og?title=${encodeURIComponent(payload.title || "News")}&category=${encodeURIComponent(payload.category || "News")}`);
  }
  if (!payload.schemaMarkup?.trim() && payload.title && next.slug) {
    next.schemaMarkup = generateStructuredData({ ...next, title: payload.title, slug: next.slug });
  }
  return next;
}
export function articleBreadcrumbs(article: { title: string; slug: string; category?: string }) {
  const items = [
    { name: "Home", href: absoluteUrl("/") },
    article.category ? { name: article.category, href: absoluteUrl(`/category/${generateSlug(article.category)}`) } : null,
    { name: article.title, href: absoluteUrl(`/news/${article.slug}`) }
  ].filter(Boolean);

  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item?.name,
      item: item?.href
    }))
  });
}







