import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function publisherId() {
  const value = process.env.GOOGLE_ADSENSE_PUBLISHER_ID || process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT || "";
  return value.replace(/^ca-/, "").trim();
}

export function GET() {
  const id = publisherId();
  const body = id
    ? `google.com, ${id}, DIRECT, f08c47fec0942fa0\n`
    : "# Add GOOGLE_ADSENSE_PUBLISHER_ID=pub-xxxxxxxxxxxxxxxx in environment variables after AdSense provides your publisher ID.\n";

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "s-maxage=3600, stale-while-revalidate=86400"
    }
  });
}
