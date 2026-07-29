import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { Tip } from "@/models/Tip";

const mediaSchema = z.object({
  url: z.string().url(),
  type: z.enum(["image", "video", "other"]).default("other"),
  publicId: z.string().optional()
});

const tipSchema = z.object({
  anonymous: z.boolean().default(false),
  name: z.string().max(120).optional().default(""),
  email: z.string().email().optional().or(z.literal("")).default(""),
  phone: z.string().max(40).optional().default(""),
  location: z.string().max(160).optional().default(""),
  category: z.string().max(80).optional().default("News Tip"),
  title: z.string().min(8).max(160),
  description: z.string().min(40).max(5000),
  media: z.array(mediaSchema).max(5).default([])
});

function ipHash(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
  return createHash("sha256").update(forwarded.split(",")[0].trim()).digest("hex").slice(0, 24);
}

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = tipSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid tip details", issues: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const payload = parsed.data;
  await connectDB();
  const tip = await Tip.create({
    ...payload,
    name: payload.anonymous ? "" : payload.name,
    email: payload.anonymous ? "" : payload.email,
    phone: payload.anonymous ? "" : payload.phone,
    ipHash: ipHash(request)
  });

  return NextResponse.json({ message: "News tip submitted for editorial review", tipId: tip._id.toString() }, { status: 201 });
}

