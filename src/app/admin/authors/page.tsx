import { connectDB } from "@/lib/db";
import { requireAdminPage } from "@/lib/admin-route";
import { AdminSectionPage } from "@/components/admin/admin-section-page";
import { Author } from "@/models/Author";

export const metadata = { title: "Authors | Admin" };

export default async function AuthorsAdminPage() {
  await requireAdminPage("manage_users");
  await connectDB();
  const [authors, total, active] = await Promise.all([
    Author.find().sort({ name: 1 }).limit(50).lean(),
    Author.countDocuments(),
    Author.countDocuments({ active: true })
  ]);

  return <AdminSectionPage title="Authors" description="Manage bylines, biographies, author pages, social links, and active contributor records." stats={[{ label: "Total Authors", value: total }, { label: "Active", value: active }]} columns={["Name", "Slug", "Title", "Status"]} rows={authors.map((item) => ({ Name: <span className="font-bold">{String(item.name)}</span>, Slug: String(item.slug), Title: String(item.title || "-"), Status: item.active ? "Active" : "Inactive" }))} empty="No authors found in MongoDB." />;
}
