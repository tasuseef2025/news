import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  BadgeDollarSign,
  BarChart3,
  Bell,
  BookOpen,
  ChartNoAxesColumn,
  CircleUserRound,
  FileText,
  FolderTree,
  Home,
  Image,
  LogOut,
  Mail,
  MessageSquare,
  Newspaper,
  Rss,
  SearchCheck,
  Settings,
  ShieldCheck,
  Tags,
  UserPen,
  Users
} from "lucide-react";
import { authOptions } from "@/lib/auth";
import { getAdminDashboardData } from "@/lib/admin-dashboard";
import { ArticleEditor } from "@/features/dashboard/article-editor";
import { canAccessAdmin, permissionLabels, roleLabels } from "@/lib/permissions";
import type { Role } from "@/types";

export const metadata = {
  title: "Admin Dashboard"
};

const sidebarItems = [
  ["Dashboard", "/admin", Home],
  ["Articles", "/admin/articles", Newspaper],
  ["Feed Sources", "/admin/feed-sources", Rss],
  ["Categories", "/admin/categories", FolderTree],
  ["Tags", "/admin/tags", Tags],
  ["Media", "/admin/media", Image],
  ["Comments", "/admin/comments", MessageSquare],
  ["Users", "/admin/users", Users],
  ["Authors", "/admin/authors", UserPen],
  ["SEO", "/admin/seo", SearchCheck],
  ["Advertisements", "/admin/advertisements", BadgeDollarSign],
  ["Newsletter", "/admin/newsletter", Mail],
  ["Analytics", "/admin/analytics", BarChart3],
  ["Settings", "/admin/settings", Settings],
  ["Profile", "/admin/profile", CircleUserRound]
] as const;

