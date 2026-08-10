import type { Metadata } from "next";
import { ArticleCard } from "@/features/articles/article-card";
import { connectDB } from "@/lib/db";
import { publishDueScheduledArticles, serializeArticle } from "@/lib/articles";
import { absoluteUrl } from "@/lib/utils";
import { Article } from "@/models/Article";
import { publicArticleFilter } from "@/lib/public-articles";

export const metadata: Metadata = {
  title: "Search News",
  description: "Search Novexa News for breaking updates, Pakistan news, world affairs, business, technology, sports, health and analysis.",
  alternates: { canonical: absoluteUrl("/search") },
  robots: { index: false, follow: true }
};

type Props = {
  searchParams: Promise<{ q?: string }>;
};

export default async function SearchPage({ searchParams }: Props) {
  const { q = "" } = await searchParams;
  const query = q.trim();
  let articles: ReturnType<typeof serializeArticle>[] = [];
  let total = 0;

  if (query) {
    await connectDB();
    await publishDueScheduledArticles();
    const filter = { ...publicArticleFilter(), $text: { $search: query } };
    const [docs, count] = await Promise.all([
      Article.find(filter).sort({ score: { $meta: "textScore" }, publishedAt: -1 }).limit(24).lean(),
      Article.countDocuments(filter)
    ]);
    articles = docs.map(serializeArticle);
    total = count;
  }

  return (
    <main className="container py-8">
      <section className="mb-8 rounded-lg border bg-card p-5 md:p-7">
        <p className="text-sm font-black uppercase text-primary">Search</p>
        <h1 className="mt-2 text-4xl font-black md:text-5xl">Search Novexa News</h1>
        <form action="/search" className="mt-5 flex flex-col gap-3 sm:flex-row">
          <input
            name="q"
            defaultValue={query}
            placeholder="Search Pakistan, world, business, technology..."
            className="h-12 min-w-0 flex-1 rounded-md border bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-accent"
          />
          <button className="h-12 rounded-md bg-primary px-6 text-sm font-black text-primary-foreground hover:bg-primary/90">
            Search
          </button>
        </form>
        {query ? <p className="mt-3 text-sm text-muted-foreground">{total.toLocaleString()} results for <span className="font-bold text-foreground">{query}</span></p> : null}
      </section>

      {query ? (
        articles.length ? (
          <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((article) => <ArticleCard key={article.slug} article={article} />)}
          </section>
        ) : (
          <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">No matching published articles found.</div>
        )
      ) : (
        <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">Enter a topic, person, company, country, or category to search the newsroom archive.</div>
      )}
    </main>
  );
}
