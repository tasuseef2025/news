export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getLiveScores } from "@/lib/live-scores";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sport = searchParams.get("sport");
  const scores = await getLiveScores();

  if (sport === "football") {
    return NextResponse.json({ matches: scores.football, configured: scores.configured.football, errors: scores.errors, updatedAt: scores.updatedAt });
  }

  if (sport === "cricket") {
    return NextResponse.json({ matches: scores.cricket, configured: scores.configured.cricket, errors: scores.errors, updatedAt: scores.updatedAt });
  }

  return NextResponse.json(scores, {
    headers: {
      "Cache-Control": "s-maxage=15, stale-while-revalidate=30"
    }
  });
}
