import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { serializeArticle } from "@/lib/articles";
import { Article } from "@/models/Article";
import { ArticleManagement } from "@/features/dashboard/article-management";
import { hasPermission } from "@/lib/permissions";

export const metadata = {
  title: "Article Management"
};

export default async function ArticleManagementPage() {
  const session = await getServerSession(authOptions);

  if (!session) redirect("/auth/signin?callbackUrl=/admin/articles");
  if (!hasPermission(session.user.role, "create_articles")) redirect("/");

  await connectDB();
  const docs = await Article.find().sort({ updatedAt: -1 }).limit(100).lean();
  const articles = docs.map(serializeArticle);

  return (
    <main className="min-h-screen bg-muted/35 p-4 md:p-6 xl:p-8">
      <ArticleManagement initialArticles={articles} permissions={session.user.permissions} />
    </main>
  );
}
