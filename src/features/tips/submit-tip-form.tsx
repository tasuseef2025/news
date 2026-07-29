"use client";

import { CheckCircle2, Loader2, Upload } from "lucide-react";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type UploadedMedia = { url: string; type: "image" | "video" | "other"; publicId?: string };

export function SubmitTipForm() {
  const [anonymous, setAnonymous] = useState(false);
  const [media, setMedia] = useState<UploadedMedia[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  async function uploadFile(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch("/api/submit-tip/media", { method: "POST", body: formData });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Upload failed");
    setMedia((items) => [...items, { url: data.url, type: data.type, publicId: data.publicId }].slice(0, 5));
  }

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setMessage("");
    try {
      for (const file of Array.from(files).slice(0, 5 - media.length)) {
        await uploadFile(file);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Media upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const payload = {
      anonymous,
      name: String(form.get("name") || ""),
      email: String(form.get("email") || ""),
      phone: String(form.get("phone") || ""),
      location: String(form.get("location") || ""),
      category: String(form.get("category") || "News Tip"),
      title: String(form.get("title") || ""),
      description: String(form.get("description") || ""),
      media
    };

    try {
      const response = await fetch("/api/submit-tip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to submit tip");
      event.currentTarget.reset();
      setMedia([]);
      setAnonymous(false);
      setMessage("Thank you. Your news tip has been submitted for editorial review.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to submit tip");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-5 rounded-lg border bg-card p-5 md:p-6">
      <label className="flex items-center gap-3 text-sm font-bold">
        <input type="checkbox" checked={anonymous} onChange={(event) => setAnonymous(event.target.checked)} className="h-4 w-4 accent-primary" />
        Submit anonymously
      </label>

      {!anonymous ? (
        <div className="grid gap-4 md:grid-cols-3">
          <Input name="name" placeholder="Your name" />
          <Input name="email" type="email" placeholder="Email address" />
          <Input name="phone" placeholder="Phone / WhatsApp" />
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Input name="title" required minLength={8} maxLength={160} placeholder="Tip headline" />
        <Input name="location" placeholder="Location" />
      </div>

      <select name="category" className="h-10 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-accent">
        <option>News Tip</option>
        <option>Breaking News</option>
        <option>Politics</option>
        <option>Business</option>
        <option>Sports</option>
        <option>Technology</option>
        <option>Crime</option>
        <option>Weather</option>
      </select>

      <textarea name="description" required minLength={40} maxLength={5000} placeholder="Describe what happened, when it happened, who was involved, and how our newsroom can verify it." className="min-h-40 rounded-md border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-accent" />

      <div className="rounded-md border border-dashed bg-background p-4">
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 text-center text-sm font-bold text-muted-foreground">
          {uploading ? <Loader2 className="h-6 w-6 animate-spin text-primary" /> : <Upload className="h-6 w-6 text-primary" />}
          Upload image/video evidence, optional, max 25MB each
          <input type="file" multiple accept="image/*,video/mp4,video/webm,video/quicktime" className="sr-only" onChange={(event) => onFiles(event.target.files)} />
        </label>
        {media.length ? (
          <div className="mt-3 grid gap-2 text-xs font-semibold text-muted-foreground">
            {media.map((item) => <span key={item.url} className="truncate rounded bg-muted px-2 py-1">{item.type}: {item.url}</span>)}
          </div>
        ) : null}
      </div>

      <Button type="submit" disabled={loading || uploading} className="w-fit gap-2">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
        Submit Tip
      </Button>

      {message ? <p className="text-sm font-semibold text-muted-foreground">{message}</p> : null}
    </form>
  );
}

