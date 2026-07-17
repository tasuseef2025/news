import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { serializeDocument } from "@/lib/api-utils";
import { Article } from "@/models/Article";

export async function GET(request: Request) {
  await connectDB();
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");
  const limit = Math.min(12, Math.max(1, Number(searchParams.get("limit") ?? 6)));
  const article = slug ? await Article.findOne({ slug, status: "published" }).lean<{ category: string; tags?: string[] }>() : null;
  if (!article) return NextResponse.json({ articles: [] });
  const query = {
    status: "published",
    slug: { $ne: slug },
    $or: [{ category: article.category }, { tags: { $in: article.tags || [] } }]
  };
  const articles = await Article.find(query).sort({ publishedAt: -1 }).limit(limit).lean();
  return NextResponse.json({ articles: articles.map(serializeDocument) }, { headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=900" } });
}

