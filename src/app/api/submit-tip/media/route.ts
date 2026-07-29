import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

export const runtime = "nodejs";

const maxBytes = 25 * 1024 * 1024;
const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/webm", "video/quicktime"];

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

export async function POST(request: Request) {
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    return NextResponse.json({ message: "Media upload is not configured yet" }, { status: 503 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ message: "File is required" }, { status: 400 });
  }

  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ message: "Only image and video files are allowed" }, { status: 400 });
  }

  if (file.size > maxBytes) {
    return NextResponse.json({ message: "File must be 25MB or smaller" }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const resourceType = file.type.startsWith("video/") ? "video" : "image";

  const result = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "novexa-tips", resource_type: resourceType, moderation: "manual" },
      (error, uploadResult) => {
        if (error || !uploadResult) reject(error || new Error("Upload failed"));
        else resolve({ secure_url: uploadResult.secure_url, public_id: uploadResult.public_id });
      }
    );
    stream.end(buffer);
  });

  return NextResponse.json({ url: result.secure_url, publicId: result.public_id, type: resourceType });
}

