import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { pagination, parseBody, requirePermission, serializeDocument } from "@/lib/api-utils";
import { FeedSource } from "@/models/FeedSource";

export async function GET(request: Request) {
  const { error } = await requirePermission("create_articles");
  if (error) return error;
  await connectDB();
  const { limit, skip, searchParams } = pagination(request);
  const query: Record<string, unknown> = {};
  if (searchParams.get("active")) query.active = searchParams.get("active") === "true";
  const [sources, total] = await Promise.all([
    FeedSource.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    FeedSource.countDocuments(query)
  ]);
  return NextResponse.json({ sources: sources.map(serializeDocument), total });
}

export async function POST(request: Request) {
  const { error } = await requirePermission("create_articles");
  if (error) return error;
  const body = await parseBody(request);
  if (!body?.name || !body?.url) {
    return NextResponse.json({ message: "Name and feed URL are required" }, { status: 400 });
  }
  await connectDB();
  const source = await FeedSource.create({
    name: body.name,
    url: body.url,
    defaultCategory: body.defaultCategory || "Breaking News",
    active: body.active ?? true,
    autoPublish: body.autoPublish ?? false
  });
  return NextResponse.json({ source: serializeDocument(source.toObject()) }, { status: 201 });
}

export async function PATCH(request: Request) {
  const { error } = await requirePermission("create_articles");
  if (error) return error;
  const body = await parseBody(request);
  if (!body?._id) return NextResponse.json({ message: "_id is required" }, { status: 400 });
  await connectDB();
  const source = await FeedSource.findByIdAndUpdate(body._id, body, { new: true });
  return NextResponse.json({ source: source ? serializeDocument(source.toObject()) : null });
}
