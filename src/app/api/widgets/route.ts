import { NextResponse } from "next/server";
import { getWidgets } from "@/lib/interactive-widgets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const location = searchParams.get("location") || undefined;
  const widgets = await getWidgets({ location });
  return NextResponse.json(widgets, {
    headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=600" }
  });
}
