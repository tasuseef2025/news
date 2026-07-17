import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { getArticles } from "@/lib/articles";
import { connectDB } from "@/lib/db";
import { articleSchema } from "@/lib/validators";
import { Article } from "@/models/Article";
import { hasPermission } from "@/lib/permissions";
import { normalizeArticlePayload } from "@/lib/content-automation";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const scope = searchParams.get("scope");
  const category = searchParams.get("category") ?? undefined;
  const limit = Number(searchParams.get("limit") ?? 24);

  if (scope === "admin") {
    const session = await getServerSession(authOptions);
    const role = session?.user.role;

    if (!hasPermission(role, "create_articles")) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    await connectDB();
    const articles = await Article.find().sort({ updatedAt: -1 }).limit(limit).lean();
    return NextResponse.json({ articles }, { headers: { "Cache-Control": "s-maxage=60, stale-while-revalidate=300" } });
  }

  const articles = await getArticles({ category, limit });

  return NextResponse.json({ articles }, { headers: { "Cache-Control": "s-maxage=60, stale-while-revalidate=300" } });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const role = session?.user.role;

  if (!hasPermission(role, "create_articles")) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const payload = await request.json();
  const parsed = articleSchema.safeParse(normalizeArticlePayload(payload));

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid payload", errors: parsed.error.flatten() }, { status: 400 });
  }

  if (["published", "scheduled"].includes(parsed.data.status) && !hasPermission(role, "publish_articles")) {
    return NextResponse.json({ message: "Missing publish permission" }, { status: 403 });
  }

  const data = {
    ...parsed.data,
    publishedAt: parsed.data.status === "published" ? new Date() : undefined,
    scheduledAt: parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : undefined
  };

  await connectDB();
  const article = await Article.create(data);

  return NextResponse.json({ article }, { status: 201 });
}

