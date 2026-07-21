import { connectDB } from "@/lib/db";
import { requireAdminPage } from "@/lib/admin-route";
import { AdminSectionPage } from "@/components/admin/admin-section-page";
import { User } from "@/models/User";
import { roleLabels } from "@/lib/permissions";
import type { Role } from "@/types";

export const metadata = { title: "Users | Admin" };

export default async function UsersAdminPage() {
  await requireAdminPage("manage_users");
  await connectDB();
  const [users, total, admins] = await Promise.all([
    User.find().select("-password").sort({ createdAt: -1 }).limit(50).lean(),
    User.countDocuments(),
    User.countDocuments({ role: { $in: ["super_admin", "admin", "editor", "author", "journalist", "moderator"] } })
  ]);

  return <AdminSectionPage title="Users" description="Manage newsroom accounts, editorial roles, subscribers, and role-based access across the admin panel." stats={[{ label: "Total Users", value: total }, { label: "Staff Accounts", value: admins }]} columns={["Name", "Email", "Role"]} rows={users.map((item) => ({ Name: <span className="font-bold">{String(item.name)}</span>, Email: String(item.email), Role: roleLabels[item.role as Role] ?? String(item.role) }))} empty="No users found in MongoDB." />;
}
