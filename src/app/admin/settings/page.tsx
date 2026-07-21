import { requireAdminPage } from "@/lib/admin-route";
import { AdminSectionPage } from "@/components/admin/admin-section-page";
import { siteConfig } from "@/lib/site";

export const metadata = { title: "Settings | Admin" };

export default async function SettingsAdminPage() {
  await requireAdminPage("manage_settings");
  const rows = [
    { Setting: "Site Name", Value: siteConfig.name, Source: "src/lib/site.ts" },
    { Setting: "Domain", Value: siteConfig.domain, Source: "NEXT_PUBLIC_SITE_URL" },
    { Setting: "Contact Email", Value: siteConfig.contactEmail, Source: "src/lib/site.ts" },
    { Setting: "Founder", Value: siteConfig.founder, Source: "src/lib/site.ts" },
    { Setting: "Cron Secret", Value: process.env.CRON_SECRET ? "Configured" : "Missing", Source: "Vercel/VPS env" },
    { Setting: "OpenAI", Value: process.env.OPENAI_API_KEY ? "Configured" : "Missing", Source: "OPENAI_API_KEY" },
    { Setting: "Cloudinary", Value: process.env.CLOUDINARY_CLOUD_NAME ? "Configured" : "Missing", Source: "Cloudinary env" }
  ];

  return <AdminSectionPage title="Settings" description="Review deployment-critical configuration without exposing private secrets in the browser." stats={[{ label: "Configured", value: rows.filter((row) => row.Value !== "Missing").length }, { label: "Missing", value: rows.filter((row) => row.Value === "Missing").length }]} columns={["Setting", "Value", "Source"]} rows={rows} />;
}

