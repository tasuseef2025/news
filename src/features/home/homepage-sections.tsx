import Image from "next/image";
import Link from "next/link";
import { Mail, Play, TrendingUp } from "lucide-react";
import { ArticleCard } from "@/features/articles/article-card";
import type { Advertisement, Article } from "@/types";
import type { CategoryCard } from "@/lib/homepage";
import { cn } from "@/lib/utils";
import { siteConfig } from "@/lib/site";

export function SectionHeader({ title, href }: { title: string; href?: string }) {
  return (
    <div className="mb-5 flex items-center justify-between gap-4 border-b pb-3">
      <h2 className="text-2xl font-black md:text-3xl">{title}</h2>
      {href ? (
        <Link href={href} className="text-sm font-black uppercase text-primary hover:text-foreground">
          View all
        </Link>
      ) : null}
    </div>
  );
}

export function EmptySection({ label }: { label: string }) {
  return (
    <div className="rounded-lg border bg-card p-6 text-sm leading-6 text-muted-foreground">
      No published {label} articles found in MongoDB yet.
    </div>
  );
}

export function ArticleGrid({ title, articles, category }: { title: string; articles: Article[]; category?: string }) {
  return (
    <section>
      <SectionHeader title={title} href={category ? `/category/${category.toLowerCase().replaceAll(" ", "-")}` : undefined} />
      {articles.length ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => (
            <ArticleCard key={article.slug} article={article} />
          ))}
        </div>
      ) : (
        <EmptySection label={title.toLowerCase()} />
      )}
    </section>
  );
}

export function RankedList({ title, articles, icon }: { title: string; articles: Article[]; icon?: "trend" }) {
  return (
    <section className="rounded-lg border bg-card p-5">
      <div className="mb-4 flex items-center gap-2">
        {icon === "trend" ? <TrendingUp className="h-5 w-5 text-primary" /> : null}
        <h2 className="text-xl font-black">{title}</h2>
      </div>
      {articles.length ? (
        <div className="grid gap-4">
          {articles.map((article, index) => (
            <Link key={article.slug} href={`/news/${article.slug}`} className="grid grid-cols-[36px_1fr] gap-3">
              <span className="text-2xl font-black text-primary">{index + 1}</span>
              <span className="text-sm font-bold leading-5 hover:text-primary">{article.title}</span>
            </Link>
          ))}
        </div>
      ) : (
        <EmptySection label={title.toLowerCase()} />
      )}
    </section>
  );
}

export function CompactArticleList({ title, articles }: { title: string; articles: Article[] }) {
  return (
    <section className="rounded-lg border bg-card p-5">
      <h2 className="mb-4 text-xl font-black">{title}</h2>
      {articles.length ? (
        <div className="grid gap-4">
          {articles.map((article) => (
            <Link key={article.slug} href={`/news/${article.slug}`} className="grid grid-cols-[86px_1fr] gap-3">
              <Image src={article.image} alt={article.title} width={180} height={120} className="aspect-[4/3] rounded-md object-cover" />
              <span className="text-sm font-bold leading-5 hover:text-primary">{article.title}</span>
            </Link>
          ))}
        </div>
      ) : (
        <EmptySection label={title.toLowerCase()} />
      )}
    </section>
  );
}

export function VideoSection({ articles }: { articles: Article[] }) {
  return (
    <section>
      <SectionHeader title="Videos" href="/category/videos" />
      {articles.length ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {articles.map((article) => (
            <Link key={article.slug} href={`/news/${article.slug}`} className="group grid gap-3">
              <div className="relative overflow-hidden rounded-lg bg-muted">
                <Image src={article.image} alt={article.title} width={700} height={440} className="aspect-video object-cover transition duration-500 group-hover:scale-105" />
                <span className="absolute inset-0 grid place-items-center bg-black/25">
                  <span className="grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground">
                    <Play className="h-5 w-5 fill-current" />
                  </span>
                </span>
              </div>
              <span className="font-black leading-tight group-hover:text-primary">{article.title}</span>
            </Link>
          ))}
        </div>
      ) : (
        <EmptySection label="video" />
      )}
    </section>
  );
}

