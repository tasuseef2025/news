import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectDB();
    return NextResponse.json({
      ok: true,
      service: "news-website",
      database: mongoose.connection.readyState === 1 ? "connected" : "not_connected",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        service: "news-website",
        database: "error",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString()
      },
      { status: 503 }
    );
  }
}
