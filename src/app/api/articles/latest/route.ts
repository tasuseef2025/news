import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { pagination, serializeDocument } from "@/lib/api-utils";
import { Article } from "@/models/Article";

export async function GET(request: Request) {
  await connectDB();
  const { limit, skip } = pagination(request);
  const articles = await Article.find({ status: "published" }).sort({ publishedAt: -1 }).skip(skip).limit(limit).lean();
  return NextResponse.json({ articles: articles.map(serializeDocument) }, { headers: { "Cache-Control": "s-maxage=60, stale-while-revalidate=300" } });
}
