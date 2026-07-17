import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { pagination, parseBody, requirePermission, serializeDocument } from "@/lib/api-utils";
import { Media } from "@/models/Media";

export async function GET(request: Request) {
  const { error } = await requirePermission("create_articles");
  if (error) return error;
  await connectDB();
  const { limit, skip, searchParams } = pagination(request);
  const type = searchParams.get("type");
  const query: Record<string, unknown> = type ? { type } : {};
  const [media, total] = await Promise.all([
    Media.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Media.countDocuments(query)
  ]);
  return NextResponse.json({ media: media.map(serializeDocument), total });
}

export async function POST(request: Request) {
  const { session, error } = await requirePermission("create_articles");
  if (error) return error;
  const body = await parseBody(request);
  if (!body?.url) return NextResponse.json({ message: "URL is required" }, { status: 400 });
  await connectDB();
  const media = await Media.create({ ...body, uploadedBy: session?.user.id });
  return NextResponse.json({ media: serializeDocument(media.toObject()) }, { status: 201 });
}
