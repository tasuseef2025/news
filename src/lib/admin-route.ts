import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { canAccessAdmin, hasPermission } from "@/lib/permissions";
import type { Permission } from "@/types";

export async function requireAdminPage(permission?: Permission) {
  const session = await getServerSession(authOptions);

  if (!session) redirect(`/auth/signin?callbackUrl=${permission ? "/admin" : "/admin"}`);
  if (permission ? !hasPermission(session.user.role, permission) : !canAccessAdmin(session.user.role)) redirect("/admin");

  return session;
}
