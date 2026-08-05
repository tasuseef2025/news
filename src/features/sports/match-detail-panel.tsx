"use client";

import Image from "next/image";
import Link from "next/link";
import { Activity, ArrowLeft, ArrowRightLeft, CalendarDays, CircleDot, Clock3, RefreshCw, Shield, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { LiveScoreSport, MatchDetailResponse, MatchIncident, MatchPlayer } from "@/lib/live-scores";

type DetailTab = "overview" | "timeline" | "lineups" | "stats";

async function fetchMatch(sport: LiveScoreSport, slug: string): Promise<MatchDetailResponse> {
  const response = await fetch(`/api/live-scores/${sport}/${slug}`, { cache: "no-store" });
  if (!response.ok) throw new Error("Unable to update this match");
  return response.json();
}

function TeamLogo({ src, name }: { src?: string; name: string }) {
  if (!src) return <span className="grid h-16 w-16 place-items-center rounded-full bg-muted text-xl font-black">{name.charAt(0)}</span>;
  return <Image src={src} alt={`${name} logo`} width={64} height={64} priority className="h-16 w-16 rounded-full object-contain" />;
}

function displayDate(value?: string) {
  if (!value) return "Time to be confirmed";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, { dateStyle: "full", timeStyle: "short" }).format(date);
}

function IncidentIcon({ incident }: { incident: MatchIncident }) {
  if (/goal/i.test(incident.type)) return <CircleDot className="h-4 w-4 text-green-600" />;
  if (/substitution/i.test(incident.type)) return <ArrowRightLeft className="h-4 w-4 text-blue-600" />;
  return <span className={cn("h-3.5 w-2.5 rounded-sm", /red/i.test(incident.type) ? "bg-red-600" : /yellow/i.test(incident.type) ? "bg-yellow-400" : "bg-muted-foreground")} />;
}

