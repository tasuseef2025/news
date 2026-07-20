"use client";

import { Loader2, Plus, RefreshCw, Rss, Save } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { categories } from "@/lib/categories";

type FeedSource = {
  _id: string;
  name: string;
  url: string;
  defaultCategory: string;
  active: boolean;
  autoPublish: boolean;
  lastFetchedAt?: string;
  createdAt?: string;
};

type FeedResponse = {
  sources: FeedSource[];
  total: number;
};

type FeedForm = {
  name: string;
  url: string;
  defaultCategory: string;
  active: boolean;
  autoPublish: boolean;
};

const initialForm: FeedForm = {
  name: "",
  url: "",
  defaultCategory: "Breaking News",
  active: true,
  autoPublish: true
};

async function fetchFeedSources(): Promise<FeedResponse> {
  const response = await fetch("/api/feed-sources?limit=100", { cache: "no-store" });
  if (!response.ok) throw new Error("Unable to load feed sources");
  return response.json();
}

async function createFeedSource(payload: FeedForm) {
  const response = await fetch("/api/feed-sources", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error((await response.json()).message || "Unable to create feed source");
  return response.json();
}

async function updateFeedSource(payload: Partial<FeedSource> & { _id: string }) {
  const response = await fetch("/api/feed-sources", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error((await response.json()).message || "Unable to update feed source");
  return response.json();
}

async function ingestFeeds() {
  const response = await fetch("/api/feeds/ingest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({})
  });
  if (!response.ok) throw new Error((await response.json()).message || "Unable to ingest feeds");
  return response.json();
}

export function FeedSourcesManager() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FeedForm>(initialForm);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const { data, isLoading } = useQuery({ queryKey: ["feed-sources"], queryFn: fetchFeedSources });

  const createMutation = useMutation({
    mutationFn: createFeedSource,
    onSuccess: async () => {
      setForm(initialForm);
      setError("");
      setMessage("Feed source added successfully.");
      await queryClient.invalidateQueries({ queryKey: ["feed-sources"] });
    },
    onError: (err) => {
      setMessage("");
      setError(err instanceof Error ? err.message : "Unable to add feed source.");
    }
  });

  const updateMutation = useMutation({
    mutationFn: updateFeedSource,
    onSuccess: async () => {
      setError("");
      setMessage("Feed source updated.");
      await queryClient.invalidateQueries({ queryKey: ["feed-sources"] });
    },
    onError: (err) => {
      setMessage("");
      setError(err instanceof Error ? err.message : "Unable to update feed source.");
    }
  });

  const ingestMutation = useMutation({
    mutationFn: ingestFeeds,
    onSuccess: async (result) => {
      const created = result.results?.reduce((sum: number, item: { created?: unknown[] }) => sum + (item.created?.length || 0), 0) || 0;
      setError("");
      setMessage(`Feed import completed. Created ${created} articles.`);
      await queryClient.invalidateQueries({ queryKey: ["feed-sources"] });
    },
    onError: (err) => {
      setMessage("");
      setError(err instanceof Error ? err.message : "Unable to run feed import.");
    }
  });

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    createMutation.mutate(form);
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-lg border bg-card p-5 shadow-sm">
        <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <p className="text-sm font-black uppercase text-primary">RSS Automation</p>
            <h2 className="text-2xl font-black">Add Feed Source</h2>
            <p className="mt-1 text-sm text-muted-foreground">Add RSS or Atom URLs. Active feeds are imported by your cron job every 10 minutes.</p>
          </div>
          <Button type="button" onClick={() => ingestMutation.mutate()} disabled={ingestMutation.isPending}>
            {ingestMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Run Import Now
          </Button>
        </div>

        <form onSubmit={submit} className="grid gap-4 lg:grid-cols-[1fr_1.5fr_220px_auto] lg:items-end">
          <label className="grid gap-2 text-sm font-semibold">
            Source Name
            <Input value={form.name} onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))} placeholder="BBC World" required />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            RSS / Atom URL
            <Input value={form.url} onChange={(event) => setForm((value) => ({ ...value, url: event.target.value }))} placeholder="https://example.com/rss.xml" required />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Default Category
            <select value={form.defaultCategory} onChange={(event) => setForm((value) => ({ ...value, defaultCategory: event.target.value }))} className="h-10 rounded-md border bg-background px-3 text-sm">
              {categories.map((category) => <option key={category}>{category}</option>)}
            </select>
          </label>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add
          </Button>
          <label className="flex items-center gap-2 text-sm font-bold">
            <input type="checkbox" checked={form.active} onChange={(event) => setForm((value) => ({ ...value, active: event.target.checked }))} /> Active
          </label>
          <label className="flex items-center gap-2 text-sm font-bold">
            <input type="checkbox" checked={form.autoPublish} onChange={(event) => setForm((value) => ({ ...value, autoPublish: event.target.checked }))} /> Auto publish
          </label>
        </form>

        {message ? <p className="mt-4 rounded-md bg-emerald-500/10 p-3 text-sm font-semibold text-emerald-700 dark:text-emerald-300">{message}</p> : null}
        {error ? <p className="mt-4 rounded-md bg-primary/10 p-3 text-sm font-semibold text-primary">{error}</p> : null}
      </section>

      <section className="rounded-lg border bg-card p-5 shadow-sm">
        <div className="mb-5 flex items-center gap-2">
          <Rss className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-black">Feed Sources</h2>
        </div>
        {isLoading ? <p className="text-sm text-muted-foreground">Loading feed sources...</p> : null}
        <div className="grid gap-3">
          {data?.sources.map((source) => (
            <article key={source._id} className="grid gap-3 rounded-md border bg-background p-4 lg:grid-cols-[1fr_auto] lg:items-center">
              <div className="min-w-0">
                <h3 className="font-black">{source.name}</h3>
                <p className="truncate text-sm text-muted-foreground">{source.url}</p>
                <p className="mt-1 text-xs font-semibold text-muted-foreground">Category: {source.defaultCategory} {source.lastFetchedAt ? `- Last fetched ${new Date(source.lastFetchedAt).toLocaleString()}` : ""}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant={source.active ? "default" : "outline"} size="sm" onClick={() => updateMutation.mutate({ _id: source._id, active: !source.active })}>
                  {source.active ? "Active" : "Paused"}
                </Button>
                <Button type="button" variant={source.autoPublish ? "default" : "outline"} size="sm" onClick={() => updateMutation.mutate({ _id: source._id, autoPublish: !source.autoPublish })}>
                  <Save className="h-4 w-4" />
                  {source.autoPublish ? "Auto Publish" : "Drafts"}
                </Button>
              </div>
            </article>
          ))}
          {!isLoading && !data?.sources.length ? <p className="text-sm text-muted-foreground">No feed sources found.</p> : null}
        </div>
      </section>
    </div>
  );
}
