import { connectDB } from "@/lib/db";
import { Article } from "@/models/Article";
import { Advertisement } from "@/models/Advertisement";
import { User } from "@/models/User";

type Activity = {
  title: string;
  label: string;
  time: string;
};

type DashboardArticle = {
  title: string;
  slug: string;
  category: string;
  author: string;
  status: string;
  views: number;
  publishedAt: string;
};

type CategoryStat = {
  name: string;
  count: number;
};

type TagStat = {
  name: string;
  count: number;
};

type ChartPoint = {
  label: string;
  value: number;
};

export type AdminDashboardData = {
  totals: {
    users: number;
    articles: number;
    views: number;
    revenue: number;
    comments: number;
    categories: number;
  };
  recentArticles: DashboardArticle[];
  recentActivity: Activity[];
  categoryStats: CategoryStat[];
  tagStats: TagStat[];
  viewsChart: ChartPoint[];
  statusChart: ChartPoint[];
  notifications: string[];
};

function toRelativeLabel(date?: Date) {
  if (!date) return "Recently";
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.max(1, Math.round(diff / 60000));
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  return `${Math.round(hours / 24)} days ago`;
}

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  try {
    await connectDB();
    const db = Article.db.db;
    const commentsCount = db ? db.collection("comments").countDocuments().catch(() => 0) : Promise.resolve(0);

    const [
      totalUsers,
      totalArticles,
      viewsResult,
      revenueResult,
      comments,
      categoryStats,
      tagStats,
      recentArticleDocs,
      recentUsers,
      viewsChart,
      statusChart,
      drafts,
      inactiveAds
    ] = await Promise.all([
      User.countDocuments(),
      Article.countDocuments(),
      Article.aggregate([{ $group: { _id: null, views: { $sum: "$views" } } }]),
      Advertisement.aggregate([{ $group: { _id: null, revenue: { $sum: "$revenue" } } }]),
      commentsCount,
      Article.aggregate([
        { $group: { _id: "$category", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 8 }
      ]),
      Article.aggregate([
        { $unwind: "$tags" },
        { $group: { _id: "$tags", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      Article.find().sort({ createdAt: -1 }).limit(8).lean(),
      User.find().sort({ createdAt: -1 }).limit(4).lean(),
      Article.aggregate([
        { $match: { status: "published" } },
        {
          $group: {
            _id: "$category",
            value: { $sum: "$views" }
          }
        },
        { $sort: { value: -1 } },
        { $limit: 6 }
      ]),
      Article.aggregate([{ $group: { _id: "$status", value: { $sum: 1 } } }, { $sort: { value: -1 } }]),
      Article.countDocuments({ status: "draft" }),
      Advertisement.countDocuments({ active: false })
    ]);

    const recentArticles = recentArticleDocs.map((article) => ({
      title: article.title,
      slug: article.slug,
      category: article.category,
      author: article.author,
      status: article.status,
      views: article.views,
      publishedAt: new Date(article.publishedAt).toISOString()
    }));

    const recentActivity: Activity[] = [
      ...recentArticleDocs.slice(0, 5).map((article) => ({
        title: article.title,
        label: `Article ${article.status}`,
        time: toRelativeLabel(article.createdAt)
      })),
      ...recentUsers.slice(0, 3).map((user) => ({
        title: user.email,
        label: `User joined as ${user.role}`,
        time: toRelativeLabel(user.createdAt)
      }))
    ].slice(0, 7);

    const notifications = [
      drafts ? `${drafts} draft article${drafts === 1 ? "" : "s"} awaiting review` : "",
      inactiveAds ? `${inactiveAds} advertisement${inactiveAds === 1 ? "" : "s"} inactive` : "",
      comments ? `${comments} total comment${comments === 1 ? "" : "s"} in the comments collection` : "",
      totalUsers === 0 ? "No users found. Seed or invite your first admin user." : ""
    ].filter(Boolean);

    return {
      totals: {
        users: totalUsers,
        articles: totalArticles,
        views: viewsResult[0]?.views ?? 0,
        revenue: revenueResult[0]?.revenue ?? 0,
        comments,
        categories: categoryStats.length
      },
      recentArticles,
      recentActivity,
      categoryStats: categoryStats.map((item) => ({ name: item._id ?? "Uncategorized", count: item.count })),
      tagStats: tagStats.map((item) => ({ name: item._id ?? "untagged", count: item.count })),
      viewsChart: viewsChart.map((item) => ({ label: item._id ?? "Other", value: item.value })),
      statusChart: statusChart.map((item) => ({ label: item._id ?? "unknown", value: item.value })),
      notifications: notifications.length ? notifications : ["Everything looks up to date."]
    };
  } catch {
    return {
      totals: {
        users: 0,
        articles: 0,
        views: 0,
        revenue: 0,
        comments: 0,
        categories: 0
      },
      recentArticles: [],
      recentActivity: [],
      categoryStats: [],
      tagStats: [],
      viewsChart: [],
      statusChart: [],
      notifications: ["MongoDB is not connected yet. Dashboard data will appear once the database is reachable."]
    };
  }
}
