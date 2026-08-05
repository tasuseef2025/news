export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getMatchDetail, type LiveScoreSport } from "@/lib/live-scores";

type Context = {
  params: Promise<{ sport: string; slug: string }>;
};

const cacheHeaders = { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" };

export async function GET(_request: Request, { params }: Context) {
  const { sport, slug } = await params;
  if (sport !== "football" && sport !== "cricket") {
    return NextResponse.json({ message: "Unsupported sport" }, { status: 400 });
  }

  try {
    const details = await getMatchDetail(sport as LiveScoreSport, slug);
    return NextResponse.json(details, { headers: cacheHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load match";
    return NextResponse.json({ message }, { status: message === "Match not found" ? 404 : 502 });
  }
}
