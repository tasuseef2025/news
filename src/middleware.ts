import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/auth/signin"
  },
  callbacks: {
    authorized: ({ token }) => Boolean(token)
  }
});

export const config = {
  matcher: ["/admin/:path*"]
};
