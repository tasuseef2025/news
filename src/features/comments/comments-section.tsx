"use client";

import { Loader2, MessageSquare } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type CommentItem = {
  _id: string;
  name: string;
  content: string;
  createdAt?: string;
};

export function CommentsSection({ articleId, allowComments }: { articleId?: string; allowComments?: boolean }) {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!articleId) return;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/comments?articleId=${articleId}&status=approved&limit=20`)
      .then((response) => response.json())
      .then((data) => {
        if (!cancelled) setComments(Array.isArray(data.comments) ? data.comments : []);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [articleId]);

  async function submitComment(formData: FormData) {
    if (!articleId) return;
    setSubmitting(true);
    setMessage("");
    const payload = {
      articleId,
      name: String(formData.get("name") || "").trim(),
      email: String(formData.get("email") || "").trim(),
      content: String(formData.get("content") || "").trim()
    };

    const response = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    setSubmitting(false);
    if (!response.ok) {
      setMessage("Please add your name, email, and comment before submitting.");
      return;
    }

    setMessage("Comment submitted. It will appear after moderation.");
    const form = document.getElementById("comment-form") as HTMLFormElement | null;
    form?.reset();
  }

  return (
    <section className="mt-8 rounded-lg border bg-card p-5">
      <div className="mb-5 flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-primary" />
        <h2 className="text-2xl font-black">Comments</h2>
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Loading comments...</p> : null}
      {!loading && comments.length ? (
        <div className="mb-6 grid gap-4">
          {comments.map((comment) => (
            <article key={comment._id} className="rounded-md border bg-background p-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="font-black">{comment.name}</span>
                {comment.createdAt ? <time className="text-xs text-muted-foreground">{new Date(comment.createdAt).toLocaleString()}</time> : null}
              </div>
              <p className="text-sm leading-6 text-muted-foreground">{comment.content}</p>
            </article>
          ))}
        </div>
      ) : null}
      {!loading && !comments.length ? <p className="mb-6 text-sm text-muted-foreground">No approved comments yet.</p> : null}

      {allowComments === false ? (
        <p className="text-sm font-semibold text-muted-foreground">Comments are closed for this article.</p>
      ) : (
        <form id="comment-form" action={submitComment} className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input name="name" placeholder="Name" required />
            <Input name="email" type="email" placeholder="Email" required />
          </div>
          <textarea name="content" placeholder="Write a comment" required className="min-h-28 rounded-md border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-accent" />
          {message ? <p className="text-sm font-semibold text-muted-foreground">{message}</p> : null}
          <Button type="submit" disabled={submitting} className="w-fit">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Submit Comment
          </Button>
        </form>
      )}
    </section>
  );
}
