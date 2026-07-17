"use client";

import { useReportWebVitals } from "next/web-vitals";

export function WebVitals() {
  useReportWebVitals((metric) => {
    const body = JSON.stringify({ ...metric, path: window.location.pathname });
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/analytics/web-vitals", body);
      return;
    }
    fetch("/api/analytics/web-vitals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true
    }).catch(() => undefined);
  });

  return null;
}
