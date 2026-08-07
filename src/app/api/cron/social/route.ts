export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/cron";
import { connectDB } from "@/lib/db";
import { getXPublishingConfiguration, publishArticleToX, type PublishableArticle } from "@/lib/x-publishing";
import { Article } from "@/models/Article";
import { SocialPublication } from "@/models/SocialPublication";

export async function GET(request: Request) {
  const authError = verifyCronRequest(request);
  if (authError) return authError;

  await connectDB();
  const url = new URL(request.url);
  const shouldPublish = url.searchParams.get("publish") === "true";
  const configuration = getXPublishingConfiguration();
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const eligibility: Record<string, unknown> = { status: "published", publishedAt: { $gte: cutoff } };

  if (configuration.mode === "manual") eligibility.generationMode = "manual";
  if (configuration.mode === "selected") eligibility.$or = [{ featured: true }, { breakingNews: true }];

  const alreadyHandled = await SocialPublication.find({ platform: "x", status: { $in: ["published", "publishing"] } })
    .distinct("articleId");
  if (alreadyHandled.length) eligibility._id = { $nin: alreadyHandled };

  const limit = Math.min(10, Math.max(1, Number(process.env.X_AUTO_PUBLISH_BATCH_LIMIT || 2)));
  const candidates = await Article.find(eligibility)
    .sort({ publishedAt: -1 })
    .limit(limit)
    .select("_id title slug status generationMode featured breakingNews publishedAt")
    .lean<Array<PublishableArticle & { publishedAt?: Date }>>();

  const recentFailures = await SocialPublication.find({ platform: "x", status: "failed" })
    .sort({ updatedAt: -1 })
    .limit(5)
    .select("articleId error attempts updatedAt")
    .lean();

  const results = shouldPublish
    ? await Promise.all(candidates.map((article) => publishArticleToX(article)))
    : [];

  return NextResponse.json({
    message: shouldPublish ? "X publishing retry completed" : "X publishing diagnostic completed (dry run)",
    configuration,
    candidateCount: candidates.length,
    candidates: candidates.map((article) => ({ title: article.title, slug: article.slug, publishedAt: article.publishedAt })),
    recentFailures,
    results,
    ranAt: new Date().toISOString()
  });
}
