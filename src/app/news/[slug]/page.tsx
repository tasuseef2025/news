import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { getArticleBySlug, serializeArticle } from "@/lib/articles";
import { absoluteUrl } from "@/lib/utils";
import { articleBreadcrumbs } from "@/lib/content-automation";
import { connectDB } from "@/lib/db";
import { Article } from "@/models/Article";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) return {};

  return {
    title: article.metaTitle || article.title,
    description: article.metaDescription || article.excerpt,
    alternates: { canonical: article.canonicalUrl || absoluteUrl(`/news/${article.slug}`) },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1
      }
    },
    openGraph: {
      title: article.metaTitle || article.title,
      description: article.metaDescription || article.excerpt,
      images: [{ url: article.ogImage || article.image, width: 1200, height: 630, alt: article.title }],
      type: "article",
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt,
      authors: [article.author],
      section: article.category,
      tags: article.tags
    },
    twitter: {
      card: "summary_large_image",
      title: article.metaTitle || article.title,
      description: article.metaDescription || article.excerpt,
      images: [article.ogImage || article.image]
    },
    other: {
      "news_keywords": article.tags?.join(", ") || article.category,
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
    Article.find({ status: "published", slug: { $ne: article.slug }, $or: [{ category: article.category }, { tags: { $in: article.tags || [] } }] }).sort({ publishedAt: -1 }).limit(3).lean(),
    Article.find({ status: "published", slug: { $ne: article.slug } }).sort({ trending: -1, views: -1, publishedAt: -1 }).limit(3).lean(),
    Article.find({ status: "published", slug: { $ne: article.slug } }).sort({ publishedAt: -1 }).limit(3).lean()
  ]);
  const breadcrumbSchema = articleBreadcrumbs(article);
  const schema = article.schemaMarkup
    ? article.schemaMarkup
    : JSON.stringify({
        "@context": "https://schema.org",
        "@type": "NewsArticle",
        headline: article.title,
        description: article.metaDescription || article.excerpt,
        image: [article.ogImage || article.image],
        author: { "@type": "Person", name: article.author },
        datePublished: article.publishedAt,
        dateModified: article.updatedAt || article.publishedAt,
        mainEntityOfPage: article.canonicalUrl || absoluteUrl(`/news/${article.slug}`)
      });

  return (
    <main className="container max-w-4xl py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: schema }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: breadcrumbSchema }} />
      <nav className="mb-6 flex flex-wrap gap-2 text-sm font-bold text-muted-foreground" aria-label="Breadcrumb">
        <a href="/" className="hover:text-primary">Home</a><span>/</span><a href={`/category/${article.category.toLowerCase().replaceAll(" ", "-")}`} className="hover:text-primary">{article.category}</a><span>/</span><span className="text-foreground">{article.title}</span>
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
            <span className="font-semibold text-foreground">{article.author}</span>
            <span>{format(new Date(article.publishedAt), "PPP p")}</span>
            <span>{article.views.toLocaleString()} views</span>
            <span>{article.readingTime ?? 1} min read</span>
          </div>
        </div>
        <Image
          src={article.image}
          alt={article.title}
          width={1400}
          height={820}
          priority
          className="mb-8 aspect-[16/9] w-full rounded-lg object-cover"
        />
        <div className="prose prose-slate max-w-none dark:prose-invert">
          {article.content.split("\n").map((paragraph) => (
            <p key={paragraph} className="mb-5 text-lg leading-8">
              {paragraph}
            </p>
          ))}
        </div>
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
              <Image key={image} src={image} alt={article.title} width={900} height={560} className="aspect-[16/10] rounded-lg object-cover" />
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
        <div className="mt-8 rounded-lg border bg-card p-5 text-sm font-semibold text-muted-foreground">
          {article.allowComments === false ? "Comments are closed for this article." : "Comments are open for this article."}
        </div>
        <ArticleRail title="Related Articles" articles={related.map(serializeArticle)} />
        <ArticleRail title="Recommended Articles" articles={recommended.map(serializeArticle)} />
        <ArticleRail title="Latest Articles" articles={latest.map(serializeArticle)} />
      </article>
    </main>
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
            <Image src={item.image} alt={item.title} width={520} height={320} loading="lazy" className="aspect-[16/10] rounded-lg object-cover" />
            <span className="font-black leading-tight group-hover:text-primary">{item.title}</span>
          </a>
        ))}
      </div>
    </section>
  );
}



