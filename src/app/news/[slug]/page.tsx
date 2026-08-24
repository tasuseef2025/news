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
  const [related, recommended, latest] = await Promise.all([
    Article.find({ ...publicArticleFilter(), slug: { $ne: article.slug }, $or: [{ category: article.category }, { tags: { $in: article.tags || [] } }] })
      .sort({ publishedAt: -1 })
      .limit(3)
      .lean(),
    Article.find({ ...publicArticleFilter(), slug: { $ne: article.slug } })
      .sort({ trending: -1, views: -1, publishedAt: -1 })
      .limit(3)
      .lean(),
    Article.find({ ...publicArticleFilter(), slug: { $ne: article.slug } })
      .sort({ publishedAt: -1 })
      .limit(3)
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
    <main className="container max-w-4xl py-8">
      <GoogleSwgBasic />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: schema }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: breadcrumbSchema }} />
      <nav className="mb-6 flex flex-wrap gap-2 text-sm font-bold text-muted-foreground" aria-label="Breadcrumb">
        <a href="/" className="hover:text-primary">Home</a>
        <span>/</span>
        <a href={`/category/${article.category.toLowerCase().replaceAll(" ", "-")}`} className="hover:text-primary">{article.category}</a>
        <span>/</span>
        <span className="text-foreground">{article.title}</span>
      </nav>
      <article>
        <div className="mb-6 grid gap-4">
          <div className="flex flex-wrap gap-2 text-sm font-bold uppercase text-primary">
            <span>{article.category}</span>
            {article.subcategory ? <span>/ {article.subcategory}</span> : null}
            {article.breakingNews ? <span className="rounded-sm bg-primary px-2 text-primary-foreground">Breaking</span> : null}
          </div>
          <h1 className="text-4xl font-black leading-tight md:text-6xl">{article.title}</h1>
          <p className="text-lg leading-8 text-muted-foreground">{article.excerpt}</p>
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
        </div>
        <ArticleImage
          src={article.image}
          alt={article.imageAlt || article.title}
          title={article.title}
          category={article.category}
          width={1400}
          height={820}
          priority
          className="aspect-[16/9] w-full rounded-lg object-cover"
        />
        {article.imageCredit ? (
          <p className="mb-8 mt-2 text-sm text-muted-foreground">
            Image credit: {article.imageCreditUrl ? (
              <a href={article.imageCreditUrl} target="_blank" rel="nofollow noopener noreferrer" className="underline hover:text-foreground">
                {article.imageCredit}
              </a>
            ) : article.imageCredit}
          </p>
        ) : <div className="mb-8" />}
        <ArticleContent content={article.content} />
        {article.references?.length ? (
          <section className="mt-8 border-t pt-5">
            <h2 className="text-lg font-black">Source links</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {article.references.map((reference) => (
                <a
                  key={reference.url}
                  href={reference.url}
                  target="_blank"
                  rel="nofollow noopener noreferrer"
                  className="rounded-md border border-emerald-600/30 px-3 py-2 text-sm font-bold text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/30"
                >
                  {reference.name}
                </a>
              ))}
            </div>
          </section>
        ) : null}
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
          <div className="mt-8 rounded-lg border bg-card p-4">
            <h2 className="mb-3 text-xl font-black">Video</h2>
            <a href={article.videoUrl} className="font-bold text-primary" target="_blank" rel="noreferrer">
              Watch video
            </a>
          </div>
        ) : null}
        {article.gallery?.length ? (
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {article.gallery.map((image) => (
              <ArticleImage key={image} src={image} alt={article.imageAlt || article.title} title={article.title} category={article.category} width={900} height={560} className="aspect-[16/10] rounded-lg object-cover" />
            ))}
          </div>
        ) : null}
        {article.tags?.length ? (
          <div className="mt-8 flex flex-wrap gap-2">
            {article.tags.map((tag) => (
              <span key={tag} className="rounded-md border px-3 py-2 text-sm font-bold">
                {tag}
              </span>
            ))}
          </div>
        ) : null}
        <CommentsSection articleId={article._id} allowComments={article.allowComments} />
        <ArticleRail title="Related Articles" articles={related.map(serializeArticle)} />
        <ArticleRail title="Recommended Articles" articles={recommended.map(serializeArticle)} />
        <ArticleRail title="Latest Articles" articles={latest.map(serializeArticle)} />
      </article>
    </main>
  );
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
          return <h2 key={`${block}-${index}`} className="mb-4 mt-8 text-3xl font-black">{block.replace(/^(h2:|##\s+)/i, "").trim()}</h2>;
        }

        if (/^(h3:|###\s+)/i.test(block)) {
          return <h3 key={`${block}-${index}`} className="mb-3 mt-6 text-2xl font-black">{block.replace(/^(h3:|###\s+)/i, "").trim()}</h3>;
        }

        return <p key={`${block}-${index}`} className="mb-5 text-lg leading-8">{block}</p>;
      })}
    </div>
  );
}
function ArticleRail({ title, articles }: { title: string; articles: ReturnType<typeof serializeArticle>[] }) {
  if (!articles.length) return null;
  return (
    <section className="mt-10 border-t pt-6">
      <h2 className="mb-4 text-2xl font-black">{title}</h2>
      <div className="grid gap-4 md:grid-cols-3">
        {articles.map((item) => (
          <a key={item.slug} href={`/news/${item.slug}`} className="group grid gap-2">
            <ArticleImage src={item.image} alt={item.imageAlt || item.title} title={item.title} category={item.category} width={520} height={320} loading="lazy" className="aspect-[16/10] rounded-lg object-cover" />
            <span className="font-black leading-tight group-hover:text-primary">{item.title}</span>
          </a>
        ))}
      </div>
    </section>
  );
}










