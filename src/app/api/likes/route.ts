import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { parseBody, serializeDocument } from "@/lib/api-utils";
import { Like } from "@/models/Like";

export async function GET(request: Request) {
  await connectDB();
  const articleId = new URL(request.url).searchParams.get("articleId");
  const query = articleId ? { articleId } : {};
  const total = await Like.countDocuments(query);
  return NextResponse.json({ total });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const body = await parseBody(request);
  if (!body?.articleId) return NextResponse.json({ message: "articleId is required" }, { status: 400 });
  await connectDB();
  const like = await Like.findOneAndUpdate(
    { userId: session?.user.id, articleId: body.articleId },
    { userId: session?.user.id, articleId: body.articleId },
    { new: true, upsert: true }
  );
  return NextResponse.json({ like: serializeDocument(like.toObject()) }, { status: 201 });
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const body = await parseBody(request);
  if (!body?.articleId) return NextResponse.json({ message: "articleId is required" }, { status: 400 });
  await connectDB();
  await Like.findOneAndDelete({ userId: session.user.id, articleId: body.articleId });
  return NextResponse.json({ message: "Like removed" });
}
