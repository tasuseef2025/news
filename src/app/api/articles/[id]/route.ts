import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { articleSchema } from "@/lib/validators";
import { Article } from "@/models/Article";
import { hasPermission } from "@/lib/permissions";
import { normalizeArticleUpdate } from "@/lib/content-automation";
import { publishArticleToX } from "@/lib/x-publishing";
import { absoluteUrl } from "@/lib/utils";
import { ArticleRevision } from "@/models/ArticleRevision";

type Params = {
  params: Promise<{ id: string }>;
};

async function getRole() {
  const session = await getServerSession(authOptions);
  return session?.user.role;
}

export async function GET(_request: Request, { params }: Params) {
  const role = await getRole();
  if (!hasPermission(role, "create_articles")) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await connectDB();
  const article = await Article.findById(id).lean();

  if (!article) {
    return NextResponse.json({ message: "Article not found" }, { status: 404 });
  }

  return NextResponse.json({ article });
}

export async function PATCH(request: Request, { params }: Params) {
  const role = await getRole();
  if (!hasPermission(role, "create_articles")) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const payload = await request.json();
  if (["published", "scheduled"].includes(payload.status) && !hasPermission(role, "publish_articles")) {
    return NextResponse.json({ message: "Missing publish permission" }, { status: 403 });
  }
  await connectDB();
  const existing = await Article.findById(id);
  if (!existing) {
    return NextResponse.json({ message: "Article not found" }, { status: 404 });
  }

  const normalized = normalizeArticleUpdate(payload);
  if (existing.status === "published") {
    normalized.slug = existing.slug;
    normalized.canonicalUrl = absoluteUrl(`/news/${existing.slug}`);
  }
  const parsed = articleSchema.partial().safeParse(normalized);

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid payload", errors: parsed.error.flatten() }, { status: 400 });
  }

  const update = {
    ...parsed.data,
    ...(parsed.data.status === "published" && existing.status !== "published" ? { publishedAt: new Date() } : {}),
    ...(parsed.data.status === "published" ? { reviewStatus: "approved", rejectionReasons: [] } : {}),
    lastUpdatedAt: new Date(),
    ...(parsed.data.scheduledAt ? { scheduledAt: new Date(parsed.data.scheduledAt) } : {})
  };

  const materiallyChanged = ["title", "excerpt", "content", "metaTitle", "metaDescription"].some((field) => {
    const key = field as keyof typeof parsed.data;
    return parsed.data[key] !== undefined && parsed.data[key] !== existing.get(field);
  });
  if (materiallyChanged) {
    await ArticleRevision.create({
      articleId: existing._id,
      title: existing.title,
      excerpt: existing.excerpt,
      content: existing.content,
      metaTitle: existing.metaTitle,
      metaDescription: existing.metaDescription,
      sourceName: existing.sourceName,
      sourceUrl: existing.sourceUrl,
      reason: "manual-editor-update"
    });
  }
  const article = await Article.findByIdAndUpdate(id, update, { new: true });

  if (!article) {
    return NextResponse.json({ message: "Article not found" }, { status: 404 });
  }

  const social = await publishArticleToX(article);
  revalidatePath("/", "layout");
  revalidatePath(`/news/${article.slug}`);
  revalidatePath("/sitemap.xml");
  revalidatePath("/news-sitemap.xml");
  revalidatePath("/rss.xml");
  return NextResponse.json({ article, social });
}

export async function DELETE(_request: Request, { params }: Params) {
  const role = await getRole();
  if (!hasPermission(role, "delete_articles")) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await connectDB();
  const article = await Article.findByIdAndDelete(id);

  if (!article) {
    return NextResponse.json({ message: "Article not found" }, { status: 404 });
  }

  revalidatePath("/", "layout");
  revalidatePath(`/news/${article.slug}`);
  revalidatePath("/sitemap.xml");
  revalidatePath("/news-sitemap.xml");
  revalidatePath("/rss.xml");

  return NextResponse.json({ message: "Article deleted" });
}