export default async function AdminPage() {
  const session = await getServerSession(authOptions);

  if (!session) redirect("/auth/signin?callbackUrl=/admin");
  if (!canAccessAdmin(session.user.role)) redirect("/");

  const data = await getAdminDashboardData();
  const maxViews = Math.max(...data.viewsChart.map((item) => item.value), 1);
  const maxStatus = Math.max(...data.statusChart.map((item) => item.value), 1);
  const canCreateArticles = session.user.permissions.includes("create_articles");

  return (
    <main className="min-h-screen bg-muted/35">
      <div className="grid lg:grid-cols-[280px_1fr]">
        <aside className="border-b bg-card lg:sticky lg:top-[177px] lg:h-[calc(100vh-177px)] lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between border-b p-5">
            <div>
              <p className="text-xs font-black uppercase text-primary">Admin</p>
              <h1 className="text-xl font-black">Novexa CMS</h1>
            </div>
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <nav className="grid max-h-[360px] gap-1 overflow-y-auto p-3 lg:max-h-none">
            {sidebarItems.map(([label, href, Icon]) => (
              <Link
                key={label}
                href={href}
                className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-bold text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
            <Link
              href="/api/auth/signout"
              className="mt-2 flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-bold text-primary transition hover:bg-primary/10"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Link>
          </nav>
        </aside>

        <section className="min-w-0 p-4 md:p-6 xl:p-8">
          <div className="mb-6 flex flex-col justify-between gap-4 rounded-lg border bg-card p-5 md:flex-row md:items-center">
            <div>
              <p className="text-sm font-black uppercase text-primary">Dashboard</p>
              <h2 className="text-3xl font-black md:text-4xl">Editorial operations overview</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Signed in as <span className="font-semibold text-foreground">{session.user.email}</span>
              </p>
            </div>
            <div className="rounded-md border bg-background px-4 py-3 text-sm font-bold capitalize">
              Role: {roleLabels[session.user.role as Role] ?? session.user.role}
            </div>
          </div>

          <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
            <Metric title="Total Users" value={data.totals.users.toLocaleString()} icon={Users} />
            <Metric title="Total Articles" value={data.totals.articles.toLocaleString()} icon={FileText} />
            <Metric title="Views" value={data.totals.views.toLocaleString()} icon={ChartNoAxesColumn} />
            <Metric title="Revenue" value={`$${data.totals.revenue.toLocaleString()}`} icon={BadgeDollarSign} />
            <Metric title="Comments" value={data.totals.comments.toLocaleString()} icon={MessageSquare} />
            <Metric title="Categories" value={data.totals.categories.toLocaleString()} icon={FolderTree} />
          </section>

          <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
            <div className="grid gap-6">
              <section className="grid gap-6 lg:grid-cols-2">
                <Panel title="Views By Category" icon={BarChart3}>
                  <BarList data={data.viewsChart} max={maxViews} empty="No view analytics found." />
                </Panel>
                <Panel title="Article Status" icon={Activity}>
                  <BarList data={data.statusChart} max={maxStatus} empty="No article status data found." />
                </Panel>
              </section>

              <Panel title="Articles Table" icon={BookOpen}>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead className="border-b text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="py-3 pr-4">Title</th>
                        <th className="py-3 pr-4">Category</th>
                        <th className="py-3 pr-4">Author</th>
                        <th className="py-3 pr-4">Status</th>
                        <th className="py-3 pr-4 text-right">Views</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recentArticles.length ? (
                        data.recentArticles.map((article) => (
                          <tr key={article.slug} className="border-b last:border-0">
                            <td className="py-3 pr-4 font-bold">
                              <Link href={`/news/${article.slug}`} className="hover:text-primary">
                                {article.title}
                              </Link>
                            </td>
                            <td className="py-3 pr-4 text-muted-foreground">{article.category}</td>
                            <td className="py-3 pr-4 text-muted-foreground">{article.author}</td>
                            <td className="py-3 pr-4">
                              <span className="rounded-sm bg-muted px-2 py-1 text-xs font-black capitalize">
                                {article.status}
                              </span>
                            </td>
                            <td className="py-3 pr-4 text-right font-black">{article.views.toLocaleString()}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-muted-foreground">
                            No articles found in MongoDB.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Panel>

              {canCreateArticles ? <ArticleEditor /> : null}
            </div>

            <aside className="grid content-start gap-6">
              <Panel title="Notifications" icon={Bell}>
                <div className="grid gap-3">
                  {data.notifications.map((notification) => (
                    <div key={notification} className="rounded-md border bg-background p-3 text-sm font-semibold">
                      {notification}
                    </div>
                  ))}
                </div>
              </Panel>

              <Panel title="Permissions" icon={ShieldCheck}>
                <div className="flex flex-wrap gap-2">
                  {session.user.permissions.length ? (
                    session.user.permissions.map((permission) => (
                      <span key={permission} className="rounded-md border bg-background px-3 py-2 text-xs font-black">
                        {permissionLabels[permission]}
                      </span>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No admin permissions assigned.</p>
                  )}
                </div>
              </Panel>

              <Panel title="Recent Activity" icon={Activity}>
                {data.recentActivity.length ? (
                  <div className="grid gap-4">
                    {data.recentActivity.map((item) => (
                      <div key={`${item.title}-${item.time}`} className="border-b pb-3 last:border-0 last:pb-0">
                        <p className="text-sm font-bold">{item.title}</p>
                        <div className="mt-1 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                          <span>{item.label}</span>
                          <span>{item.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No recent activity found.</p>
                )}
              </Panel>

              <Panel title="Categories" icon={FolderTree}>
                <StatPills items={data.categoryStats} empty="No categories found." />
              </Panel>

              <Panel title="Tags" icon={Tags}>
                <StatPills items={data.tagStats} empty="No tags found." />
              </Panel>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}

function Metric({ title, value, icon: Icon }: { title: string; value: string; icon: typeof Users }) {
  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-xs font-black uppercase text-muted-foreground">{title}</span>
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div className="text-2xl font-black">{value}</div>
    </div>
  );
}

function Panel({ title, icon: Icon, children }: { title: string; icon: typeof Users; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border bg-card p-5 shadow-sm">
      <div className="mb-5 flex items-center gap-2">
        <Icon className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-black">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function BarList({ data, max, empty }: { data: { label: string; value: number }[]; max: number; empty: string }) {
  if (!data.length) return <p className="text-sm text-muted-foreground">{empty}</p>;

  return (
    <div className="grid gap-4">
      {data.map((item) => (
        <div key={item.label} className="grid gap-2">
          <div className="flex justify-between gap-3 text-sm">
            <span className="font-bold capitalize">{item.label}</span>
            <span className="font-black">{item.value.toLocaleString()}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(6, (item.value / max) * 100)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function StatPills({ items, empty }: { items: { name: string; count: number }[]; empty: string }) {
  if (!items.length) return <p className="text-sm text-muted-foreground">{empty}</p>;

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span key={item.name} className="rounded-md border bg-background px-3 py-2 text-sm font-bold">
          {item.name} <span className="text-primary">{item.count}</span>
        </span>
      ))}
    </div>
  );
}

