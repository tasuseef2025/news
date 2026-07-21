import { connectDB } from "@/lib/db";
import { requireAdminPage } from "@/lib/admin-route";
import { AdminSectionPage } from "@/components/admin/admin-section-page";
import { Tag } from "@/models/Tag";

export const metadata = { title: "Tags | Admin" };

export default async function TagsAdminPage() {
  await requireAdminPage("create_articles");
  await connectDB();
  const [tags, total] = await Promise.all([Tag.find().sort({ name: 1 }).limit(80).lean(), Tag.countDocuments()]);

  return <AdminSectionPage title="Tags" description="Review topic tags used for search suggestions, related articles, recommendations, and article metadata." stats={[{ label: "Total Tags", value: total }]} actions={[{ label: "Create Article", href: "/admin/articles" }]} columns={["Name", "Slug", "Description"]} rows={tags.map((item) => ({ Name: <span className="font-bold">{String(item.name)}</span>, Slug: String(item.slug), Description: String(item.description || "-") }))} empty="No tags found in MongoDB." />;
}
