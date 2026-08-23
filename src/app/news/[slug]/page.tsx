import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { getArticleBySlug, serializeArticle } from "@/lib/articles";
import { absoluteUrl } from "@/lib/utils";
import { siteConfig } from "@/lib/site";
import { articleBreadcrumbs, generateStructuredData } from "@/lib/content-automation";
import { connectDB } from "@/lib/db";
import { Article } from "@/models/Article";
import { GoogleSwgBasic } from "@/components/seo/google-swg-basic";
import { CommentsSection } from "@/features/comments/comments-section";
import { ArticleShare } from "@/features/articles/article-share";
import { ArticleViewCounter } from "@/features/articles/article-view-counter";
import { isArticleIndexable, publicArticleFilter } from "@/lib/public-articles";
import { ArticleImage } from "@/components/media/article-image";
import { authorProfilePath } from "@/lib/authors";

type Props = {
  params: Promise<{ slug: string }>;
};

function displayImage(value: string) {
  return value?.startsWith("/") ? absoluteUrl(value) : value;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) return {};

  const canonical = absoluteUrl(`/news/${article.slug}`);
  const image = displayImage(article.ogImage || article.image || `/api/og?title=${encodeURIComponent(article.title)}&category=${encodeURIComponent(article.category)}`);
  const indexable = isArticleIndexable(article);

  return {
    title: article.metaTitle || article.title,
    description: article.metaDescription || article.excerpt,
    alternates: { canonical },
    robots: {
      index: indexable,
      follow: true,
      googleBot: {
        index: indexable,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1
      }
    },
    openGraph: {
      title: article.metaTitle || article.title,
      description: article.metaDescription || article.excerpt,
      images: [{ url: image, width: 1200, height: 630, alt: article.imageAlt || article.title }],
      type: "article",
      siteName: siteConfig.name,
      url: canonical,
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt,
      authors: [article.author || "Novexa News Desk"],
      section: article.category,
      tags: article.tags
    },
    twitter: {
      card: "summary_large_image",
      site: siteConfig.twitterHandle,
      creator: siteConfig.twitterHandle,
      title: article.metaTitle || article.title,
      description: article.metaDescription || article.excerpt,
      images: [image]
    },
    other: {
      news_keywords: article.tags?.join(", ") || article.category,
      "article:published_time": article.publishedAt,
      "article:modified_time": article.updatedAt || article.publishedAt
    }
  };
}

