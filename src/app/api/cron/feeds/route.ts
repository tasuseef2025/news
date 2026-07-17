export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/cron";
import { connectDB } from "@/lib/db";
import { ingestFeedSource } from "@/lib/feed-ingestion";
import { FeedSource } from "@/models/FeedSource";

export async function GET(request: Request) {
  const authError = verifyCronRequest(request);
  if (authError) return authError;

  await connectDB();
  const sources = await FeedSource.find({ active: true }).select("_id name").lean<{ _id: { toString: () => string }; name: string }[]>();
  const results = [];

  for (const source of sources) {
    try {
      const result = await ingestFeedSource(source._id.toString());
      results.push({
        sourceId: source._id.toString(),
        sourceName: source.name,
        total: result.total,
        created: result.created.length,
        skipped: result.skipped.length
      });
    } catch (error) {
      results.push({
        sourceId: source._id.toString(),
        sourceName: source.name,
        error: error instanceof Error ? error.message : "Feed ingestion failed"
      });
    }
  }

  revalidatePath("/", "layout");

  return NextResponse.json({
    message: "Feed ingestion cron completed",
    sources: sources.length,
    results,
    ranAt: new Date().toISOString()
  });
}
