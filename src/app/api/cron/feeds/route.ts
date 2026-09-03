export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/cron";
import { connectDB } from "@/lib/db";
import {
  createPacedFeedAiBudget,
  ingestPreparedFeedSource,
  isFeedEntryAiEligible,
  prepareFeedSource,
  scoreFeedCandidate,
  type PreparedFeedSource
} from "@/lib/feed-ingestion";
import { normalizeSourceUrl } from "@/lib/article-quality";
import { researchKeywords, type KeywordResearch } from "@/lib/trending-keywords";
import { FeedSource } from "@/models/FeedSource";

export async function GET(request: Request) {
  const authError = verifyCronRequest(request);
  if (authError) return authError;

  // Automated feed publishing was retired on 19 August 2026; the editorial
  // policy now states that every article is written by a person. This route
  // stays in the codebase but refuses to run unless it is deliberately switched
  // back on, so starting the cron worker cannot quietly contradict the policy.
  if (process.env.ENABLE_FEED_AUTOPUBLISH !== "true") {
    return NextResponse.json(
      { ok: false, skipped: "Automated feed publishing is disabled. Set ENABLE_FEED_AUTOPUBLISH=true to re-enable it." },
      { status: 503 }
    );
  }

  await connectDB();
  const sources = await FeedSource.find({ active: true }).select("_id name").lean<{ _id: { toString: () => string }; name: string }[]>();
  const preparedResults = await Promise.allSettled(sources.map((source) => prepareFeedSource(source._id.toString())));
  const preparedSources: PreparedFeedSource[] = [];
  const preparationErrors = new Map<string, string>();

  preparedResults.forEach((result, index) => {
    if (result.status === "fulfilled") preparedSources.push(result.value);
    else preparationErrors.set(
      sources[index]._id.toString(),
      result.reason instanceof Error ? result.reason.message : "Feed preparation failed"
    );
  });

  const aiBudget = await createPacedFeedAiBudget();
  const availableAtStart = aiBudget.remainingThisRun;
  const candidates = preparedSources.flatMap((source) => source.entries
    .filter((entry) => source.autoPublish && isFeedEntryAiEligible(entry, source.defaultCategory))
    .map((entry) => ({ source, entry, normalizedUrl: normalizeSourceUrl(entry.link) }))
  );
  const keywordResearchByUrl = new Map<string, KeywordResearch>();
  const priorityByUrl = new Map<string, number>();

  if (candidates.length && availableAtStart > 0) {
    // Warm the shared Google Trends cache before ranking the remaining candidates concurrently.
    const firstResearch = await researchKeywords(candidates[0].entry);
    keywordResearchByUrl.set(candidates[0].normalizedUrl, firstResearch);
    const remainingResearch = await Promise.all(candidates.slice(1).map(async (candidate) => ({
      candidate,
      research: await researchKeywords(candidate.entry)
    })));
    for (const { candidate, research } of remainingResearch) {
      keywordResearchByUrl.set(candidate.normalizedUrl, research);
    }
    for (const candidate of candidates) {
      const research = keywordResearchByUrl.get(candidate.normalizedUrl);
      if (research) priorityByUrl.set(
        candidate.normalizedUrl,
        scoreFeedCandidate(candidate.entry, candidate.source.defaultCategory, research)
      );
    }
  }

  preparedSources.sort((left, right) => {
    const best = (source: PreparedFeedSource) => Math.max(0, ...source.entries.map((entry) => priorityByUrl.get(normalizeSourceUrl(entry.link)) || 0));
    return best(right) - best(left);
  });

  const results = [];

  for (const source of preparedSources) {
    try {
      const result = await ingestPreparedFeedSource(source, {
        aiBudget,
        deferWithoutAi: true,
        keywordResearchByUrl,
        priorityByUrl
      });
      const createdPublished = result.created.filter((article) => article.status === "published").length;
      const updatedPublished = result.updated.filter((article) => article.status === "published").length;
      results.push({
        sourceId: source.sourceId,
        sourceName: source.name,
        total: result.total,
        created: result.created.length,
        updated: result.updated.length,
        rejected: result.rejected.length,
        published: createdPublished + updatedPublished,
        createdPublished,
        updatedPublished,
        drafts: result.created.filter((article) => article.status === "draft").length,
        skipped: result.skipped.length,
        aiSkipped: result.aiSkipped.length,
        deferred: result.deferred.length,
        rejectionReasons: [...new Set(result.rejected.map((item) => item.reason))].slice(0, 3)
      });
    } catch (error) {
      results.push({
        sourceId: source.sourceId,
        sourceName: source.name,
        error: error instanceof Error ? error.message : "Feed ingestion failed"
      });
    }
  }

  for (const source of sources) {
    const error = preparationErrors.get(source._id.toString());
    if (error) results.push({ sourceId: source._id.toString(), sourceName: source.name, error });
  }

  revalidatePath("/", "layout");
  revalidatePath("/sitemap.xml");
  revalidatePath("/news-sitemap.xml");
  revalidatePath("/rss.xml");

  return NextResponse.json({
    message: "Feed ingestion cron completed",
    sources: sources.length,
    aiBudget: {
      dailyLimit: aiBudget.dailyLimit,
      pacedAllowance: aiBudget.pacedAllowance,
      availableAtStart,
      attempted: aiBudget.attempted,
      remainingToday: aiBudget.remainingToday
    },
    results,
    ranAt: new Date().toISOString()
  });
}

