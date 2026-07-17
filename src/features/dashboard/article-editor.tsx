"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Save } from "lucide-react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { articleSchema } from "@/lib/validators";

type ArticleInput = z.input<typeof articleSchema>;

export function ArticleEditor() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isSubmitSuccessful }
  } = useForm<ArticleInput>({
    resolver: zodResolver(articleSchema),
    defaultValues: {
      title: "",
      slug: "",
      excerpt: "",
      content: "",
      category: "World",
      author: "",
      image: "",
      tags: [],
      status: "draft",
      featured: false,
      trending: false
    }
  });

  async function onSubmit(values: ArticleInput) {
    await fetch("/api/articles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values)
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 rounded-lg border bg-card p-5">
      <div>
        <h2 className="text-xl font-black">Create article</h2>
        <p className="text-sm text-muted-foreground">Draft, publish, feature, and tag editorial content.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Title" error={errors.title?.message}>
          <Input {...register("title")} />
        </Field>
        <Field label="Slug" error={errors.slug?.message}>
          <Input {...register("slug")} />
        </Field>
        <Field label="Category" error={errors.category?.message}>
          <Input {...register("category")} />
        </Field>
        <Field label="Author" error={errors.author?.message}>
          <Input {...register("author")} />
        </Field>
      </div>
      <Field label="Image URL" error={errors.image?.message}>
        <Input {...register("image")} />
      </Field>
      <Field label="Excerpt" error={errors.excerpt?.message}>
        <textarea className="min-h-24 rounded-md border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-accent" {...register("excerpt")} />
      </Field>
      <Field label="Content" error={errors.content?.message}>
        <textarea className="min-h-44 rounded-md border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-accent" {...register("content")} />
      </Field>
      <div className="flex flex-wrap gap-4 text-sm font-semibold">
        <label className="flex items-center gap-2">
          <input type="checkbox" {...register("featured")} />
          Featured
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" {...register("trending")} />
          Trending
        </label>
      </div>
      {isSubmitSuccessful ? <p className="text-sm font-semibold text-accent">Article submitted.</p> : null}
      <Button type="submit" disabled={isSubmitting} className="w-fit">
        <Save className="h-4 w-4" />
        Save article
      </Button>
    </form>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-2 text-sm font-semibold">
      {label}
      {children}
      {error ? <span className="text-primary">{error}</span> : null}
    </label>
  );
}
