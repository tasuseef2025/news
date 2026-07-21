import { connectDB } from "@/lib/db";
import { requireAdminPage } from "@/lib/admin-route";
import { AdminSectionPage } from "@/components/admin/admin-section-page";
import { Article } from "@/models/Article";
import { View } from "@/models/View";
import { WebVital } from "@/models/WebVital";
import { Comment } from "@/models/Comment";

export const metadata = { title: "Analytics | Admin" };

export default async function AnalyticsAdminPage() {
  await requireAdminPage("view_analytics");
  await connectDB();
  const [views, vitals, comments, popular] = await Promise.all([
    View.countDocuments(),
    WebVital.find().sort({ createdAt: -1 }).limit(30).lean(),
    Comment.countDocuments(),
    Article.find({ status: "published" }).sort({ views: -1, publishedAt: -1 }).limit(20).lean()
  ]);

  return <AdminSectionPage title="Analytics" description="Track article performance, view activity, reader engagement, and Core Web Vitals collected from the website." stats={[{ label: "Views", value: views }, { label: "Web Vitals", value: vitals.length }, { label: "Comments", value: comments }]} columns={["Article", "Category", "Views", "Status"]} rows={popular.map((item) => ({ Article: <span className="font-bold">{String(item.title)}</span>, Category: String(item.category), Views: Number(item.views || 0).toLocaleString(), Status: String(item.status) }))} empty="No analytics records found yet." />;
}
