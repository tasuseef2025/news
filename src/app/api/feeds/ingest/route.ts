import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { parseBody, requirePermission, serializeDocument } from "@/lib/api-utils";
import { ingestFeedSource } from "@/lib/feed-ingestion";
import { FeedSource } from "@/models/FeedSource";

export async function POST(request: Request) {
  const { error } = await requirePermission("publish_articles");
  if (error) return error;
  const body = await parseBody(request);
  await connectDB();

  const sourceIds = body?.sourceId
    ? [body.sourceId]
    : (await FeedSource.find({ active: true }).select("_id").lean<{ _id: { toString: () => string } }[]>()).map((source) => source._id.toString());

  const results = [];
  for (const sourceId of sourceIds) {
    const result = await ingestFeedSource(sourceId);
    results.push({
      sourceId,
      total: result.total,
      skipped: result.skipped.length,
      created: result.created.map((article) => serializeDocument(article.toObject()))
    });
  }

  return NextResponse.json({ results });
}

