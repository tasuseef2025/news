export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/cron";
import { connectDB } from "@/lib/db";
import { updateTrendingPosts } from "@/lib/trending";

export async function GET(request: Request) {
  const authError = verifyCronRequest(request);
  if (authError) return authError;

  await connectDB();
  const updated = await updateTrendingPosts();
  revalidatePath("/", "layout");

  return NextResponse.json({
    message: "Trending posts cron completed",
    updated,
    ranAt: new Date().toISOString()
  });
}