export default async function NewsArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);

  if (!article) notFound();

  await connectDB();
  const [related, topStories, latest] = await Promise.all([
    Article.find({ ...publicArticleFilter(), slug: { $ne: article.slug }, $or: [{ category: article.category }, { tags: { $in: article.tags || [] } }] })
      .sort({ publishedAt: -1 })
      .limit(4)
      .lean(),
    Article.find({ ...publicArticleFilter(), slug: { $ne: article.slug } })
      .sort({ trending: -1, views: -1, publishedAt: -1 })
      .limit(5)
      .lean(),
    Article.find({ ...publicArticleFilter(), slug: { $ne: article.slug } })
      .sort({ publishedAt: -1 })
      .limit(8)
      .lean()
  ]);

  const articleUrl = absoluteUrl(`/news/${article.slug}`);
  const shareImageUrl = absoluteUrl(`/api/og?title=${encodeURIComponent(article.title)}&category=${encodeURIComponent(article.category)}`);
  const breadcrumbSchema = articleBreadcrumbs(article);
  const showReportingBasis = article.generationMode !== "manual" || article.author === "Novexa News Desk";
  const schema = generateStructuredData({
    ...article,
    image: displayImage(article.image),
    ogImage: displayImage(article.ogImage || article.image),
    canonicalUrl: articleUrl
  });

  return (
    <main className="container py-7 md:py-10">
      <GoogleSwgBasic />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: schema }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: breadcrumbSchema }} />
      <nav className="mb-7 flex max-w-5xl flex-wrap gap-2 text-xs font-bold uppercase text-muted-foreground" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-primary">Home</Link>
        <span>/</span>
        <Link href={`/category/${article.category.toLowerCase().replaceAll(" ", "-")}`} className="hover:text-primary">{article.category}</Link>
        <span>/</span>
        <span className="max-w-xl truncate text-foreground">{article.title}</span>
      </nav>
      <article>
        <header className="mb-8 grid max-w-5xl gap-4 border-b pb-7">
          <div className="flex flex-wrap gap-2 text-sm font-bold uppercase text-primary">
            <Link href={`/category/${article.category.toLowerCase().replaceAll(" ", "-")}`} className="hover:text-foreground">{article.category}</Link>
            {article.subcategory ? <span>/ {article.subcategory}</span> : null}
            {article.breakingNews ? <span className="rounded-sm bg-primary px-2 text-primary-foreground">Breaking</span> : null}
          </div>
          <h1 className="font-editorial text-4xl font-bold leading-[1.05] md:text-6xl">{article.title}</h1>
          <p className="max-w-4xl text-lg leading-8 text-muted-foreground md:text-xl">{article.excerpt}</p>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <Link
              href={authorProfilePath(article.author)}
              className="font-semibold text-foreground hover:text-primary"
            >
              {article.author || "Novexa News Desk"}
            </Link>
            <span>Published {format(new Date(article.publishedAt), "PPP p")}</span>
            {article.updatedAt && new Date(article.updatedAt).getTime() > new Date(article.publishedAt).getTime() + 60_000 ? (
              <span>Updated {format(new Date(article.updatedAt), "PPP p")}</span>
            ) : null}
            <ArticleViewCounter articleId={article._id} initialViews={article.views} />
            <span>{article.readingTime ?? 1} min read</span>
          </div>
          <ArticleShare title={article.title} url={articleUrl} shareImageUrl={shareImageUrl} />
        </header>

        <div className="grid gap-10 lg:grid-cols-[minmax(0,780px)_minmax(280px,1fr)] lg:items-start lg:gap-12">
          <div className="min-w-0">
            <ArticleImage
              src={article.image}
              alt={article.imageAlt || article.title}
              title={article.title}
              category={article.category}
              width={1400}
              height={820}
              priority
              className="aspect-[16/9] w-full object-cover"
            />
            {article.imageCredit ? (
              <p className="mb-8 mt-2 border-b pb-3 text-xs text-muted-foreground">
                Image credit: {article.imageCreditUrl ? (
                  <a href={article.imageCreditUrl} target="_blank" rel="nofollow noopener noreferrer" className="underline hover:text-foreground">
                    {article.imageCredit}
                  </a>
                ) : article.imageCredit}
              </p>
            ) : <div className="mb-8" />}
            <ArticleContent content={article.content} />
            {showReportingBasis && (article.originalSourceName || article.sourceName) ? (
              <aside className="mt-8 border-l-4 border-primary bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                Reporting basis: {article.originalSourceUrl || article.sourceUrl ? (
                  <a href={article.originalSourceUrl || article.sourceUrl} target="_blank" rel="nofollow noopener noreferrer" className="font-semibold underline hover:text-foreground">
                    {article.originalSourceName || article.sourceName}
                  </a>
                ) : article.originalSourceName || article.sourceName}. Prepared from attributed source material and edited under the {" "}
                <Link href="/editorial-policy" className="font-semibold underline hover:text-foreground">Novexa News editorial policy</Link>.
              </aside>
            ) : null}
            {article.videoUrl ? (
              <div className="mt-8 border-y bg-card py-4">
                <h2 className="font-editorial mb-3 text-xl font-bold">Video</h2>
                <a href={article.videoUrl} className="font-bold text-primary" target="_blank" rel="noreferrer">
                  Watch video
                </a>
              </div>
            ) : null}
            {article.gallery?.length ? (
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {article.gallery.map((image) => (
                  <ArticleImage key={image} src={image} alt={article.imageAlt || article.title} title={article.title} category={article.category} width={900} height={560} className="aspect-[16/10] object-cover" />
                ))}
              </div>
            ) : null}
            {article.tags?.length ? (
              <div className="mt-8 flex flex-wrap gap-2 border-t pt-5">
                {article.tags.map((tag) => (
                  <Link key={tag} href={`/search?q=${encodeURIComponent(tag)}`} className="rounded-md border px-3 py-2 text-sm font-bold transition hover:border-primary hover:text-primary">
                    {tag}
                  </Link>
                ))}
              </div>
            ) : null}
            <CommentsSection articleId={article._id} allowComments={article.allowComments} />
          </div>

          <ArticleSidebar
            topStories={topStories.map(serializeArticle)}
            latest={latest.map(serializeArticle)}
          />
        </div>

        <ArticleRail title="Related Articles" articles={related.map(serializeArticle)} />
      </article>
    </main>
  );
}

function isExternalHref(href: string) {
  return /^https?:\/\//i.test(href) && !href.startsWith(absoluteUrl("/"));
}