function PlayerList({ title, players }: { title: string; players: MatchPlayer[] }) {
  if (!players.length) return null;
  return (
    <div>
      <h3 className="mb-3 text-sm font-black uppercase text-muted-foreground">{title}</h3>
      <div className="divide-y border-y">
        {players.map((player, index) => (
          <div key={`${player.name}-${player.number ?? index}`} className="grid grid-cols-[2rem_1fr_auto] items-center gap-2 py-2 text-sm">
            <span className="tabular-nums text-muted-foreground">{player.number || "-"}</span>
            <span className="font-bold">{player.name}{player.captain ? " (C)" : ""}</span>
            <span className="text-xs font-semibold text-muted-foreground">{player.position || ""}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MatchDetailPanel({ sport, slug, initialData }: { sport: LiveScoreSport; slug: string; initialData: MatchDetailResponse }) {
  const [tab, setTab] = useState<DetailTab>("overview");
  const { data, isFetching, refetch } = useQuery({
    queryKey: ["match-detail", sport, slug],
    queryFn: () => fetchMatch(sport, slug),
    initialData,
    refetchInterval: 60000,
    staleTime: 45000
  });
  const match = data.match;
  const score = match.phase === "upcoming" ? "VS" : `${match.homeScore ?? "-"} - ${match.awayScore ?? "-"}`;
  const availableTabs: Array<{ id: DetailTab; label: string; count?: number }> = [
    { id: "overview", label: "Overview" },
    { id: "timeline", label: "Timeline", count: match.incidents.length },
    { id: "lineups", label: "Lineups", count: match.lineups ? match.lineups.homeXi.length + match.lineups.awayXi.length : 0 },
    { id: "stats", label: "Statistics", count: match.stats.length }
  ];

  return (
    <div>
      <Link href="/live-scores" className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to match centre
      </Link>

      <section className="rounded-md border bg-card p-5 md:p-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 text-sm">
          <div className="flex min-w-0 items-center gap-2 font-bold text-muted-foreground">
            {match.competitionLogo ? <Image src={match.competitionLogo} alt="" width={28} height={28} className="h-7 w-7 object-contain" /> : <Shield className="h-5 w-5" />}
            <span className="truncate">{match.league || "Competition"}</span>
          </div>
          <span className={cn("inline-flex items-center gap-2 font-black uppercase", match.phase === "live" ? "text-red-600" : "text-primary")}>
            {match.phase === "live" ? <Activity className="h-4 w-4 animate-pulse" /> : <Clock3 className="h-4 w-4" />}
            {match.minute ? `${match.minute}'` : match.status}
          </span>
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 md:gap-8">
          <div className="grid min-w-0 justify-items-center gap-3 text-center">
            <TeamLogo src={match.homeLogo} name={match.homeTeam} />
            <h1 className="text-base font-black md:text-xl">{match.homeTeam}</h1>
          </div>
          <div className="min-w-20 text-center text-2xl font-black tabular-nums md:min-w-36 md:text-5xl">{score}</div>
          <div className="grid min-w-0 justify-items-center gap-3 text-center">
            <TeamLogo src={match.awayLogo} name={match.awayTeam} />
            <h2 className="text-base font-black md:text-xl">{match.awayTeam}</h2>
          </div>
        </div>
        <p className="mt-6 text-center text-sm font-semibold text-muted-foreground">{displayDate(match.startsAt)}</p>
      </section>

      <div className="mt-6 flex items-center justify-between gap-3 border-b">
        <div className="flex min-w-0 gap-1 overflow-x-auto" role="tablist" aria-label="Match details">
          {availableTabs.map((item) => (
            <button key={item.id} type="button" role="tab" aria-selected={tab === item.id} onClick={() => setTab(item.id)} className={cn("shrink-0 border-b-2 px-3 py-3 text-sm font-bold", tab === item.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}>
              {item.label}{item.count ? ` ${item.count}` : ""}
            </button>
          ))}
        </div>
        <Button type="button" size="icon" variant="ghost" title="Refresh match" aria-label="Refresh match" onClick={() => refetch()}>
          <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
        </Button>
      </div>

      {tab === "overview" ? (
        <section className="grid gap-0 border-b md:grid-cols-3">
          <div className="border-b py-5 md:border-b-0 md:border-r md:px-5"><p className="text-xs font-black uppercase text-muted-foreground">Match status</p><p className="mt-2 font-black">{match.status}</p></div>
          <div className="border-b py-5 md:border-b-0 md:border-r md:px-5"><p className="text-xs font-black uppercase text-muted-foreground">Kickoff</p><p className="mt-2 font-black">{displayDate(match.startsAt)}</p></div>
          <div className="py-5 md:px-5"><p className="text-xs font-black uppercase text-muted-foreground">Half-time</p><p className="mt-2 font-black">{match.homeHalfTimeScore !== undefined ? `${match.homeHalfTimeScore} - ${match.awayHalfTimeScore ?? "-"}` : "Not available"}</p></div>
        </section>
      ) : null}

      {tab === "timeline" ? (
        <section className="py-6">
          <h2 className="mb-4 text-2xl font-black">Match Timeline</h2>
          {match.incidents.length ? <div className="divide-y border-y">{match.incidents.map((incident, index) => (
            <div key={`${incident.time}-${incident.type}-${index}`} className="grid grid-cols-[3rem_1.25rem_1fr_auto] items-center gap-3 py-3 text-sm">
              <span className="font-black tabular-nums">{incident.time ? `${incident.time}'` : "-"}</span>
              <IncidentIcon incident={incident} />
              <div><p className="font-bold">{incident.player || incident.playerIn || incident.type}</p>{incident.playerOut ? <p className="text-xs text-muted-foreground">Replaced {incident.playerOut}</p> : null}</div>
              <span className="text-xs font-black uppercase text-muted-foreground">{incident.side || ""}</span>
            </div>
          ))}</div> : <p className="border-y py-5 text-sm text-muted-foreground">Timeline information is not available for this match yet.</p>}
        </section>
      ) : null}

      {tab === "lineups" ? (
        <section className="py-6">
          <div className="mb-5 flex items-center gap-2"><Users className="h-5 w-5 text-primary" /><h2 className="text-2xl font-black">Team Lineups</h2></div>
          {match.lineups ? <div className="grid gap-8 md:grid-cols-2">
            <div className="grid gap-6"><div><h3 className="text-xl font-black">{match.homeTeam}</h3><p className="text-sm text-muted-foreground">{match.lineups.homeFormation || "Formation unavailable"}</p></div><PlayerList title="Starting XI" players={match.lineups.homeXi} /><PlayerList title="Substitutes" players={match.lineups.homeSubs} /></div>
            <div className="grid gap-6"><div><h3 className="text-xl font-black">{match.awayTeam}</h3><p className="text-sm text-muted-foreground">{match.lineups.awayFormation || "Formation unavailable"}</p></div><PlayerList title="Starting XI" players={match.lineups.awayXi} /><PlayerList title="Substitutes" players={match.lineups.awaySubs} /></div>
          </div> : <p className="border-y py-5 text-sm text-muted-foreground">Lineups have not been provided for this match.</p>}
        </section>
      ) : null}

      {tab === "stats" ? (
        <section className="py-6">
          <h2 className="mb-4 text-2xl font-black">Match Statistics</h2>
          {match.stats.length ? <div className="divide-y border-y">{match.stats.map((stat, index) => (
            <div key={`${stat.label}-${index}`} className="grid grid-cols-[1fr_2fr_1fr] gap-3 py-3 text-center text-sm"><span className="font-black tabular-nums">{stat.home ?? "-"}</span><span className="text-muted-foreground">{stat.label}</span><span className="font-black tabular-nums">{stat.away ?? "-"}</span></div>
          ))}</div> : <p className="border-y py-5 text-sm text-muted-foreground">Detailed statistics are not available for this match yet.</p>}
        </section>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-2"><CalendarDays className="h-4 w-4" /> Updated {new Date(data.updatedAt).toLocaleTimeString()}</span>
        <span>Data from <a href="https://sportscore.com/" target="_blank" rel="dofollow noopener" className="font-black text-foreground underline">SportScore</a></span>
      </div>
    </div>
  );
}
