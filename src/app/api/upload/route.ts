import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!hasPermission(session?.user.role, "create_articles")) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ message: "File is required" }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const result = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder: "novexa-news" }, (error, uploadResult) => {
      if (error) reject(error);
      else resolve(uploadResult);
    });
    stream.end(buffer);
  });

  return NextResponse.json({ result });
}

