"use client";

import Image from "next/image";
import { Activity, Clock, RefreshCw, Trophy } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { LiveScoreMatch, LiveScoresResponse, LiveScoreSport } from "@/lib/live-scores";

async function fetchScores(): Promise<LiveScoresResponse> {
  const response = await fetch("/api/live-scores", { cache: "no-store" });
  if (!response.ok) throw new Error("Unable to load live scores");
  return response.json();
}

function scoreText(match: LiveScoreMatch) {
  const home = match.homeScore ?? "-";
  const away = match.awayScore ?? "-";
  return `${home} - ${away}`;
}

function TeamLogo({ src, name }: { src?: string; name: string }) {
  if (!src) {
    return <span className="grid h-8 w-8 place-items-center rounded-full bg-muted text-xs font-black">{name.charAt(0)}</span>;
  }

  return <Image src={src} alt={name} width={32} height={32} className="h-8 w-8 rounded-full object-contain" />;
}

function MatchCard({ match }: { match: LiveScoreMatch }) {
  return (
    <article className="grid gap-3 rounded-md border bg-background p-4">
      <div className="flex items-center justify-between gap-3 text-xs font-bold uppercase text-muted-foreground">
        <span className="truncate">{match.league || match.country || match.provider}</span>
        <span className="flex shrink-0 items-center gap-1 text-primary">
          <Activity className="h-3.5 w-3.5" />
          {match.minute ? `${match.minute}'` : match.statusShort || match.status}
        </span>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="grid min-w-0 justify-items-start gap-2">
          <TeamLogo src={match.homeLogo} name={match.homeTeam} />
          <span className="max-w-full truncate text-sm font-black">{match.homeTeam}</span>
        </div>
        <div className="rounded-md bg-card px-3 py-2 text-center text-xl font-black tabular-nums text-foreground">
          {scoreText(match)}
        </div>
        <div className="grid min-w-0 justify-items-end gap-2 text-right">
          <TeamLogo src={match.awayLogo} name={match.awayTeam} />
          <span className="max-w-full truncate text-sm font-black">{match.awayTeam}</span>
        </div>
      </div>
      {match.note || match.venue ? <p className="text-xs leading-5 text-muted-foreground">{match.note || match.venue}</p> : null}
    </article>
  );
}

export function LiveScoresPanel({ compact = false }: { compact?: boolean }) {
  const [sport, setSport] = useState<LiveScoreSport>("football");
  const { data, error, isFetching, refetch } = useQuery({
    queryKey: ["live-scores"],
    queryFn: fetchScores,
    refetchInterval: 30000
  });

  const matches = sport === "football" ? data?.football || [] : data?.cricket || [];
  const configured = sport === "football" ? data?.configured.football : data?.configured.cricket;

  return (
    <section className={cn("rounded-lg border bg-card p-5", !compact && "md:p-6")}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2 text-sm font-black uppercase text-primary">
            <Trophy className="h-5 w-5" />
            Live Scores
          </div>
          <h2 className="text-2xl font-black">Football and Cricket</h2>
        </div>
        <div className="flex items-center gap-2">
          {(["football", "cricket"] as LiveScoreSport[]).map((item) => (
            <Button
              key={item}
              type="button"
              variant={sport === item ? "default" : "outline"}
              size="sm"
              onClick={() => setSport(item)}
              className="capitalize"
            >
              {item}
            </Button>
          ))}
          <Button type="button" variant="ghost" size="icon" aria-label="Refresh scores" onClick={() => refetch()}>
            <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
          </Button>
        </div>
      </div>

      <div className={cn("grid gap-3", compact ? "" : "md:grid-cols-2 xl:grid-cols-3")}>
        {matches.map((match) => (
          <MatchCard key={`${match.sport}-${match.id}`} match={match} />
        ))}
      </div>

      {!matches.length ? (
        <div className="rounded-md border border-dashed bg-muted/50 p-5 text-sm leading-6 text-muted-foreground">
          {configured === false
            ? `Add ${sport === "football" ? "API_FOOTBALL_KEY" : "API_CRICKET_KEY"} in environment variables to show real ${sport} live scores.`
            : error
              ? "Live scores could not be loaded right now."
              : `No live ${sport} matches are available from the provider right now.`}
        </div>
      ) : null}

      <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
        <Clock className="h-4 w-4" />
        Auto-refreshes every 30 seconds{data?.updatedAt ? ` - Last checked ${new Date(data.updatedAt).toLocaleTimeString()}` : ""}
      </div>
    </section>
  );
}
