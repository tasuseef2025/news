import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requirePermission } from "@/lib/api-utils";
import { updateTrendingPosts } from "@/lib/trending";

export async function POST() {
  const { error } = await requirePermission("view_analytics");
  if (error) return error;
  await connectDB();
  const updated = await updateTrendingPosts();
  return NextResponse.json({ message: "Trending posts updated", updated });
}
