import { Article } from "@/models/Article";

export async function updateTrendingPosts(limit = 10) {
  const recentWindow = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const top = await Article.aggregate([
    { $match: { status: "published" } },
    {
      $addFields: {
        ageHours: {
          $max: [1, { $divide: [{ $subtract: [new Date(), "$publishedAt"] }, 1000 * 60 * 60] }]
        },
        recentBoost: { $cond: [{ $gte: ["$publishedAt", recentWindow] }, 35, 0] }
      }
    },
    {
      $addFields: {
        trendingScore: {
          $add: [
            "$recentBoost",
            { $multiply: [{ $ln: { $add: ["$views", 1] } }, 18] },
            { $divide: [48, "$ageHours"] }
          ]
        }
      }
    },
    { $sort: { trendingScore: -1, publishedAt: -1 } },
    { $limit: limit },
    { $project: { _id: 1 } }
  ]);

  const ids = top.map((article) => article._id);
  await Promise.all([
    Article.updateMany({ _id: { $in: ids } }, { $set: { trending: true } }),
    Article.updateMany({ _id: { $nin: ids } }, { $set: { trending: false } })
  ]);
  return ids.length;
}
