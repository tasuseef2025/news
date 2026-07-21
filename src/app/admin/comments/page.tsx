import { connectDB } from "@/lib/db";
import { requireAdminPage } from "@/lib/admin-route";
import { AdminSectionPage } from "@/components/admin/admin-section-page";
import { Comment } from "@/models/Comment";

export const metadata = { title: "Comments | Admin" };

export default async function CommentsAdminPage() {
  await requireAdminPage("view_analytics");
  await connectDB();
  const [comments, total, pending, approved] = await Promise.all([
    Comment.find().sort({ createdAt: -1 }).limit(50).lean(),
    Comment.countDocuments(),
    Comment.countDocuments({ status: "pending" }),
    Comment.countDocuments({ status: "approved" })
  ]);

  return <AdminSectionPage title="Comments" description="Moderate reader comments and monitor pending, approved, spam, and trashed discussion records." stats={[{ label: "Total", value: total }, { label: "Pending", value: pending }, { label: "Approved", value: approved }]} columns={["Name", "Email", "Status", "Comment"]} rows={comments.map((item) => ({ Name: String(item.name), Email: String(item.email), Status: String(item.status), Comment: String(item.content).slice(0, 140) }))} empty="No comments found in MongoDB." />;
}
