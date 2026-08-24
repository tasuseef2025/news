import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleCard } from "@/features/articles/article-card";
import { connectDB } from "@/lib/db";
import { serializeArticle } from "@/lib/articles";
import { categories, categorySlug } from "@/lib/categories";
import { siteConfig } from "@/lib/site";
import { absoluteUrl } from "@/lib/utils";
import { Article } from "@/models/Article";
import { publicArticleFilter } from "@/lib/public-articles";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
};

const PAGE_SIZE = 18;

function resolveCategory(slug: string) {
  return categories.find((category) => categorySlug(category) === slug);
}

function pageNumber(value?: string) {
  const page = Number.parseInt(value || "1", 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

function categoryDescription(category: string) {
  return `Read the latest ${category} news, verified updates, explainers and analysis from ${siteConfig.name}, with reviewed coverage organized for fast scanning and search.`;
}

async function categoryCount(category: string) {
  try {
    await connectDB();
    return await Article.countDocuments({
      ...publicArticleFilter(),
      category: new RegExp(`^${category.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i")
    });
  } catch {
    return 0;
  }
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const category = resolveCategory(slug);
  if (!category) return { title: "Section not found", robots: { index: false, follow: false } };

  const page = pageNumber(query.page);
  const count = await categoryCount(category);
  const canonical = absoluteUrl(`/category/${slug}${page > 1 ? `?page=${page}` : ""}`);
  const description = categoryDescription(category);
  const indexable = page === 1 || (count > 0 && (page - 1) * PAGE_SIZE < count);

  return {
    title: page > 1 ? `${category} News and Latest Updates - Page ${page}` : `${category} News and Latest Updates`,
    description,
    alternates: { canonical },
    robots: { index: indexable, follow: true },
    openGraph: {
      title: `${category} News | ${siteConfig.name}`,
      description,
      url: canonical,
      siteName: siteConfig.name,
      type: "website"
    },
    twitter: { card: "summary_large_image", title: `${category} News | ${siteConfig.name}`, description }
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const category = resolveCategory(slug);
  if (!category) notFound();

  const page = pageNumber(query.page);
  await connectDB();
  const filter = {
    ...publicArticleFilter(),
    category: new RegExp(`^${category.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i")
  };
  const [docs, total] = await Promise.all([
    Article.find(filter).sort({ publishedAt: -1 }).skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE).lean(),
    Article.countDocuments(filter)
  ]);
  if (page > 1 && !docs.length) notFound();

  const articles = docs.map(serializeArticle);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const canonical = absoluteUrl(`/category/${slug}${page > 1 ? `?page=${page}` : ""}`);
  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${category} News`,
    description: categoryDescription(category),
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
    <main className="container py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }} />
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-primary">Home</Link> / <span>{category}</span>
      </nav>
      <header className="mb-8 border-b pb-5">
        <p className="text-sm font-bold uppercase text-primary">Section</p>
        <h1 className="text-4xl font-black">{category}</h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">{categoryDescription(category)}</p>
      </header>
      {articles.length ? (
        <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => <ArticleCard key={article.slug} article={article} />)}
        </div>
      ) : (
        <section className="border-y py-10">
          <h2 className="text-xl font-bold">Coverage is being prepared</h2>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            This section is reserved for reviewed {category.toLowerCase()} coverage. New stories appear here after editorial review, source checks, SEO metadata validation and image-alt checks.
          </p>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            You can continue with the latest Novexa News homepage while this category is being expanded with fresh reporting and verified updates.
          </p>
          <Link href="/" className="mt-4 inline-block font-semibold text-primary">Return to the latest news</Link>
        </section>
      )}
      {totalPages > 1 && (
        <nav aria-label="Category pagination" className="mt-10 flex items-center justify-between border-t pt-5">
          {page > 1 ? <Link rel="prev" href={`/category/${slug}${page > 2 ? `?page=${page - 1}` : ""}`}>Previous</Link> : <span />}
          <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
          {page < totalPages ? <Link rel="next" href={`/category/${slug}?page=${page + 1}`}>Next</Link> : <span />}
        </nav>
      )}
    </main>
  );
}