/**
 * Renders inline markdown links so sourced citations become real anchors.
 * Anything that is not a well-formed http(s) link stays plain text.
 */
function renderInline(text: string, keyPrefix: string) {
  const nodes: React.ReactNode[] = [];
  const pattern = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    const [, label, href] = match;
    nodes.push(
      <a
        key={`${keyPrefix}-link-${match.index}`}
        href={href}
        className="font-semibold text-primary underline underline-offset-2 hover:text-primary/80"
        {...(isExternalHref(href) ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      >
        {label}
      </a>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes.length ? nodes : text;
}

function ArticleContent({ content }: { content: string }) {
  const blocks = content
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\s*\/\s*p\s*>\s*<\s*p[^>]*>/gi, "\n\n")
    .replace(/<\s*p[^>]*>/gi, "")
    .replace(/<\s*\/\s*p\s*>/gi, "")
    .split(/\n+/)
    .map((block) => block.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim())
    .filter(Boolean);

  return (
    <div className="prose prose-slate max-w-none dark:prose-invert">
      {blocks.map((block, index) => {
        if (/^(h2:|##\s+)/i.test(block)) {
          return <h2 key={`${block}-${index}`} className="font-editorial mb-4 mt-10 border-t pt-5 text-3xl font-bold">{block.replace(/^(h2:|##\s+)/i, "").trim()}</h2>;
        }

        if (/^(h3:|###\s+)/i.test(block)) {
          return <h3 key={`${block}-${index}`} className="font-editorial mb-3 mt-7 text-2xl font-bold">{block.replace(/^(h3:|###\s+)/i, "").trim()}</h3>;
        }

        return (
          <p key={`${block}-${index}`} className="font-editorial mb-6 text-[19px] leading-8">
            {renderInline(block, `${index}`)}
          </p>
        );
      })}
    </div>
  );
}
function ArticleRail({ title, articles }: { title: string; articles: ReturnType<typeof serializeArticle>[] }) {
  if (!articles.length) return null;
  return (
    <section className="mt-12 border-t-2 border-foreground pt-4">
      <h2 className="font-editorial mb-5 text-3xl font-bold">{title}</h2>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {articles.map((item) => (
          <a key={item.slug} href={`/news/${item.slug}`} className="group grid gap-2">
            <ArticleImage src={item.image} alt={item.imageAlt || item.title} title={item.title} category={item.category} width={520} height={320} loading="lazy" className="aspect-[16/10] object-cover" />
            <span className="font-editorial text-lg font-bold leading-tight group-hover:text-primary">{item.title}</span>
          </a>
        ))}
      </div>
    </section>
  );
}

function ArticleSidebar({
  topStories,
  latest
}: {
  topStories: ReturnType<typeof serializeArticle>[];
  latest: ReturnType<typeof serializeArticle>[];
}) {
  const topSlugs = new Set(topStories.map((item) => item.slug));
  const recentStories = latest.filter((item) => !topSlugs.has(item.slug)).slice(0, 5);

  return (
    <aside className="grid gap-9 lg:sticky lg:top-48" aria-label="More news">
      <section className="border-t-2 border-foreground pt-3">
        <h2 className="font-editorial border-b pb-3 text-2xl font-bold">Top Stories</h2>
        <div className="divide-y">
          {topStories.map((item, index) => (
            <Link key={item.slug} href={`/news/${item.slug}`} className="group grid grid-cols-[32px_1fr] gap-3 py-4">
              <span className="font-editorial text-xl font-bold text-primary">{String(index + 1).padStart(2, "0")}</span>
              <span className="font-editorial text-[17px] font-bold leading-5 group-hover:text-primary">{item.title}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-t-2 border-foreground pt-3">
        <div className="flex items-center justify-between gap-3 border-b pb-3">
          <h2 className="font-editorial text-2xl font-bold">Latest News</h2>
          <Link href="/" className="text-xs font-black uppercase text-primary hover:text-foreground">More</Link>
        </div>
        <div className="divide-y">
          {recentStories.map((item) => (
            <Link key={item.slug} href={`/news/${item.slug}`} className="group grid grid-cols-[88px_1fr] gap-3 py-4">
              <ArticleImage src={item.image} alt={item.imageAlt || item.title} title={item.title} category={item.category} width={176} height={112} loading="lazy" className="aspect-[4/3] object-cover" />
              <span className="font-editorial text-base font-bold leading-5 group-hover:text-primary">{item.title}</span>
            </Link>
          ))}
        </div>
      </section>
    </aside>
  );
}










