import {
  AdvertisementSlot,
  ArticleGrid,
  CategoryCards,
  CompactArticleList,
  LatestTicker,
  Newsletter,
  RankedList,
  SectionHeader,
  VideoSection
} from "@/features/home/homepage-sections";
import { HeroSection } from "@/features/home/hero-breaking-slider";
import { ArticleCard } from "@/features/articles/article-card";
import { getHomepageData } from "@/lib/homepage";
import { LiveScoresPanel } from "@/features/sports/live-scores-panel";
import { InteractiveWidgetsPanel } from "@/features/widgets/interactive-widgets-panel";

export const revalidate = 300;

export default async function HomePage() {
  const data = await getHomepageData();

  return (
    <main className="pb-10">
      <h1 className="sr-only">Novexa News: Latest Pakistan and World News</h1>
      <LatestTicker articles={data.ticker} />
      <section className="container py-6 md:py-8">
        <div className="grid gap-8 border-b pb-10 xl:grid-cols-[minmax(0,1fr)_330px]">
          <div className="grid content-start gap-10">
            <HeroSection articles={data.hero} />
            <ArticleGrid title="Top Stories" articles={data.editorsPicks} />
          </div>

          <aside className="grid content-start gap-8">
            <RankedList title="Trending News" articles={data.trending} icon="trend" />
            <CompactArticleList title="Most Read" articles={data.popular.slice(0, 4)} />
          </aside>
        </div>
      </section>

      <section className="border-y bg-card/70">
        <div className="container py-10">
          <SectionHeader title="Latest News" href="/latest" />
          {data.latest.length ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {data.latest.map((article) => (
                <ArticleCard key={article.slug} article={article} />
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No stories here yet — check back soon.</div>
          )}
        </div>
      </section>

      <section className="container grid gap-12 py-12">
        <ArticleGrid title="Technology" articles={data.sections.Technology} category="Technology" />
        <ArticleGrid title="Business" articles={data.sections.Business} category="Business" />
        <AdvertisementSlot advertisements={data.advertisements} placement="middle" />

        <div className="grid gap-10 lg:grid-cols-2">
          <ArticleGrid title="Politics" articles={data.sections.Politics} category="Politics" />
          <div className="grid gap-6">
            <ArticleGrid title="Sports" articles={data.sections.Sports} category="Sports" />
            <LiveScoresPanel compact />
          </div>
        </div>

        <div className="grid gap-10 lg:grid-cols-2">
          <ArticleGrid title="Health" articles={data.sections.Health} category="Health" />
          <ArticleGrid title="Entertainment" articles={data.sections.Entertainment} category="Entertainment" />
        </div>

        <div className="grid gap-10 lg:grid-cols-2">
          <ArticleGrid title="Lifestyle" articles={data.sections.Lifestyle} category="Lifestyle" />
          <ArticleGrid title="Education" articles={data.sections.Education} category="Education" />
        </div>

        <ArticleGrid title="Opinion" articles={data.sections.Opinion} category="Opinion" />
        <VideoSection articles={data.sections.Videos} />

        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <CategoryCards cards={data.categoryCards} />
          <CompactArticleList title="Recent Articles" articles={data.recent} />
        </div>

        <Newsletter />
      </section>
    </main>
  );
}



