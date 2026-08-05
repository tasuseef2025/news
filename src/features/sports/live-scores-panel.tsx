"use client";

import Image from "next/image";
import { Activity, CalendarClock, Clock, ExternalLink, RefreshCw, Trophy } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { LiveScoreMatch, LiveScoresResponse, LiveScoreSport, MatchPhase } from "@/lib/live-scores";

type ScoreView = "all" | MatchPhase;

async function fetchScores(): Promise<LiveScoresResponse> {
  const response = await fetch("/api/live-scores", { cache: "no-store" });
  if (!response.ok) throw new Error("Unable to load live scores");
  return response.json();
}

function scoreText(match: LiveScoreMatch) {
  if (match.phase === "upcoming") return "VS";
  return `${match.homeScore ?? "-"} - ${match.awayScore ?? "-"}`;
}

function TeamLogo({ src, name }: { src?: string; name: string }) {
  if (!src) return <span className="grid h-9 w-9 place-items-center rounded-full bg-muted text-xs font-black">{name.charAt(0)}</span>;
  return <Image src={src} alt={`${name} logo`} width={36} height={36} className="h-9 w-9 rounded-full object-contain" />;
}

function matchTime(startsAt?: string) {
  if (!startsAt) return null;
  const date = new Date(startsAt);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function MatchCard({ match }: { match: LiveScoreMatch }) {
  const content = (
    <article className="grid h-full gap-3 rounded-md border bg-background p-4 transition-colors hover:border-primary/50">
      <div className="flex items-center justify-between gap-3 text-xs font-bold uppercase text-muted-foreground">
        <span className="truncate">{match.league || match.country || match.provider}</span>
        <span className={cn("flex shrink-0 items-center gap-1", match.phase === "live" ? "text-red-600" : "text-primary")}>
          {match.phase === "live" ? <Activity className="h-3.5 w-3.5 animate-pulse" /> : <CalendarClock className="h-3.5 w-3.5" />}
          {match.minute ? `${match.minute}'` : match.statusShort || match.status}
        </span>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
        <div className="grid min-w-0 justify-items-start gap-2">
          <TeamLogo src={match.homeLogo} name={match.homeTeam} />
          <span className="max-w-full truncate text-sm font-black">{match.homeTeam}</span>
        </div>
        <div className="min-w-16 rounded-md bg-muted px-3 py-2 text-center text-lg font-black tabular-nums">{scoreText(match)}</div>
        <div className="grid min-w-0 justify-items-end gap-2 text-right">
          <TeamLogo src={match.awayLogo} name={match.awayTeam} />
          <span className="max-w-full truncate text-sm font-black">{match.awayTeam}</span>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{match.note || match.venue || matchTime(match.startsAt) || match.provider}</span>
        {match.matchUrl ? <ExternalLink className="h-3.5 w-3.5 shrink-0" /> : null}
      </div>
    </article>
  );

  return match.matchUrl ? <a href={match.matchUrl} target="_blank" rel="noopener noreferrer" className="block h-full">{content}</a> : content;
}

export function LiveScoresPanel({ compact = false }: { compact?: boolean }) {
  const [sport, setSport] = useState<LiveScoreSport>("football");
  const [view, setView] = useState<ScoreView>("all");
  const { data, error, isFetching, refetch } = useQuery({
    queryKey: ["live-scores"],
    queryFn: fetchScores,
    refetchInterval: 60000,
    staleTime: 45000
  });

  const matches = sport === "football" ? data?.football || [] : data?.cricket || [];
  const counts = useMemo(() => ({
    live: matches.filter((match) => match.phase === "live").length,
    upcoming: matches.filter((match) => match.phase === "upcoming").length,
    finished: matches.filter((match) => match.phase === "finished").length
  }), [matches]);
const orderedMatches = useMemo(() => [...matches].sort((left, right) => {
    const priority: Record<MatchPhase, number> = { live: 0, upcoming: 1, other: 2, finished: 3 };
    const phaseDifference = priority[left.phase] - priority[right.phase];
    if (phaseDifference) return phaseDifference;
    const leftTime = left.startsAt ? new Date(left.startsAt).getTime() : 0;
    const rightTime = right.startsAt ? new Date(right.startsAt).getTime() : 0;
    return left.phase === "finished" ? rightTime - leftTime : leftTime - rightTime;
  }), [matches]);
  const visibleMatches = (view === "all" ? orderedMatches : orderedMatches.filter((match) => match.phase === view)).slice(0, compact ? 4 : 30);

  return (
    <section className={cn("rounded-lg border bg-card p-5", !compact && "md:p-6")}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2 text-sm font-black uppercase text-primary"><Trophy className="h-5 w-5" /> Match Centre</div>
          <h2 className="text-2xl font-black">Football and Cricket</h2>
        </div>
        <div className="flex items-center gap-2">
          {(["football", "cricket"] as LiveScoreSport[]).map((item) => (
            <Button key={item} type="button" variant={sport === item ? "default" : "outline"} size="sm" onClick={() => { setSport(item); setView("all"); }} className="capitalize">{item}</Button>
          ))}
          <Button type="button" variant="ghost" size="icon" aria-label="Refresh scores" title="Refresh scores" onClick={() => refetch()}><RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} /></Button>
        </div>
      </div>

      <div className="mb-4 flex gap-1 overflow-x-auto border-b" role="tablist" aria-label="Match status">
        {(["all", "live", "upcoming", "finished"] as ScoreView[]).map((item) => {
          const label = item === "finished" ? "Results" : item.charAt(0).toUpperCase() + item.slice(1);
          const count = item === "all" ? matches.length : counts[item as keyof typeof counts] || 0;
          return <button key={item} type="button" role="tab" aria-selected={view === item} onClick={() => setView(item)} className={cn("shrink-0 border-b-2 px-3 py-2 text-sm font-bold transition-colors", view === item ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}>{label} <span className="tabular-nums">{count}</span></button>;
        })}
      </div>

      <div className={cn("grid gap-3", !compact && "md:grid-cols-2 xl:grid-cols-3")}>
        {visibleMatches.map((match) => <MatchCard key={`${match.sport}-${match.id}`} match={match} />)}
      </div>

      {!visibleMatches.length ? <div className="rounded-md border border-dashed bg-muted/50 p-5 text-sm leading-6 text-muted-foreground">{error ? "Scores could not be loaded right now." : `No ${view === "all" ? "recent" : view} ${sport} matches are available right now.`}</div> : null}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-muted-foreground">
        <span className="flex items-center gap-2"><Clock className="h-4 w-4" /> Updates every 60 seconds{data?.updatedAt ? ` - Checked ${new Date(data.updatedAt).toLocaleTimeString()}` : ""}</span>
        <span>Powered by <a href="https://sportscore.com/" target="_blank" rel="noopener" className="font-black text-foreground underline">SportScore</a></span>
      </div>
    </section>
  );
}
