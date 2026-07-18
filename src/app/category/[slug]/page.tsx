import type { Metadata } from "next";
import { ArticleCard } from "@/features/articles/article-card";
import { getArticles } from "@/lib/articles";
import { categorySlug } from "@/lib/categories";
import { siteConfig } from "@/lib/site";
import { absoluteUrl } from "@/lib/utils";

type Props = {
  params: Promise<{ slug: string }>;
};

function titleCase(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" ");
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = titleCase(slug.replaceAll("-", " "));
  const canonical = absoluteUrl(`/category/${categorySlug(category)}`);
  const description = `Latest ${category} news, updates, analysis and featured stories from ${siteConfig.name}.`;

  return {
    title: `${category} News`,
    description,
    alternates: { canonical },
    openGraph: {
      title: `${category} News | ${siteConfig.name}`,
      description,
      url: canonical,
      siteName: siteConfig.name,
      type: "website",
      images: [{ url: absoluteUrl(`/api/og?title=${encodeURIComponent(`${category} News`)}&category=${encodeURIComponent(category)}`), width: 1200, height: 630, alt: `${category} News` }]
    },
    twitter: {
      card: "summary_large_image",
      title: `${category} News | ${siteConfig.name}`,
      description,
      images: [absoluteUrl(`/api/og?title=${encodeURIComponent(`${category} News`)}&category=${encodeURIComponent(category)}`)]
    }
  };
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const category = titleCase(slug.replaceAll("-", " "));
  const articles = await getArticles({ category, limit: 18 });

  return (
    <main className="container py-8">
      <div className="mb-8 border-b pb-5">
        <p className="text-sm font-bold uppercase text-primary">Section</p>
        <h1 className="text-4xl font-black capitalize">{category}</h1>
      </div>
      <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
        {articles.map((article) => (
          <ArticleCard key={article.slug} article={article} />
        ))}
      </div>
    </main>
  );
}
