import Image from "next/image";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import type { Article } from "@/types";
import { cn } from "@/lib/utils";

export function ArticleCard({ article, priority, large }: { article: Article; priority?: boolean; large?: boolean }) {
  return (
    <article className={cn("group grid gap-3", large && "md:grid-cols-[1.2fr_0.8fr] md:items-center")}>
      <Link href={`/news/${article.slug}`} className="relative block overflow-hidden rounded-lg bg-muted">
        <Image
          src={article.image}
          alt={article.title}
          width={900}
          height={560}
          priority={priority}
          className={cn("aspect-[16/10] w-full object-cover transition duration-500 group-hover:scale-105", large && "md:aspect-[4/3]")}
        />
      </Link>
      <div className="grid content-start gap-2">
        <div className="flex items-center gap-2 text-xs font-bold uppercase text-primary">
          <span>{article.category}</span>
          <span className="h-1 w-1 rounded-full bg-muted-foreground" />
          <time className="text-muted-foreground">
            {formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true })}
          </time>
        </div>
        <Link href={`/news/${article.slug}`} className={cn("font-black leading-tight group-hover:text-primary", large ? "text-3xl md:text-4xl" : "text-xl")}>
          {article.title}
        </Link>
        <p className="text-sm leading-6 text-muted-foreground">{article.excerpt}</p>
      </div>
    </article>
  );
}
