import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { pagination, parseBody, requirePermission, serializeDocument } from "@/lib/api-utils";
import { Tag } from "@/models/Tag";
import { Article } from "@/models/Article";

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export async function GET(request: Request) {
  await connectDB();
  const { limit, skip } = pagination(request);
  const [storedTags, articleTags] = await Promise.all([
    Tag.find().sort({ name: 1 }).skip(skip).limit(limit).lean(),
    Article.aggregate([{ $unwind: "$tags" }, { $group: { _id: "$tags", count: { $sum: 1 } } }, { $sort: { count: -1 } }])
  ]);
  return NextResponse.json({ tags: storedTags.map(serializeDocument), articleTags });
}

export async function POST(request: Request) {
  const { error } = await requirePermission("create_articles");
  if (error) return error;
  const body = await parseBody(request);
  if (!body?.name) return NextResponse.json({ message: "Name is required" }, { status: 400 });
  await connectDB();
  const tag = await Tag.create({ ...body, slug: body.slug || slugify(body.name) });
  return NextResponse.json({ tag: serializeDocument(tag.toObject()) }, { status: 201 });
}
