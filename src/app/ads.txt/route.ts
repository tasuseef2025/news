import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  const publisherId = process.env.GOOGLE_ADSENSE_PUBLISHER_ID || "";
  const body = publisherId
    ? `google.com, ${publisherId}, DIRECT, f08c47fec0942fa0\n`
    : "# Add GOOGLE_ADSENSE_PUBLISHER_ID=pub-xxxxxxxxxxxxxxxx in environment variables after AdSense provides your publisher ID.\n";

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "s-maxage=3600, stale-while-revalidate=86400"
    }
  });
}
