import Link from "next/link";
import { format } from "date-fns";
import { connectDB } from "@/lib/db";
import { isArticleIndexable, publicArticleFilter } from "@/lib/public-articles";
import { Article } from "@/models/Article";

export async function AuthorArticles({ names }: { names: string[] }) {
  await connectDB();
  const candidates = await Article.find({ ...publicArticleFilter(), author: { $in: names } })
    .select("title slug excerpt category publishedAt content generationMode reviewStatus duplicateRisk status")
    .sort({ publishedAt: -1 })
    .limit(20)
    .lean();
  const articles = candidates.filter(isArticleIndexable).slice(0, 12);

  if (!articles.length) return null;
  return (
    <section className="mt-10 border-t pt-6" aria-labelledby="author-latest-heading">
      <h2 id="author-latest-heading">Latest articles</h2>
      <div className="not-prose mt-5 divide-y border-y">
        {articles.map((article) => (
          <div key={article.slug} className="grid gap-1 py-4">
            <div className="flex flex-wrap gap-2 text-xs font-bold uppercase text-muted-foreground">
              <span className="text-primary">{article.category}</span>
              <time dateTime={new Date(article.publishedAt).toISOString()}>{format(new Date(article.publishedAt), "PPP")}</time>
            </div>
            <Link href={`/news/${article.slug}`} className="font-editorial text-xl font-bold leading-tight hover:text-primary">
              {article.title}
            </Link>
            <p className="text-sm leading-6 text-muted-foreground">{article.excerpt}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
