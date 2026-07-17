import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Article } from "@/models/Article";

export async function GET(request: Request) {
  await connectDB();
  const q = new URL(request.url).searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ suggestions: [] }, { headers: { "Cache-Control": "s-maxage=60" } });
  const articles = await Article.find({ status: "published", title: new RegExp(q, "i") }).select("title slug category").sort({ views: -1 }).limit(8).lean();
  return NextResponse.json({ suggestions: articles }, { headers: { "Cache-Control": "s-maxage=60, stale-while-revalidate=300" } });
}
