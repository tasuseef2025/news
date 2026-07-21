import { requireAdminPage } from "@/lib/admin-route";
import { AdminSectionPage } from "@/components/admin/admin-section-page";
import { absoluteUrl } from "@/lib/utils";

export const metadata = { title: "SEO | Admin" };

export default async function SeoAdminPage() {
  await requireAdminPage("manage_settings");
  const rows = [
    { Area: "Sitemap", URL: <a className="text-primary hover:underline" href="/sitemap.xml" target="_blank">{absoluteUrl("/sitemap.xml")}</a>, Status: "Dynamic" },
    { Area: "News Sitemap", URL: <a className="text-primary hover:underline" href="/news-sitemap.xml" target="_blank">{absoluteUrl("/news-sitemap.xml")}</a>, Status: "Dynamic" },
    { Area: "RSS Feed", URL: <a className="text-primary hover:underline" href="/rss.xml" target="_blank">{absoluteUrl("/rss.xml")}</a>, Status: "Dynamic" },
    { Area: "Robots", URL: <a className="text-primary hover:underline" href="/robots.txt" target="_blank">{absoluteUrl("/robots.txt")}</a>, Status: "Dynamic" },
    { Area: "OpenGraph Images", URL: <a className="text-primary hover:underline" href="/api/og?title=Novexa%20News&category=World" target="_blank">Preview</a>, Status: "Generated" }
  ];

  return <AdminSectionPage title="SEO" description="Check generated SEO endpoints used by Google Search, Google News, RSS readers, OpenGraph previews, and crawler discovery." stats={[{ label: "Dynamic Files", value: rows.length }]} columns={["Area", "URL", "Status"]} rows={rows} />;
}
