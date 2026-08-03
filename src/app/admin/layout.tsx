import type { ReactNode } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { canAccessAdmin } from "@/lib/permissions";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session) redirect("/auth/signin?callbackUrl=/admin");
  if (!canAccessAdmin(session.user.role)) redirect("/");

  return children;
}