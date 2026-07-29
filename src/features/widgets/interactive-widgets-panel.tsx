"use client";

import { Activity, CloudSun, DollarSign, LineChart, RefreshCw, Search, Trophy } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LiveScoresPanel } from "@/features/sports/live-scores-panel";
import type { WidgetsResponse } from "@/lib/interactive-widgets";
import { cn } from "@/lib/utils";

async function fetchWidgets(location: string): Promise<WidgetsResponse> {
  const query = location ? `?location=${encodeURIComponent(location)}` : "";
  const response = await fetch(`/api/widgets${query}`, { cache: "no-store" });
  if (!response.ok) throw new Error("Unable to load widgets");
  return response.json();
}

function numberText(value?: number, digits = 2) {
  if (value === undefined || Number.isNaN(value)) return "-";
  return value.toLocaleString(undefined, { maximumFractionDigits: digits });
}

export function InteractiveWidgetsPanel({ initialLocation = "" }: { initialLocation?: string }) {
  const router = useRouter();
  const [location, setLocation] = useState(initialLocation);
  const { data, isFetching, error, refetch } = useQuery({
    queryKey: ["interactive-widgets", location],
    queryFn: () => fetchWidgets(location),
    refetchInterval: 300000
  });

  function submitLocation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = location.trim();
    router.push(trimmed ? `/interactive-widgets?location=${encodeURIComponent(trimmed)}` : "/interactive-widgets");
    refetch();
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-lg border bg-card p-5 md:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="mb-1 flex items-center gap-2 text-sm font-black uppercase text-primary">
              <Activity className="h-5 w-5" />
              Interactive Desk
            </div>
            <h2 className="text-2xl font-black">Markets, Weather and Currency</h2>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
            <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
            Refresh
          </Button>
        </div>

        <form onSubmit={submitLocation} className="mb-4 flex flex-col gap-2 sm:flex-row">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-md border bg-background px-3">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Input
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder="Search city or country weather, e.g. London, Dubai, Lahore"
              className="border-0 px-0 focus:ring-0"
            />
          </div>
          <Button type="submit">Show Weather</Button>
        </form>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-md border bg-background p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-black uppercase text-primary">
              <CloudSun className="h-5 w-5" />
              Weather
            </div>
            {data?.weather ? (
              <div className="grid gap-1">
                <p className="text-xl font-black">{data.weather.location}</p>
                <p className="text-3xl font-black">{numberText(data.weather.temperatureC, 0)}°C</p>
                <p className="text-sm font-semibold text-muted-foreground">{data.weather.condition} - Wind {numberText(data.weather.windKph, 0)} km/h</p>
              </div>
            ) : (
              <p className="text-sm leading-6 text-muted-foreground">Weather is loading or unavailable right now.</p>
            )}
          </div>

          <div className="rounded-md border bg-background p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-black uppercase text-primary">
              <DollarSign className="h-5 w-5" />
              Currency Rates
            </div>
            {data?.currencies.length ? (
              <div className="grid grid-cols-2 gap-2">
                {data.currencies.slice(0, 6).map((rate) => (
                  <div key={rate.pair} className="rounded-md bg-muted px-3 py-2">
                    <p className="text-xs font-black uppercase text-muted-foreground">{rate.pair}</p>
                    <p className="text-lg font-black">{numberText(rate.rate, 4)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm leading-6 text-muted-foreground">Currency rates are unavailable right now.</p>
            )}
          </div>

          <div className="rounded-md border bg-background p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-black uppercase text-primary">
              <LineChart className="h-5 w-5" />
              Market Watch
            </div>
            {data?.markets.length ? (
              <div className="grid gap-2">
                {data.markets.slice(0, 5).map((quote) => (
                  <div key={quote.symbol} className="flex items-center justify-between gap-3 rounded-md bg-muted px-3 py-2">
                    <div className="min-w-0">
                      <p className="font-black">{quote.symbol}</p>
                      <p className="truncate text-xs font-semibold text-muted-foreground">{quote.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black">{quote.currency ? `${quote.currency} ` : ""}{numberText(quote.price)}</p>
                      <p className={cn("text-xs font-black", (quote.changePercent || 0) >= 0 ? "text-emerald-600" : "text-primary")}>{numberText(quote.changePercent)}%</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm leading-6 text-muted-foreground">Market data is unavailable right now.</p>
            )}
          </div>
        </div>

        {error || data?.errors.length ? (
          <p className="mt-4 text-xs font-semibold text-muted-foreground">Some widgets may be temporarily unavailable. The page keeps working and refreshes automatically.</p>
        ) : null}
      </section>

      <section>
        <div className="mb-4 flex items-center gap-2 text-sm font-black uppercase text-primary">
          <Trophy className="h-5 w-5" />
          Live Sports
        </div>
        <LiveScoresPanel />
      </section>
    </div>
  );
}
