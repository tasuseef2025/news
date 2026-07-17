import bcrypt from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { MongoDBAdapter } from "@next-auth/mongodb-adapter";
import clientPromise from "@/lib/mongodb";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { getRolePermissions, normalizeRole } from "@/lib/permissions";

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
        const user = await User.findOne({ email: credentials.email.toLowerCase() }).select("+password");
        if (!user?.password) return null;

        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) return null;

        const role = normalizeRole(user.role);

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
