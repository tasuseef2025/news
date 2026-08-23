import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleCard } from "@/features/articles/article-card";
import { connectDB } from "@/lib/db";
import { serializeArticle } from "@/lib/articles";
import { absoluteUrl } from "@/lib/utils";
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
  const description = "The latest verified news, reports and analysis published by Novexa News.";

  return {
    title: page > 1 ? `Latest News - Page ${page}` : "Latest News",
    description,
    alternates: { canonical },
    robots: { index: true, follow: true },
    openGraph: {
      title: page > 1 ? `Latest News - Page ${page}` : "Latest News",
      description,
      type: "website",
      url: canonical
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
        <p className="mt-3 max-w-3xl text-muted-foreground">The newest verified reporting, updates and analysis from every Novexa News desk.</p>
      </header>
      <div className="grid gap-x-6 gap-y-9 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {articles.map((article) => <ArticleCard key={article.slug} article={article} />)}
      </div>
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
