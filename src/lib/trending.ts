import { Article } from "@/models/Article";

export async function updateTrendingPosts(limit = 10) {
  const top = await Article.find({ status: "published" }).sort({ views: -1, publishedAt: -1 }).limit(limit).select("_id").lean();
  const ids = top.map((article) => article._id);
  await Promise.all([
    Article.updateMany({ _id: { $in: ids } }, { $set: { trending: true } }),
    Article.updateMany({ _id: { $nin: ids } }, { $set: { trending: false } })
  ]);
  return ids.length;
}
