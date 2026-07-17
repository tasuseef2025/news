import { withAuth } from "next-auth/middleware";
import { canAccessAdmin, hasPermission } from "@/lib/permissions";

export default withAuth({
  callbacks: {
    authorized: ({ token, req }) => {
      if (req.nextUrl.pathname.startsWith("/admin")) {
        const role = token?.role as string | undefined;
        if (req.nextUrl.pathname.startsWith("/admin/users")) return hasPermission(role, "manage_users");
        if (req.nextUrl.pathname.startsWith("/admin/categories")) return hasPermission(role, "manage_categories");
        if (req.nextUrl.pathname.startsWith("/admin/advertisements")) return hasPermission(role, "manage_ads");
        if (req.nextUrl.pathname.startsWith("/admin/analytics")) return hasPermission(role, "view_analytics");
        if (req.nextUrl.pathname.startsWith("/admin/settings")) return hasPermission(role, "manage_settings");
        if (req.nextUrl.pathname.startsWith("/admin/articles")) return hasPermission(role, "create_articles");
        return canAccessAdmin(role);
      }
      return Boolean(token);
    }
  }
});

export const config = {
  matcher: ["/admin/:path*"]
};
