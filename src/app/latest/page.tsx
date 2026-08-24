import type { Metadata } from "next";
import { ArticleCard } from "@/features/articles/article-card";
import { getArticles } from "@/lib/articles";
import { absoluteUrl } from "@/lib/utils";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Latest News and Updated Stories",
  description: "Read the latest published stories from Novexa News, including recent Pakistan, world, business, technology, sports, entertainment, health and lifestyle updates.",
  alternates: { canonical: absoluteUrl("/latest") },
  openGraph: {
    title: `Latest News and Updated Stories | ${siteConfig.name}`,
    description: "Browse the most recent reviewed stories and updates published by Novexa News.",
    url: absoluteUrl("/latest"),
    siteName: siteConfig.name,
    type: "website",
    images: [{ url: absoluteUrl("/api/og?title=Latest%20News&category=News"), width: 1200, height: 630, alt: "Latest News" }]
  },
  twitter: {
    card: "summary_large_image",
    title: `Latest News and Updated Stories | ${siteConfig.name}`,
    description: "Browse the most recent reviewed stories and updates published by Novexa News.",
    images: [absoluteUrl("/api/og?title=Latest%20News&category=News")]
  }
};

export default async function LatestNewsPage() {
  const articles = await getArticles({ limit: 48 });

  return (
    <main className="container py-8">
      <header className="mb-8 border-b pb-5">
        <p className="text-sm font-bold uppercase text-primary">Latest</p>
        <h1 className="text-4xl font-black">Latest News</h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          Recent reviewed stories from Novexa News, updated across Pakistan, world, business, technology, sports, entertainment, health and lifestyle coverage.
        </p>
      </header>
      {articles.length ? (
        <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
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
    </main>
  );
}
