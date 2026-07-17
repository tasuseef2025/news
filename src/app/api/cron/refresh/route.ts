export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/cron";
import { absoluteUrl } from "@/lib/utils";

async function warm(path: string) {
  try {
    const response = await fetch(absoluteUrl(path), { cache: "no-store" });
    return { path, ok: response.ok, status: response.status };
  } catch (error) {
    return { path, ok: false, error: error instanceof Error ? error.message : "Request failed" };
  }
}

export async function GET(request: Request) {
  const authError = verifyCronRequest(request);
  if (authError) return authError;

  revalidatePath("/", "layout");
  const warmed = await Promise.all([warm("/sitemap.xml"), warm("/news-sitemap.xml"), warm("/rss.xml"), warm("/robots.txt")]);

  return NextResponse.json({
    message: "SEO refresh cron completed",
    warmed,
    ranAt: new Date().toISOString()
  });
}
