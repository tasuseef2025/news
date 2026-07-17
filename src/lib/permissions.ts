import type { Permission, Role } from "@/types";

export function normalizeRole(role?: string | null): Role {
  if (role === "reader") return "subscriber";
  if (role && role in rolePermissions) return role as Role;
  return "subscriber";
}

export const roleLabels: Record<Role, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  editor: "Editor",
  author: "Author",
  journalist: "Journalist",
  moderator: "Moderator",
  subscriber: "Subscriber"
};

export const allPermissions: Permission[] = [
  "create_articles",
  "delete_articles",
  "publish_articles",
  "manage_users",
  "manage_categories",
  "manage_ads",
  "view_analytics",
  "manage_settings"
];

export const permissionLabels: Record<Permission, string> = {
  create_articles: "Create Articles",
  delete_articles: "Delete Articles",
  publish_articles: "Publish Articles",
  manage_users: "Manage Users",
  manage_categories: "Manage Categories",
  manage_ads: "Manage Ads",
  view_analytics: "View Analytics",
  manage_settings: "Settings"
};

export const rolePermissions: Record<Role, Permission[]> = {
  super_admin: allPermissions,
  admin: [
    "create_articles",
    "delete_articles",
    "publish_articles",
    "manage_users",
    "manage_categories",
    "manage_ads",
    "view_analytics",
    "manage_settings"
  ],
  editor: ["create_articles", "delete_articles", "publish_articles", "manage_categories", "view_analytics"],
  author: ["create_articles"],
  journalist: ["create_articles"],
  moderator: ["view_analytics"],
  subscriber: []
};

export function getRolePermissions(role?: string | null): Permission[] {
  return rolePermissions[normalizeRole(role)];
}

export function hasPermission(role: string | null | undefined, permission: Permission) {
  return getRolePermissions(role).includes(permission);
}

export function hasAnyPermission(role: string | null | undefined, permissions: Permission[]) {
  return permissions.some((permission) => hasPermission(role, permission));
}

export function canAccessAdmin(role: string | null | undefined) {
  return hasAnyPermission(role, [
    "create_articles",
    "publish_articles",
    "delete_articles",
    "manage_users",
    "manage_categories",
    "manage_ads",
    "view_analytics",
    "manage_settings"
  ]);
}
