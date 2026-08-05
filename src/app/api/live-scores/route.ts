export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getLiveScores } from "@/lib/live-scores";

const cacheHeaders = { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" };

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sport = searchParams.get("sport");
  const scores = await getLiveScores();

  if (sport === "football") {
    return NextResponse.json({ matches: scores.football, configured: scores.configured.football, provider: scores.provider, errors: scores.errors, updatedAt: scores.updatedAt }, { headers: cacheHeaders });
  }

  if (sport === "cricket") {
    return NextResponse.json({ matches: scores.cricket, configured: scores.configured.cricket, provider: scores.provider, errors: scores.errors, updatedAt: scores.updatedAt }, { headers: cacheHeaders });
  }

  return NextResponse.json(scores, {
    headers: {
      ...cacheHeaders
    }
  });
}
