import type { DefaultSession } from "next-auth";
import type { Permission } from "@/types";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      permissions: Permission[];
    } & DefaultSession["user"];
  }

  interface User {
    role?: string;
    permissions?: Permission[];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    permissions?: Permission[];
  }
}
