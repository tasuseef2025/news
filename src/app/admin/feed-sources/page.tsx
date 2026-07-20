import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { FeedSourcesManager } from "@/features/dashboard/feed-sources-manager";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export const metadata = {
  title: "Feed Sources"
};

export default async function AdminFeedSourcesPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/signin?callbackUrl=/admin/feed-sources");
  if (!hasPermission(session.user.role, "create_articles")) redirect("/admin");

  return (
    <main className="min-h-screen bg-muted/35 p-4 md:p-6 xl:p-8">
      <div className="mx-auto grid max-w-6xl gap-6">
        <header className="rounded-lg border bg-card p-5">
          <p className="text-sm font-black uppercase text-primary">Admin</p>
          <h1 className="text-3xl font-black md:text-4xl">RSS Feed Sources</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Add RSS/Atom feeds, enable auto-publishing, and run imports without using curl.
          </p>
        </header>
        <FeedSourcesManager />
      </div>
    </main>
  );
}
