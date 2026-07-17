import {
  AdvertisementSlot,
  ArticleGrid,
  CategoryCards,
  CompactArticleList,
  Newsletter,
  RankedList,
  SectionHeader,
  VideoSection
} from "@/features/home/homepage-sections";
import { HeroBreakingSlider } from "@/features/home/hero-breaking-slider";
import { ArticleCard } from "@/features/articles/article-card";
import { getHomepageData } from "@/lib/homepage";

export default async function HomePage() {
  const data = await getHomepageData();

  return (
    <main>
      <section className="container grid gap-8 py-8 xl:grid-cols-[1fr_340px]">
        <div className="grid gap-8">
          <AdvertisementSlot advertisements={data.advertisements} placement="top" />
          <HeroBreakingSlider articles={data.hero} />
          <ArticleGrid title="Editor's Picks" articles={data.editorsPicks} />
        </div>

        <aside className="grid content-start gap-6">
          <RankedList title="Trending News" articles={data.trending} icon="trend" />
          <AdvertisementSlot advertisements={data.advertisements} placement="sidebar" className="min-h-72" />
          <CompactArticleList title="Popular Articles" articles={data.popular} />
        </aside>
      </section>

      <section className="border-y bg-card">
        <div className="container py-10">
          <SectionHeader title="Latest News" href="/category/latest" />
          {data.latest.length ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {data.latest.map((article) => (
                <ArticleCard key={article.slug} article={article} />
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No latest articles found in MongoDB yet.</div>
          )}
        </div>
      </section>

      <section className="container grid gap-10 py-10">
        <ArticleGrid title="Technology" articles={data.sections.Technology} category="Technology" />
        <ArticleGrid title="Business" articles={data.sections.Business} category="Business" />
        <AdvertisementSlot advertisements={data.advertisements} placement="middle" />

        <div className="grid gap-10 lg:grid-cols-2">
          <ArticleGrid title="Politics" articles={data.sections.Politics} category="Politics" />
          <ArticleGrid title="Sports" articles={data.sections.Sports} category="Sports" />
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
        <AdvertisementSlot advertisements={data.advertisements} placement="footer" />
      </section>
    </main>
  );
}
