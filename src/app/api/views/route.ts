import { createHash, randomUUID } from "crypto";
import { isValidObjectId } from "mongoose";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { Article } from "@/models/Article";
import { View } from "@/models/View";

const VIEW_COOKIE = "novexa_visitor";
const VIEW_WINDOW_MS = 30 * 60 * 1000;
const BOT_USER_AGENT = /bot|crawler|spider|slurp|facebookexternalhit|whatsapp|telegrambot|linkedinbot|preview/i;

function fingerprint(value: string) {
  return createHash("sha256")
    .update(`${value}:${process.env.NEXTAUTH_SECRET || "novexa-view"}`)
    .digest("hex");
}

export async function GET(request: Request) {
  await connectDB();
  const articleId = new URL(request.url).searchParams.get("articleId");
  const query = articleId && isValidObjectId(articleId) ? { articleId } : {};
  const total = await View.countDocuments(query);
  return NextResponse.json({ total });
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { articleId?: string; visitorId?: string } | null;
  if (!body?.articleId || !isValidObjectId(body.articleId)) {
    return NextResponse.json({ message: "A valid articleId is required" }, { status: 400 });
  }

  const userAgent = request.headers.get("user-agent") || "";
  if (BOT_USER_AGENT.test(userAgent)) {
    return NextResponse.json({ counted: false, reason: "automated-client" });
  }

  await connectDB();
  const article = (await Article.findOne({ _id: body.articleId, status: "published" }).select({ views: 1 }).lean()) as { views?: number } | null;
  if (!article) return NextResponse.json({ message: "Article not found" }, { status: 404 });

  const session = await getServerSession(authOptions);
  const existingVisitor = request.cookies.get(VIEW_COOKIE)?.value;
  const suppliedVisitor = /^[0-9a-f-]{36}$/i.test(body.visitorId || "") ? body.visitorId : "";
  const visitorId = session?.user.id || suppliedVisitor || existingVisitor || randomUUID();
  const visitorHash = fingerprint(visitorId);
  const windowId = Math.floor(Date.now() / VIEW_WINDOW_MS);
  const dedupeKey = fingerprint(`${body.articleId}:${visitorHash}:${windowId}`);

  try {
    await View.create({
      articleId: body.articleId,
      userId: session?.user.id,
      dedupeKey,
      visitorHash,
      userAgent: userAgent.slice(0, 500),
      referrer: (request.headers.get("referer") || "").slice(0, 1000)
    });
  } catch (error) {
    if ((error as { code?: number }).code === 11000) {
      return NextResponse.json({ counted: false, total: Number(article.views || 0) });
    }
    throw error;
  }

  const updated = (await Article.findByIdAndUpdate(
    body.articleId,
    { $inc: { views: 1 } },
    { new: true, timestamps: false }
  ).select({ views: 1 }).lean()) as { views?: number } | null;
  const response = NextResponse.json({ counted: true, total: Number(updated?.views || article.views || 0) }, { status: 201 });

  if (!existingVisitor && !session?.user.id) {
    response.cookies.set(VIEW_COOKIE, visitorId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365,
      path: "/"
    });
  }

  return response;
}
