import { unstable_cache } from "next/cache";
import { connectDB } from "@/lib/db";
import { Article } from "@/models/Article";
import { categories } from "@/lib/categories";
import { publicArticleFilter } from "@/lib/public-articles";

export const getNavigableCategories = unstable_cache(
  async () => {
    await connectDB();
    const stats = await Article.aggregate([
      { $match: { ...publicArticleFilter(), category: { $in: [...categories] } } },
      { $group: { _id: "$category", count: { $sum: 1 } } }
    ]);
    const withContent = new Set(
      stats.filter((stat) => stat.count >= 2).map((stat) => stat._id as string)
    );
    return categories.filter((category) => withContent.has(category));
  },
  ["navigable-categories"],
  { revalidate: 900 }
);
