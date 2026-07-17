import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { pagination, parseBody, serializeDocument } from "@/lib/api-utils";
import { Comment } from "@/models/Comment";
import { canAccessAdmin } from "@/lib/permissions";

export async function GET(request: Request) {
  await connectDB();
  const { limit, skip, searchParams } = pagination(request);
  const articleId = searchParams.get("articleId");
  const status = searchParams.get("status") || "approved";
  const query: Record<string, unknown> = { status };
  if (articleId) query.articleId = articleId;
  const [comments, total] = await Promise.all([
    Comment.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Comment.countDocuments(query)
  ]);
  return NextResponse.json({ comments: comments.map(serializeDocument), total });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const body = await parseBody(request);
  if (!body?.articleId || !body?.name || !body?.email || !body?.content) {
    return NextResponse.json({ message: "articleId, name, email, and content are required" }, { status: 400 });
  }
  await connectDB();
  const comment = await Comment.create({ ...body, userId: session?.user.id });
  return NextResponse.json({ comment: serializeDocument(comment.toObject()) }, { status: 201 });
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!canAccessAdmin(session?.user.role) && session?.user.role !== "moderator") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
  const body = await parseBody(request);
  if (!body?._id) return NextResponse.json({ message: "_id is required" }, { status: 400 });
  await connectDB();
  const comment = await Comment.findByIdAndUpdate(body._id, body, { new: true });
  return NextResponse.json({ comment: comment ? serializeDocument(comment.toObject()) : null });
}
