import type { Metadata } from "next";
import { ArticleCard } from "@/features/articles/article-card";
import { getArticles } from "@/lib/articles";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = slug.replaceAll("-", " ");
  return {
    title: category,
    description: `Latest ${category} news, features and analysis.`
  };
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const category = slug.replaceAll("-", " ");
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
