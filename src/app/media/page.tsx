import type { Metadata } from "next";
import Link from "next/link";
import { Images, PlayCircle } from "lucide-react";
import { getArticles } from "@/lib/articles";
import { ArticleImage } from "@/components/media/article-image";
import { staticPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = staticPageMetadata({
  title: "Media",
  description: "Browse the latest video, photography and visual reporting from Novexa News.",
  path: "/media",
  ogImageTitle: "Novexa News Media",
  ogCategory: "Media"
});

export default async function MediaPage() {
  const articles = await getArticles({ limit: 30 });
  const mediaArticles = articles.filter((article) =>
    Boolean(article.videoUrl || article.gallery?.length || article.image)
  );

  return (
    <main className="container-shell py-10 md:py-14">
      <header className="mb-8 border-b pb-5">
        <p className="text-sm font-black uppercase text-primary">Visual journalism</p>
        <h1 className="mt-1 text-4xl font-black">Media</h1>
      </header>
      {mediaArticles.length ? (
        <div className="grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {mediaArticles.map((article) => (
            <article key={article._id || article.slug}>
              <Link href={`/news/${article.slug}`} className="group block">
                <div className="relative aspect-video overflow-hidden rounded-md bg-muted">
                  <ArticleImage src={article.image} alt={article.imageAlt || article.title} title={article.title} category={article.category} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
                  <span className="absolute bottom-3 left-3 grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground">
                    {article.videoUrl ? <PlayCircle className="h-5 w-5" /> : <Images className="h-5 w-5" />}
                  </span>
                </div>
                <p className="mt-3 text-xs font-black uppercase text-primary">{article.category}</p>
                <h2 className="mt-1 text-xl font-black leading-tight group-hover:text-primary">{article.title}</h2>
              </Link>
            </article>
          ))}
        </div>
      ) : (
        <p className="border-y py-8 text-muted-foreground">No published media stories are available yet.</p>
      )}
    </main>
  );
}
