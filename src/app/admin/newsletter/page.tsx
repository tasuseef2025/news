import { connectDB } from "@/lib/db";
import { requireAdminPage } from "@/lib/admin-route";
import { AdminSectionPage } from "@/components/admin/admin-section-page";
import { NewsletterSubscription } from "@/models/NewsletterSubscription";

export const metadata = { title: "Newsletter | Admin" };

export default async function NewsletterAdminPage() {
  await requireAdminPage("view_analytics");
  await connectDB();
  const [subscribers, total, subscribed] = await Promise.all([
    NewsletterSubscription.find().sort({ createdAt: -1 }).limit(50).lean(),
    NewsletterSubscription.countDocuments(),
    NewsletterSubscription.countDocuments({ status: "subscribed" })
  ]);

  return <AdminSectionPage title="Newsletter" description="Monitor newsletter subscribers, status, source fields, and growth for email distribution." stats={[{ label: "Total", value: total }, { label: "Subscribed", value: subscribed }]} columns={["Email", "Status", "Name"]} rows={subscribers.map((item) => ({ Email: <span className="font-bold">{String(item.email)}</span>, Status: String(item.status), Name: String(item.name || "-") }))} empty="No newsletter subscribers found in MongoDB." />;
}
