import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { articleSchema } from "@/lib/validators";
import { Article } from "@/models/Article";
import { hasPermission } from "@/lib/permissions";
import { normalizeArticleUpdate } from "@/lib/content-automation";

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
  const parsed = articleSchema.partial().safeParse(normalizeArticleUpdate(payload));

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid payload", errors: parsed.error.flatten() }, { status: 400 });
  }

  const update = {
    ...parsed.data,
    ...(parsed.data.status === "published" ? { publishedAt: new Date() } : {}),
    ...(parsed.data.scheduledAt ? { scheduledAt: new Date(parsed.data.scheduledAt) } : {})
  };

  await connectDB();
  const article = await Article.findByIdAndUpdate(id, update, { new: true });

  if (!article) {
    return NextResponse.json({ message: "Article not found" }, { status: 404 });
  }

  return NextResponse.json({ article });
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

  return NextResponse.json({ message: "Article deleted" });
}


