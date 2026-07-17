import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { parseBody, requirePermission, serializeDocument } from "@/lib/api-utils";
import { WebVital } from "@/models/WebVital";

export async function GET() {
  const { error } = await requirePermission("view_analytics");
  if (error) return error;
  await connectDB();
  const metrics = await WebVital.aggregate([
    { $group: { _id: "$name", average: { $avg: "$value" }, min: { $min: "$value" }, max: { $max: "$value" }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ]);
  return NextResponse.json({ metrics });
}

export async function POST(request: Request) {
  const body = await parseBody(request);
  if (!body?.name || typeof body.value !== "number") return NextResponse.json({ ok: false }, { status: 400 });
  await connectDB();
  const metric = await WebVital.create(body);
  return NextResponse.json({ metric: serializeDocument(metric.toObject()) }, { status: 201 });
}

