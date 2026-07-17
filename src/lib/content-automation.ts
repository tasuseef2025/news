import { absoluteUrl } from "@/lib/utils";

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
};

export function generateSlug(value = "") {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || `article-${Date.now()}`;
}

export function stripHtml(value = "") {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export function generateExcerpt(content = "", max = 155) {
  const text = stripHtml(content);
  if (text.length <= max) return text;
  return `${text.slice(0, max).replace(/\s+\S*$/, "")}...`;
}

export function generateReadingTime(content = "") {
  const words = stripHtml(content).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 220));
}

export function generateStructuredData(article: Required<Pick<ArticleLike, "title" | "slug">> & ArticleLike) {
  const canonicalUrl = article.canonicalUrl || absoluteUrl(`/news/${article.slug}`);
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title,
    alternativeHeadline: article.metaTitle,
    description: article.metaDescription || article.excerpt,
    image: [article.ogImage || article.image].filter(Boolean),
    author: { "@type": "Person", name: article.author || "Newsroom" },
    publisher: {
      "@type": "Organization",
      name: "Newsroom",
      logo: { "@type": "ImageObject", url: absoluteUrl("/icon.png") }
    },
    articleSection: article.category,
    wordCount: stripHtml(article.content || "").split(/\s+/).filter(Boolean).length,
    timeRequired: `PT${article.readingTime || generateReadingTime(article.content || "")}M`,
    isAccessibleForFree: true,
    mainEntityOfPage: canonicalUrl
  });
}

export function normalizeArticlePayload<T extends ArticleLike>(payload: T) {
  const title = payload.title?.trim() || "Untitled Article";
  const slug = payload.slug?.trim() ? generateSlug(payload.slug) : generateSlug(title);
  const excerpt = payload.excerpt?.trim() || generateExcerpt(payload.content || title, 220);
  const metaTitle = payload.metaTitle?.trim() || title.slice(0, 70);
  const metaDescription = payload.metaDescription?.trim() || generateExcerpt(excerpt || payload.content || title, 160);
  const canonicalUrl = payload.canonicalUrl?.trim() || absoluteUrl(`/news/${slug}`);
  const ogImage = payload.ogImage?.trim() || absoluteUrl(`/api/og?title=${encodeURIComponent(title)}&category=${encodeURIComponent(payload.category || "News")}`);
  const readingTime = payload.readingTime || generateReadingTime(payload.content || "");
  const schemaMarkup = payload.schemaMarkup?.trim() || generateStructuredData({
    ...payload,
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
  if (payload.title !== undefined || payload.slug !== undefined) {
    const title = payload.title?.trim();
    if (title) next.title = title;
    next.slug = payload.slug?.trim() ? generateSlug(payload.slug) : title ? generateSlug(title) : payload.slug;
    if (title && !payload.metaTitle?.trim()) next.metaTitle = title.slice(0, 70);
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


