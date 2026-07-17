"use client";

import { ArrowUp } from "lucide-react";

export function BackToTop() {
  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="inline-flex h-10 items-center gap-2 rounded-md border bg-background px-3 text-sm font-black transition hover:bg-muted"
    >
      <ArrowUp className="h-4 w-4" />
      Back To Top
    </button>
  );
}