export function CategoryCards({ cards }: { cards: CategoryCard[] }) {
  return (
    <section>
      <SectionHeader title="Category Cards" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((card) => (
          <Link
            key={card.slug}
            href={`/category/${card.slug}`}
            className="group relative min-h-36 overflow-hidden rounded-lg border bg-card p-4"
          >
            {card.image ? (
              <Image src={card.image} alt={card.name} fill className="object-cover opacity-30 transition group-hover:scale-105 group-hover:opacity-45" />
            ) : null}
            <div className="relative z-10 flex h-full flex-col justify-end">
              <h3 className="text-xl font-black group-hover:text-primary">{card.name}</h3>
              <p className="mt-1 text-sm font-semibold text-muted-foreground">{card.count} published articles</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function AdvertisementSlot({
  advertisements,
  placement,
  className
}: {
  advertisements: Advertisement[];
  placement: Advertisement["placement"];
  className?: string;
}) {
  const advertisement = advertisements.find((item) => item.placement === placement);

  if (!advertisement) {
    const title = placement === "sidebar" ? "Advertise Here" : "Advertise with Novexa News";
    const image = `/api/og?title=${encodeURIComponent(title)}&category=${encodeURIComponent("Media Kit")}`;

    return (
      <a
        href={`mailto:${siteConfig.contactEmail}?subject=Advertising%20on%20Novexa%20News&body=Hello%20Novexa%20News%2C%0A%0AI%20am%20interested%20in%20advertising%20on%20your%20website.`}
        className={cn("group relative block min-h-32 overflow-hidden rounded-lg border bg-card shadow-sm", className)}
      >
        <Image src={image} alt="Advertise with Novexa News" fill className="object-cover transition duration-500 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/45 to-primary/20" />
        <div className="relative z-10 flex min-h-32 flex-col justify-center p-5 text-white">
          <p className="text-xs font-black uppercase tracking-normal text-white/80">Advertisement</p>
          <h3 className="mt-1 max-w-xl text-2xl font-black leading-tight md:text-3xl">Advertise with Novexa News</h3>
          <p className="mt-2 max-w-xl text-sm font-semibold text-white/85">Reach readers across Pakistan, world news, business, technology, sports, and lifestyle.</p>
          <span className="mt-4 inline-flex w-fit rounded-md bg-primary px-4 py-2 text-sm font-black text-primary-foreground transition group-hover:bg-white group-hover:text-primary">
            Contact: {siteConfig.contactEmail}
          </span>
        </div>
      </a>
    );
  }

  const body = (
    <div className={cn("relative min-h-28 overflow-hidden rounded-lg border bg-card p-5", className)}>
      {advertisement.image ? (
        <Image src={advertisement.image} alt={advertisement.title} fill className="object-cover" />
      ) : null}
      <div className="absolute inset-0 bg-black/35" />
      <div className="relative z-10 text-white">
        <p className="text-xs font-black uppercase">Advertisement</p>
        <h3 className="mt-1 text-xl font-black">{advertisement.title}</h3>
        {advertisement.sponsor ? <p className="text-sm text-white/80">{advertisement.sponsor}</p> : null}
      </div>
    </div>
  );

  return advertisement.href ? <Link href={advertisement.href}>{body}</Link> : body;
}

export function Newsletter() {
  return (
    <section className="rounded-lg border bg-card p-6 md:p-8">
      <div className="grid gap-5 md:grid-cols-[1fr_420px] md:items-center">
        <div>
          <div className="mb-3 flex items-center gap-2 text-sm font-black uppercase text-primary">
            <Mail className="h-5 w-5" />
            Newsletter
          </div>
          <h2 className="text-3xl font-black">Get the morning edition in your inbox</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Subscribe for editor-selected headlines, analysis, and the biggest stories across every section.
          </p>
        </div>
        <form className="flex flex-col gap-3 sm:flex-row">
          <input
            type="email"
            placeholder="Email address"
            className="h-11 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-accent"
          />
          <button className="h-11 rounded-md bg-primary px-5 text-sm font-black text-primary-foreground hover:bg-primary/90">
            Subscribe
          </button>
        </form>
      </div>
    </section>
  );
}

