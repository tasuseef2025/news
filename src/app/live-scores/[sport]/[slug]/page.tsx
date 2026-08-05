import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MatchDetailPanel } from "@/features/sports/match-detail-panel";
import { getMatchDetail, type LiveScoreSport } from "@/lib/live-scores";
import { absoluteUrl } from "@/lib/utils";
import { siteConfig } from "@/lib/site";

type Props = {
  params: Promise<{ sport: string; slug: string }>;
};

function validSport(value: string): value is LiveScoreSport {
  return value === "football" || value === "cricket";
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { sport, slug } = await params;
  if (!validSport(sport)) return {};

  try {
    const { match } = await getMatchDetail(sport, slug);
    const title = `${match.homeTeam} vs ${match.awayTeam}: Live Score and Match Details`;
    const description = `Follow ${match.homeTeam} vs ${match.awayTeam} with the latest score, match status, timeline, lineups and statistics on Novexa News.`;
    const canonical = absoluteUrl(`/live-scores/${sport}/${slug}`);
    return {
      title,
      description,
      alternates: { canonical },
      openGraph: {
        title: `${title} | ${siteConfig.name}`,
        description,
        url: canonical,
        siteName: siteConfig.name,
        type: "website",
        images: [{ url: absoluteUrl(`/api/og?title=${encodeURIComponent(`${match.homeTeam} vs ${match.awayTeam}`)}&category=Live%20Scores`), width: 1200, height: 630, alt: `${match.homeTeam} vs ${match.awayTeam}` }]
      },
      twitter: { card: "summary_large_image", title, description }
    };
  } catch {
    return { title: "Match Details", robots: { index: false, follow: true } };
  }
}

export default async function MatchDetailsPage({ params }: Props) {
  const { sport, slug } = await params;
  if (!validSport(sport)) notFound();

  const details = await getMatchDetail(sport, slug).catch(() => null);
  if (!details) notFound();

  const { match } = details;
  const eventStatus = match.phase === "finished"
    ? "https://schema.org/EventCompleted"
    : match.phase === "live"
      ? "https://schema.org/EventInProgress"
      : "https://schema.org/EventScheduled";
  const schema = {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: `${match.homeTeam} vs ${match.awayTeam}`,
    startDate: match.startsAt,
    eventStatus,
    sport: sport === "football" ? "Football" : "Cricket",
    url: absoluteUrl(`/live-scores/${sport}/${slug}`),
    homeTeam: { "@type": "SportsTeam", name: match.homeTeam },
    awayTeam: { "@type": "SportsTeam", name: match.awayTeam },
    organizer: { "@type": "Organization", name: match.league || "SportScore" }
  };

  return (
    <main className="container max-w-5xl py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <MatchDetailPanel sport={sport} slug={slug} initialData={details} />
    </main>
  );
}
