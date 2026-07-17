import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { pagination, parseBody, requirePermission, serializeDocument } from "@/lib/api-utils";
import { Author } from "@/models/Author";

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export async function GET(request: Request) {
  await connectDB();
  const { limit, skip, searchParams } = pagination(request);
  const query: Record<string, unknown> = {};
  if (searchParams.get("active")) query.active = searchParams.get("active") === "true";
  const [authors, total] = await Promise.all([
    Author.find(query).sort({ name: 1 }).skip(skip).limit(limit).lean(),
    Author.countDocuments(query)
  ]);
  return NextResponse.json({ authors: authors.map(serializeDocument), total });
}

export async function POST(request: Request) {
  const { error } = await requirePermission("manage_users");
  if (error) return error;
  const body = await parseBody(request);
  if (!body?.name) return NextResponse.json({ message: "Name is required" }, { status: 400 });
  await connectDB();
  const author = await Author.create({ ...body, slug: body.slug || slugify(body.name) });
  return NextResponse.json({ author: serializeDocument(author.toObject()) }, { status: 201 });
}
