import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { pagination, serializeDocument } from "@/lib/api-utils";
import { Article } from "@/models/Article";
import { publicArticleFilter } from "@/lib/public-articles";

export async function GET(request: Request) {
  await connectDB();
  const { limit, searchParams } = pagination(request);
  const category = searchParams.get("category");
  const query: Record<string, unknown> = publicArticleFilter();
  if (category) query.category = new RegExp(`^${category}$`, "i");
  const articles = await Article.find(query).sort({ trending: -1, views: -1, publishedAt: -1 }).limit(limit).lean();
  return NextResponse.json({ articles: articles.map(serializeDocument) }, { headers: { "Cache-Control": "s-maxage=180, stale-while-revalidate=600" } });
}
