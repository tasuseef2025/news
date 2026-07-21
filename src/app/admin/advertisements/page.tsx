import { connectDB } from "@/lib/db";
import { requireAdminPage } from "@/lib/admin-route";
import { AdminSectionPage } from "@/components/admin/admin-section-page";
import { Advertisement } from "@/models/Advertisement";

export const metadata = { title: "Advertisements | Admin" };

export default async function AdvertisementsAdminPage() {
  await requireAdminPage("manage_ads");
  await connectDB();
  const [ads, total, active, revenue] = await Promise.all([
    Advertisement.find().sort({ createdAt: -1 }).limit(50).lean(),
    Advertisement.countDocuments(),
    Advertisement.countDocuments({ active: true }),
    Advertisement.aggregate([{ $group: { _id: null, total: { $sum: "$revenue" } } }])
  ]);

  return <AdminSectionPage title="Advertisements" description="Review ad placements, sponsors, active campaigns, destination links, and revenue records." stats={[{ label: "Total Ads", value: total }, { label: "Active", value: active }, { label: "Revenue", value: `$${Number(revenue[0]?.total || 0).toLocaleString()}` }]} columns={["Title", "Placement", "Sponsor", "Status", "Revenue"]} rows={ads.map((item) => ({ Title: <span className="font-bold">{String(item.title)}</span>, Placement: String(item.placement), Sponsor: String(item.sponsor || "-"), Status: item.active ? "Active" : "Inactive", Revenue: `$${Number(item.revenue || 0).toLocaleString()}` }))} empty="No advertisements found in MongoDB." />;
}
