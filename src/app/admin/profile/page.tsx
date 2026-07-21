import { requireAdminPage } from "@/lib/admin-route";
import { AdminSectionPage } from "@/components/admin/admin-section-page";
import { roleLabels, permissionLabels } from "@/lib/permissions";
import type { Role } from "@/types";

export const metadata = { title: "Profile | Admin" };

export default async function ProfileAdminPage() {
  const session = await requireAdminPage();
  const rows = [
    { Field: "Name", Value: session.user.name || "Admin" },
    { Field: "Email", Value: session.user.email || "-" },
    { Field: "Role", Value: roleLabels[session.user.role as Role] ?? session.user.role },
    { Field: "Permissions", Value: session.user.permissions.map((permission) => permissionLabels[permission]).join(", ") || "None" }
  ];

  return <AdminSectionPage title="Profile" description="Review the currently signed-in admin identity, role, and active permissions from NextAuth." stats={[{ label: "Permissions", value: session.user.permissions.length }]} columns={["Field", "Value"]} rows={rows} actions={[{ label: "Logout", href: "/api/auth/signout" }]} />;
}
