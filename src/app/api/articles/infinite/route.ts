import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { pagination, serializeDocument } from "@/lib/api-utils";
import { Article } from "@/models/Article";

export async function GET(request: Request) {
  await connectDB();
  const { limit, searchParams } = pagination(request);
  const cursor = searchParams.get("cursor");
  const query: Record<string, unknown> = { status: "published" };
  if (cursor) query.publishedAt = { $lt: new Date(cursor) };
  const articles = await Article.find(query).sort({ publishedAt: -1 }).limit(limit).lean();
  const nextCursor = articles.at(-1)?.publishedAt ?? null;
  return NextResponse.json({ articles: articles.map(serializeDocument), nextCursor }, { headers: { "Cache-Control": "s-maxage=30, stale-while-revalidate=120" } });
}
