import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { pagination, serializeDocument } from "@/lib/api-utils";
import { publishDueScheduledArticles } from "@/lib/articles";
import { Article } from "@/models/Article";

export async function GET(request: Request) {
  await connectDB();
  await publishDueScheduledArticles();
  const { limit, skip, searchParams } = pagination(request);
  const q = searchParams.get("q")?.trim();
  const category = searchParams.get("category");
  const query: Record<string, unknown> = { status: "published" };
  if (q) query.$text = { $search: q };
  if (category) query.category = new RegExp(`^${category}$`, "i");
  const [articles, total] = await Promise.all([
    Article.find(query).sort(q ? { score: { $meta: "textScore" } } : { publishedAt: -1 }).skip(skip).limit(limit).lean(),
    Article.countDocuments(query)
  ]);
  return NextResponse.json({ articles: articles.map(serializeDocument), total, query: q ?? "" });
}
