import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { pagination, parseBody, requirePermission, serializeDocument } from "@/lib/api-utils";
import { Advertisement } from "@/models/Advertisement";

export async function GET(request: Request) {
  await connectDB();
  const { limit, skip, searchParams } = pagination(request);
  const placement = searchParams.get("placement");
  const query: Record<string, unknown> = {};
  if (placement) query.placement = placement;
  if (searchParams.get("active")) query.active = searchParams.get("active") === "true";
  const [advertisements, total] = await Promise.all([
    Advertisement.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Advertisement.countDocuments(query)
  ]);
  return NextResponse.json({ advertisements: advertisements.map(serializeDocument), total });
}

export async function POST(request: Request) {
  const { error } = await requirePermission("manage_ads");
  if (error) return error;
  const body = await parseBody(request);
  if (!body?.title || !body?.placement) return NextResponse.json({ message: "Title and placement are required" }, { status: 400 });
  await connectDB();
  const advertisement = await Advertisement.create(body);
  return NextResponse.json({ advertisement: serializeDocument(advertisement.toObject()) }, { status: 201 });
}

export async function PATCH(request: Request) {
  const { error } = await requirePermission("manage_ads");
  if (error) return error;
  const body = await parseBody(request);
  if (!body?._id) return NextResponse.json({ message: "_id is required" }, { status: 400 });
  await connectDB();
  const advertisement = await Advertisement.findByIdAndUpdate(body._id, body, { new: true });
  return NextResponse.json({ advertisement: advertisement ? serializeDocument(advertisement.toObject()) : null });
}
