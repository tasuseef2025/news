"use client";

import { useState } from "react";
import { Send } from "lucide-react";

export function FooterNewsletter() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function subscribe(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setStatus("");

    const response = await fetch("/api/newsletter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, source: "footer" })
    });

    setLoading(false);
    if (!response.ok) {
      setStatus("Unable to subscribe right now.");
      return;
    }

    setEmail("");
    setStatus("Subscribed successfully.");
  }

  return (
    <form onSubmit={subscribe} className="grid gap-3">
      <div className="flex overflow-hidden rounded-md border bg-background">
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email address"
          className="min-w-0 flex-1 bg-transparent px-3 text-sm outline-none"
        />
        <button
          type="submit"
          disabled={loading}
          className="grid h-11 w-12 place-items-center bg-primary text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
          aria-label="Subscribe to newsletter"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
      {status ? <p className="text-xs font-semibold text-muted-foreground">{status}</p> : null}
    </form>
  );
}
