import bcrypt from "bcryptjs";
import { timingSafeEqual } from "crypto";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { MongoDBAdapter } from "@next-auth/mongodb-adapter";
import clientPromise from "@/lib/mongodb";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { getRolePermissions, normalizeRole } from "@/lib/permissions";

function sameSecret(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function configuredAdminEmail() {
  return process.env.ADMIN_EMAIL?.trim().toLowerCase() || "";
}

export const authOptions: NextAuthOptions = {
  adapter: MongoDBAdapter(clientPromise),
  session: { strategy: "jwt" },
  pages: { signIn: "/auth/signin" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;

        await connectDB();
        const email = credentials.email.trim().toLowerCase();
        const adminEmail = configuredAdminEmail();
        const isConfiguredAdmin = Boolean(
          adminEmail &&
            email === adminEmail &&
            process.env.ADMIN_PASSWORD &&
            sameSecret(credentials.password, process.env.ADMIN_PASSWORD)
        );
        let user = await User.findOne({ email }).select("+password");

        if (
          isConfiguredAdmin &&
          (!user?.password || !(await bcrypt.compare(credentials.password, user.password)) || normalizeRole(user.role) !== "super_admin")
        ) {
          user = await User.findOneAndUpdate(
            { email },
            {
              $set: {
                name: user?.name || "Admin",
                password: await bcrypt.hash(credentials.password, 12),
                role: "super_admin"
              }
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          ).select("+password");
        }

        if (!user?.password) return null;

        const isValid = isConfiguredAdmin || (await bcrypt.compare(credentials.password, user.password));
        if (!isValid) return null;

        const role = isConfiguredAdmin ? "super_admin" : normalizeRole(user.role);

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          image: user.image,
          role,
          permissions: getRolePermissions(role)
        };
      }
    })
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = normalizeRole((user as { role?: string }).role);
        token.permissions = getRolePermissions(token.role);
      }
      if (token.email?.toLowerCase() === configuredAdminEmail()) {
        token.role = "super_admin";
        token.permissions = getRolePermissions("super_admin");
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = normalizeRole(token.role as string);
        session.user.permissions = getRolePermissions(session.user.role);
      }
      return session;
    }
  }
};