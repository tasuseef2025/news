import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { parseBody, serializeDocument } from "@/lib/api-utils";
import { Article } from "@/models/Article";
import { View } from "@/models/View";

export async function GET(request: Request) {
  await connectDB();
  const articleId = new URL(request.url).searchParams.get("articleId");
  const query = articleId ? { articleId } : {};
  const total = await View.countDocuments(query);
  return NextResponse.json({ total });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const body = await parseBody(request);
  if (!body?.articleId) return NextResponse.json({ message: "articleId is required" }, { status: 400 });
  await connectDB();
  const view = await View.create({
    articleId: body.articleId,
    userId: session?.user.id,
    userAgent: request.headers.get("user-agent") ?? "",
    referrer: request.headers.get("referer") ?? ""
  });
  await Article.findByIdAndUpdate(body.articleId, { $inc: { views: 1 } });
  return NextResponse.json({ view: serializeDocument(view.toObject()) }, { status: 201 });
}
