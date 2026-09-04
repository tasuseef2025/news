import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ArticleImage } from "@/components/media/article-image";
import type { Article } from "@/types";

export function HeroSection({ articles }: { articles: Article[] }) {
  if (!articles.length) {
    return (
      <section className="grid min-h-[400px] place-items-center border-y bg-card p-8 text-center">
        <div>
          <p className="text-sm font-black uppercase text-primary">Breaking News</p>
          <h2 className="mt-2 text-3xl font-black">Top stories are on the way</h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
            Our top stories will appear here as soon as they are published.
          </p>
        </div>
      </section>
    );
  }

  const [lead, ...rest] = articles;
  const sideStories = rest.slice(0, 4);

  return (
    <section className="grid gap-4 lg:grid-cols-[1.6fr_1fr] lg:items-stretch">
      <Link
        href={`/news/${lead.slug}`}
        className="group relative block min-h-[320px] overflow-hidden bg-black text-white md:min-h-[440px]"
      >
        <ArticleImage
          src={lead.image}
          alt={lead.imageAlt || lead.title}
          title={lead.title}
          category={lead.category}
          fill
          priority
          className="object-cover opacity-75 transition duration-500 group-hover:scale-[1.03] group-hover:opacity-85"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/10" />
        <div className="relative z-10 flex h-full min-h-[320px] flex-col justify-end p-5 md:min-h-[440px] md:p-8">
          <div className="mb-4 flex w-fit items-center gap-2 rounded-sm bg-primary px-3 py-1 text-xs font-black uppercase text-primary-foreground">
            {lead.breakingNews ? "Breaking News" : lead.category}
          </div>
          <h2 className="font-editorial text-3xl font-bold leading-[1.05] md:text-5xl">
            {lead.title}
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-white/85 md:text-lg">{lead.excerpt}</p>
          <time className="mt-4 text-xs font-bold uppercase tracking-wide text-white/70">
            {formatDistanceToNow(new Date(lead.publishedAt), { addSuffix: true })}
          </time>
        </div>
      </Link>

      <div className="flex flex-col divide-y border md:border-l-0">
        {sideStories.map((article) => (
          <Link
            key={article.slug}
            href={`/news/${article.slug}`}
            className="group grid grid-cols-[104px_1fr] gap-3 p-3 transition hover:bg-muted/60 md:p-4"
          >
            <ArticleImage
              src={article.image}
              alt={article.imageAlt || article.title}
              title={article.title}
              category={article.category}
              width={208}
              height={144}
              className="aspect-[4/3] w-full object-cover"
            />
            <div className="flex min-w-0 flex-col justify-center gap-1.5">
              <span className="text-[11px] font-black uppercase tracking-wide text-primary">{article.category}</span>
              <span className="font-editorial text-[15px] font-bold leading-[1.2] group-hover:text-primary md:text-base">
                {article.title}
              </span>
              <time className="text-[11px] font-semibold text-muted-foreground">
                {formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true })}
              </time>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
