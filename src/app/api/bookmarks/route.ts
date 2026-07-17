import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { parseBody, requireSession, serializeDocument } from "@/lib/api-utils";
import { Bookmark } from "@/models/Bookmark";

export async function GET() {
  const { session, error } = await requireSession();
  if (error) return error;
  await connectDB();
  const bookmarks = await Bookmark.find({ userId: session?.user.id }).populate("articleId").sort({ createdAt: -1 }).lean();
  return NextResponse.json({ bookmarks: bookmarks.map(serializeDocument) });
}

export async function POST(request: Request) {
  const { session, error } = await requireSession();
  if (error) return error;
  const body = await parseBody(request);
  if (!body?.articleId) return NextResponse.json({ message: "articleId is required" }, { status: 400 });
  await connectDB();
  const bookmark = await Bookmark.findOneAndUpdate(
    { userId: session?.user.id, articleId: body.articleId },
    { userId: session?.user.id, articleId: body.articleId },
    { new: true, upsert: true }
  );
  return NextResponse.json({ bookmark: serializeDocument(bookmark.toObject()) }, { status: 201 });
}

export async function DELETE(request: Request) {
  const { session, error } = await requireSession();
  if (error) return error;
  const body = await parseBody(request);
  if (!body?.articleId) return NextResponse.json({ message: "articleId is required" }, { status: 400 });
  await connectDB();
  await Bookmark.findOneAndDelete({ userId: session?.user.id, articleId: body.articleId });
  return NextResponse.json({ message: "Bookmark removed" });
}
