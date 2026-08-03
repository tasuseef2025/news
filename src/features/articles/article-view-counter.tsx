"use client";

import { useEffect, useState } from "react";

const VIEW_WINDOW_MS = 30 * 60 * 1000;
const VISITOR_KEY = "novexa:visitor";

function browserVisitorId() {
  const existing = localStorage.getItem(VISITOR_KEY);
  if (existing) return existing;

  const value = crypto.randomUUID();
  localStorage.setItem(VISITOR_KEY, value);
  return value;
}

export function ArticleViewCounter({ articleId, initialViews }: { articleId?: string; initialViews: number }) {
  const [views, setViews] = useState(initialViews);

  useEffect(() => {
    if (!articleId) return;

    const windowId = Math.floor(Date.now() / VIEW_WINDOW_MS);
    const storageKey = `novexa:view:${articleId}:${windowId}`;
    if (sessionStorage.getItem(storageKey)) return;
    sessionStorage.setItem(storageKey, "pending");

    fetch("/api/views", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ articleId, visitorId: browserVisitorId() }),
      credentials: "same-origin",
      keepalive: true
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("View request failed");
        return response.json() as Promise<{ total?: number }>;
      })
      .then((result) => {
        sessionStorage.setItem(storageKey, "counted");
        if (typeof result.total === "number") setViews(result.total);
      })
      .catch(() => {
        sessionStorage.removeItem(storageKey);
      });
  }, [articleId]);

  return <span>{views.toLocaleString()} views</span>;
}