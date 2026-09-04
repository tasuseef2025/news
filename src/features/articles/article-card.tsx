import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ArticleImage } from "@/components/media/article-image";
import type { Article } from "@/types";
import { cn } from "@/lib/utils";

export function ArticleCard({ article, priority, large }: { article: Article; priority?: boolean; large?: boolean }) {
  return (
    <article className={cn("group grid content-start gap-3", large && "md:grid-cols-[1.2fr_0.8fr] md:items-center")}>
      <Link href={`/news/${article.slug}`} className="relative block overflow-hidden bg-muted">
        <ArticleImage
          src={article.image}
          alt={article.imageAlt || article.title}
          title={article.title}
          category={article.category}
          width={900}
          height={560}
          priority={priority}
          className={cn("aspect-[16/10] w-full object-cover transition duration-500 group-hover:scale-[1.025]", large && "md:aspect-[4/3]")}
        />
      </Link>
      <div className="grid content-start gap-2">
        <div className="flex items-center gap-2 text-xs">
          <Link
            href={`/category/${article.category.toLowerCase().replaceAll(" ", "-")}`}
            className="rounded-sm bg-primary/10 px-2 py-0.5 font-black uppercase text-primary hover:bg-primary hover:text-primary-foreground"
          >
            {article.category}
          </Link>
          <time className="font-semibold text-muted-foreground">
            {formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true })}
          </time>
        </div>
        <Link href={`/news/${article.slug}`} className={cn("font-editorial font-bold leading-[1.12] group-hover:text-primary", large ? "text-3xl md:text-4xl" : "text-[22px]")}>
          {article.title}
        </Link>
        <p className="text-sm leading-6 text-muted-foreground">{article.excerpt}</p>
      </div>
    </article>
  );
}

