import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { pagination, parseBody, requirePermission, serializeDocument } from "@/lib/api-utils";
import { Category } from "@/models/Category";

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export async function GET(request: Request) {
  await connectDB();
  const { limit, skip, searchParams } = pagination(request);
  const active = searchParams.get("active");
  const query: Record<string, unknown> = {};
  if (active) query.active = active === "true";
  const [categories, total] = await Promise.all([
    Category.find(query).sort({ order: 1, name: 1 }).skip(skip).limit(limit).lean(),
    Category.countDocuments(query)
  ]);
  return NextResponse.json({ categories: categories.map(serializeDocument), total });
}

export async function POST(request: Request) {
  const { error } = await requirePermission("manage_categories");
  if (error) return error;
  const body = await parseBody(request);
  if (!body?.name) return NextResponse.json({ message: "Name is required" }, { status: 400 });
  await connectDB();
  const category = await Category.create({ ...body, slug: body.slug || slugify(body.name) });
  return NextResponse.json({ category: serializeDocument(category.toObject()) }, { status: 201 });
}
