import { unstable_noStore as noStore } from "next/cache";
import { connectDB } from "@/lib/db";
import { publishDueScheduledArticles, serializeArticle } from "@/lib/articles";
import { Article as ArticleModel } from "@/models/Article";
import { Advertisement as AdvertisementModel } from "@/models/Advertisement";
import type { Advertisement, Article } from "@/types";
import { categories, categorySlug, homepageCategories } from "@/lib/categories";

export type CategoryCard = {
  name: string;
  slug: string;
  count: number;
  image?: string;
};

export type HomepageData = {
  hero: Article[];
  trending: Article[];
  editorsPicks: Article[];
  latest: Article[];
  popular: Article[];
  recent: Article[];
  sections: Record<string, Article[]>;
  categoryCards: CategoryCard[];
  advertisements: Advertisement[];
};

function slugify(value: string) {
  return categorySlug(value);
}

function serializeAdvertisement(advertisement: unknown): Advertisement {
  const doc = advertisement as Advertisement & {
    _id?: { toString: () => string };
    createdAt?: Date;
    updatedAt?: Date;
  };

  return {
    ...doc,
    _id: doc._id?.toString(),
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : undefined,
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : undefined
  };
}

async function findArticles(
  query: Record<string, unknown>,
  options?: { limit?: number; sort?: Record<string, 1 | -1> }
) {
  const docs = await ArticleModel.find({ status: "published", ...query })
    .sort(options?.sort ?? { publishedAt: -1 })
    .limit(options?.limit ?? 6)
    .lean();

  return docs.map(serializeArticle);
}

export async function getHomepageData(): Promise<HomepageData> {
  noStore();

  const emptySections = Object.fromEntries(homepageCategories.map((category) => [category, []]));

  try {
    await connectDB();
    await publishDueScheduledArticles();

    const [
      hero,
      trending,
      editorsPicks,
      latest,
      popular,
      recent,
      categorySections,
      categoryStats,
      advertisements
    ] = await Promise.all([
      findArticles({ $or: [{ category: /^Breaking News$/i }, { featured: true }] }, { limit: 5 }),
      findArticles({ trending: true }, { limit: 6, sort: { views: -1, publishedAt: -1 } }),
      findArticles({ featured: true }, { limit: 6 }),
      findArticles({}, { limit: 8 }),
      findArticles({}, { limit: 6, sort: { views: -1, publishedAt: -1 } }),
      findArticles({}, { limit: 5 }),
      Promise.all(
        homepageCategories.map(async (category) => [
          category,
          await findArticles({ category: new RegExp(`^${category}$`, "i") }, { limit: category === "Videos" ? 4 : 3 })
        ])
      ),
      ArticleModel.aggregate([
        { $match: { status: "published", category: { $in: [...categories] } } },
        { $sort: { publishedAt: -1 } },
        {
          $group: {
            _id: "$category",
            count: { $sum: 1 },
            image: { $first: "$image" }
          }
        },
        { $sort: { count: -1 } }
      ]),
      AdvertisementModel.find({ active: true }).sort({ createdAt: -1 }).limit(8).lean()
    ]);

    const sections = { ...emptySections, ...Object.fromEntries(categorySections) } as Record<string, Article[]>;
    const categoryCards = categories.map((category) => {
      const stat = categoryStats.find((item) => item._id === category);
      return {
        name: category,
        slug: slugify(category),
        count: stat?.count ?? 0,
        image: stat?.image
      };
    });

    return {
      hero,
      trending,
      editorsPicks,
      latest,
      popular,
      recent,
      sections,
      categoryCards,
      advertisements: advertisements.map(serializeAdvertisement)
    };
  } catch {
    return {
      hero: [],
      trending: [],
      editorsPicks: [],
      latest: [],
      popular: [],
      recent: [],
      sections: emptySections as Record<string, Article[]>,
      categoryCards: categories.map((category) => ({
        name: category,
        slug: slugify(category),
        count: 0
      })),
      advertisements: []
    };
  }
}




