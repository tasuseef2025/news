import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requirePermission } from "@/lib/api-utils";
import { Article } from "@/models/Article";
import { User } from "@/models/User";
import { Comment } from "@/models/Comment";
import { Advertisement } from "@/models/Advertisement";
import { NewsletterSubscription } from "@/models/NewsletterSubscription";
import { Like } from "@/models/Like";
import { View } from "@/models/View";

export async function GET() {
  const { error } = await requirePermission("view_analytics");
  if (error) return error;
  await connectDB();
  const [users, articles, comments, ads, subscribers, likes, views, viewTotals, categoryViews] = await Promise.all([
    User.countDocuments(),
    Article.countDocuments(),
    Comment.countDocuments(),
    Advertisement.countDocuments(),
    NewsletterSubscription.countDocuments({ status: "subscribed" }),
    Like.countDocuments(),
    View.countDocuments(),
    Article.aggregate([{ $group: { _id: null, views: { $sum: "$views" } } }]),
    Article.aggregate([{ $match: { status: "published" } }, { $group: { _id: "$category", views: { $sum: "$views" }, articles: { $sum: 1 } } }, { $sort: { views: -1 } }, { $limit: 10 }])
  ]);
  return NextResponse.json({
    totals: { users, articles, comments, ads, subscribers, likes, viewEvents: views, articleViews: viewTotals[0]?.views ?? 0 },
    categoryViews
  });
}
