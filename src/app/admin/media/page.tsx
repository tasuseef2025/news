import { connectDB } from "@/lib/db";
import { requireAdminPage } from "@/lib/admin-route";
import { AdminSectionPage } from "@/components/admin/admin-section-page";
import { Media } from "@/models/Media";

export const metadata = { title: "Media | Admin" };

export default async function MediaAdminPage() {
  await requireAdminPage("create_articles");
  await connectDB();
  const [media, total, images, videos] = await Promise.all([
    Media.find().sort({ createdAt: -1 }).limit(50).lean(),
    Media.countDocuments(),
    Media.countDocuments({ type: "image" }),
    Media.countDocuments({ type: "video" })
  ]);

  return <AdminSectionPage title="Media" description="Review uploaded images, videos, Cloudinary assets, feed images, and article media records." stats={[{ label: "Total", value: total }, { label: "Images", value: images }, { label: "Videos", value: videos }]} actions={[{ label: "Upload API", href: "/api/upload" }]} columns={["Title", "Type", "URL", "Alt"]} rows={media.map((item) => ({ Title: String(item.title || item.publicId || "Untitled"), Type: String(item.type || "image"), URL: <a className="text-primary hover:underline" href={String(item.url)} target="_blank">Open</a>, Alt: String(item.alt || "-") }))} empty="No media assets found in MongoDB." />;
}
