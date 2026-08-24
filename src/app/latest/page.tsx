import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleCard } from "@/features/articles/article-card";
import { connectDB } from "@/lib/db";
import { serializeArticle } from "@/lib/articles";
import { absoluteUrl } from "@/lib/utils";
import { siteConfig } from "@/lib/site";
import { Article } from "@/models/Article";
import { publicArticleFilter } from "@/lib/public-articles";

type Props = {
  searchParams: Promise<{ page?: string }>;
};

const PAGE_SIZE = 24;

function pageNumber(value?: string) {
  const page = Number.parseInt(value || "1", 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const query = await searchParams;
  const page = pageNumber(query.page);
  const canonical = absoluteUrl(`/latest${page > 1 ? `?page=${page}` : ""}`);
  const title = page > 1 ? `Latest News and Updated Stories - Page ${page}` : "Latest News and Updated Stories";
  const description = "Read the latest published stories from Novexa News, including recent Pakistan, world, business, technology, sports, entertainment, health and lifestyle updates.";

  return {
    title,
    description,
    alternates: { canonical },
    robots: { index: true, follow: true },
    openGraph: {
      title: `${title} | ${siteConfig.name}`,
      description,
      type: "website",
      siteName: siteConfig.name,
      url: canonical,
      images: [{ url: absoluteUrl("/api/og?title=Latest%20News&category=News"), width: 1200, height: 630, alt: "Latest News" }]
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${siteConfig.name}`,
      description,
      images: [absoluteUrl("/api/og?title=Latest%20News&category=News")]
    }
  };
}

export default async function LatestNewsPage({ searchParams }: Props) {
  const query = await searchParams;
  const page = pageNumber(query.page);
  await connectDB();

  const filter = publicArticleFilter();
  const [docs, total] = await Promise.all([
    Article.find(filter).sort({ publishedAt: -1 }).skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE).lean(),
    Article.countDocuments(filter)
  ]);
  if (page > 1 && !docs.length) notFound();

  const articles = docs.map(serializeArticle);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const canonical = absoluteUrl(`/latest${page > 1 ? `?page=${page}` : ""}`);
  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: page > 1 ? `Latest News - Page ${page}` : "Latest News",
    description: "Recent reviewed stories from Novexa News across every major desk.",
    url: canonical,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: articles.map((article, index) => ({
        "@type": "ListItem",
        position: (page - 1) * PAGE_SIZE + index + 1,
        url: absoluteUrl(`/news/${article.slug}`),
        name: article.title
      }))
    }
  };

  return (
    <main className="container py-8 md:py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }} />
      <nav aria-label="Breadcrumb" className="mb-5 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-primary">Home</Link> / <span>Latest News</span>
      </nav>
      <header className="mb-8 border-t-2 border-foreground pt-4">
        <p className="text-xs font-black uppercase text-primary">Newsroom</p>
        <h1 className="font-editorial mt-1 text-4xl font-bold md:text-5xl">Latest News</h1>
        <p className="mt-3 max-w-3xl text-muted-foreground">
          Recent reviewed stories from Novexa News, updated across Pakistan, world, business, technology, sports, entertainment, health and lifestyle coverage.
        </p>
      </header>
      {articles.length ? (
        <div className="grid gap-x-6 gap-y-9 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {articles.map((article) => <ArticleCard key={article.slug} article={article} />)}
        </div>
      ) : (
        <section className="border-y py-10">
          <h2 className="text-xl font-bold">Latest coverage is being prepared</h2>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            New reviewed stories will appear here after editorial checks, source review, image validation and SEO metadata preparation.
          </p>
        </section>
      )}
      {totalPages > 1 ? (
        <nav aria-label="Latest news pagination" className="mt-12 flex items-center justify-between border-t pt-5">
          {page > 1 ? <Link rel="prev" href={`/latest${page > 2 ? `?page=${page - 1}` : ""}`} className="font-bold hover:text-primary">Previous</Link> : <span />}
          <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
          {page < totalPages ? <Link rel="next" href={`/latest?page=${page + 1}`} className="font-bold hover:text-primary">Next</Link> : <span />}
        </nav>
      ) : null}
    </main>
  );
}
