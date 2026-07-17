import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { pagination, parseBody, requirePermission, serializeDocument } from "@/lib/api-utils";
import { NewsletterSubscription } from "@/models/NewsletterSubscription";

export async function GET(request: Request) {
  const { error } = await requirePermission("view_analytics");
  if (error) return error;
  await connectDB();
  const { limit, skip } = pagination(request);
  const [subscribers, total] = await Promise.all([
    NewsletterSubscription.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    NewsletterSubscription.countDocuments()
  ]);
  return NextResponse.json({ subscribers: subscribers.map(serializeDocument), total });
}

export async function POST(request: Request) {
  const body = await parseBody(request);
  if (!body?.email) return NextResponse.json({ message: "Email is required" }, { status: 400 });
  await connectDB();
  const subscriber = await NewsletterSubscription.findOneAndUpdate(
    { email: body.email.toLowerCase() },
    { ...body, status: "subscribed" },
    { new: true, upsert: true }
  );
  return NextResponse.json({ subscriber: serializeDocument(subscriber.toObject()) }, { status: 201 });
}

export async function DELETE(request: Request) {
  const body = await parseBody(request);
  if (!body?.email) return NextResponse.json({ message: "Email is required" }, { status: 400 });
  await connectDB();
  await NewsletterSubscription.findOneAndUpdate({ email: body.email.toLowerCase() }, { status: "unsubscribed" });
  return NextResponse.json({ message: "Unsubscribed" });
}
