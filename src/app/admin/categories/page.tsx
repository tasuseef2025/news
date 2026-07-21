import { connectDB } from "@/lib/db";
import { requireAdminPage } from "@/lib/admin-route";
import { AdminSectionPage } from "@/components/admin/admin-section-page";
import { Category } from "@/models/Category";

export const metadata = { title: "Categories | Admin" };

export default async function CategoriesAdminPage() {
  await requireAdminPage("manage_categories");
  await connectDB();
  const [categories, total, active] = await Promise.all([
    Category.find().sort({ order: 1, name: 1 }).limit(50).lean(),
    Category.countDocuments(),
    Category.countDocuments({ active: true })
  ]);

  return <AdminSectionPage title="Categories" description="Manage the newsroom taxonomy used for navigation, article routing, SEO breadcrumbs, RSS grouping, and feed imports." stats={[{ label: "Total", value: total }, { label: "Active", value: active }]} actions={[{ label: "Articles", href: "/admin/articles" }, { label: "Feed Sources", href: "/admin/feed-sources" }]} columns={["Name", "Slug", "Parent", "Status", "Order"]} rows={categories.map((item) => ({ Name: <span className="font-bold">{String(item.name)}</span>, Slug: String(item.slug), Parent: String(item.parent || "Main"), Status: item.active ? "Active" : "Inactive", Order: Number(item.order || 0) }))} empty="No categories found in MongoDB." />;
}
