import type { Metadata } from "next";
import { LiveScoresPanel } from "@/features/sports/live-scores-panel";
import { absoluteUrl } from "@/lib/utils";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Live Football and Cricket Scores",
  description: "Follow live football and cricket scores, match status, teams, competitions and updates on Novexa News.",
  alternates: { canonical: absoluteUrl("/live-scores") },
  openGraph: {
    title: `Live Football and Cricket Scores | ${siteConfig.name}`,
    description: "Follow live football and cricket score updates on Novexa News.",
    url: absoluteUrl("/live-scores"),
    siteName: siteConfig.name,
    type: "website",
    images: [{ url: absoluteUrl("/api/og?title=Live%20Scores&category=Sports"), width: 1200, height: 630, alt: "Live Scores" }]
  },
  twitter: {
    card: "summary_large_image",
    title: `Live Football and Cricket Scores | ${siteConfig.name}`,
    description: "Follow live football and cricket score updates on Novexa News.",
    images: [absoluteUrl("/api/og?title=Live%20Scores&category=Sports")]
  }
};

export default function LiveScoresPage() {
  return (
    <main className="container py-8">
      <div className="mb-8 border-b pb-5">
        <p className="text-sm font-bold uppercase text-primary">Sports</p>
        <h1 className="text-4xl font-black">Live Scores</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Real-time football and cricket match scores from configured sports data providers.
        </p>
      </div>
      <LiveScoresPanel />
    </main>
  );
}
