"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  CalendarClock,
  Eye,
  FilePenLine,
  ImagePlus,
  Loader2,
  Save,
  Send,
  Trash2,
  WandSparkles
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import type { UseFormRegisterReturn } from "react-hook-form";
import type { z } from "zod";
import { z as zod } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { articleSchema } from "@/lib/validators";
import { categories } from "@/lib/categories";
import type { Article, ArticleStatus, Permission } from "@/types";

type ArticleInput = z.input<typeof articleSchema>;
const articleFormSchema = articleSchema.extend({
  tagsText: zod.string().optional().default(""),
  galleryText: zod.string().optional().default("")
});

type ArticleFormValues = z.input<typeof articleFormSchema>;

const defaultValues: ArticleFormValues = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  category: "",
  subcategory: "",
  author: "",
  image: "",
  gallery: [],
  galleryText: "",
  videoUrl: "",
  tags: [],
  tagsText: "",
  status: "draft",
  featured: false,
  trending: false,
  breakingNews: false,
  allowComments: true,
  metaTitle: "",
  metaDescription: "",
  ogImage: "",
  canonicalUrl: "",
  schemaMarkup: "",
  readingTime: 1,
  scheduledAt: ""
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function splitList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function estimateReadingTime(content: string) {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 220));
}

function toDateTimeLocal(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 16);
}

export function ArticleManagement({
  initialArticles,
  permissions
}: {
  initialArticles: Article[];
  permissions: Permission[];
}) {
  const [articles, setArticles] = useState<Article[]>(initialArticles);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<ArticleStatus | null>(null);
  const canPublish = permissions.includes("publish_articles");
  const canDelete = permissions.includes("delete_articles");

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<ArticleFormValues>({
    resolver: zodResolver(articleFormSchema),
    defaultValues
  });

  const watched = watch();
  const readingTime = useMemo(() => estimateReadingTime(watched.content ?? ""), [watched.content]);

  function preparePayload(values: ArticleFormValues, status: ArticleStatus) {
    return {
      ...values,
      status,
      tags: splitList(values.tagsText ?? ""),
      gallery: splitList(values.galleryText ?? ""),
      readingTime: estimateReadingTime(values.content),
      scheduledAt: status === "scheduled" ? values.scheduledAt : ""
    };
  }

  async function submitWithStatus(values: ArticleFormValues, status: ArticleStatus) {
    setPendingAction(status);
    setMessage("");

    if (["published", "scheduled"].includes(status) && !canPublish) {
      setMessage("You do not have permission to publish or schedule articles.");
      setPendingAction(null);
      return;
    }

    const response = await fetch(editingId ? `/api/articles/${editingId}` : "/api/articles", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(preparePayload(values, status))
    });

    if (!response.ok) {
      const error = await response.json().catch(() => null);
      setMessage(error?.message ?? "Unable to save article.");
      setPendingAction(null);
      return;
    }

    const { article } = await response.json();
    setArticles((current) => {
      const exists = current.some((item) => item._id === article._id);
      return exists ? current.map((item) => (item._id === article._id ? article : item)) : [article, ...current];
    });
    setEditingId(article._id);
    setMessage(status === "published" ? "Article published." : status === "scheduled" ? "Article scheduled." : "Draft saved.");
    setPendingAction(null);
  }

  function editArticle(article: Article) {
    setEditingId(article._id ?? null);
    setMessage("");
    reset({
      ...defaultValues,
      ...article,
      galleryText: article.gallery?.join(", ") ?? "",
      tagsText: article.tags?.join(", ") ?? "",
      scheduledAt: toDateTimeLocal(article.scheduledAt)
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteArticle(article: Article) {
    if (!article._id || !confirm(`Delete "${article.title}"?`)) return;
    const response = await fetch(`/api/articles/${article._id}`, { method: "DELETE" });
    if (!response.ok) {
      setMessage("Unable to delete article.");
      return;
    }
    setArticles((current) => current.filter((item) => item._id !== article._id));
    if (editingId === article._id) {
      setEditingId(null);
      reset(defaultValues);
    }
    setMessage("Article deleted.");
  }

  function startNew() {
    setEditingId(null);
    setMessage("");
    reset(defaultValues);
  }

  function insertMarkup(before: string, after = before) {
    const current = watched.content ?? "";
    setValue("content", `${current}${current ? "\n" : ""}${before}Selected text${after}`, {
      shouldDirty: true,
      shouldValidate: true
    });
  }

  return (
    <div className="grid gap-8">
      <section className="rounded-lg border bg-card p-5 shadow-sm">
        <div className="mb-5 flex flex-col justify-between gap-3 border-b pb-4 md:flex-row md:items-center">
          <div>
            <p className="text-sm font-black uppercase text-primary">Article Management System</p>
            <h1 className="text-3xl font-black">{editingId ? "Edit Article" : "Create Article"}</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={startNew}>
              New Article
            </Button>
            <Button type="button" variant="outline" onClick={() => setPreviewOpen((value) => !value)}>
              <Eye className="h-4 w-4" />
              Preview
            </Button>
          </div>
        </div>

        <form className="grid gap-6" onSubmit={handleSubmit((values) => submitWithStatus(values, "draft"))}>
          <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
            <div className="grid gap-4">
              <Field label="Title" error={errors.title?.message}>
                <Input {...register("title")} placeholder="Enter article headline" />
              </Field>

              <div className="grid gap-4 md:grid-cols-[1fr_auto]">
                <Field label="Slug" error={errors.slug?.message}>
                  <Input {...register("slug")} placeholder="article-url-slug" />
                </Field>
                <Button
                  type="button"
                  variant="secondary"
                  className="self-end"
                  onClick={() => setValue("slug", slugify(watched.title ?? ""), { shouldValidate: true })}
                >
                  <WandSparkles className="h-4 w-4" />
                  Generate
                </Button>
              </div>

              <Field label="Excerpt" error={errors.excerpt?.message}>
                <textarea
                  className="min-h-24 rounded-md border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-accent"
                  {...register("excerpt")}
                  placeholder="Short summary for cards, SEO snippets, and social previews"
                />
              </Field>

              <Field label="Rich Text Editor" error={errors.content?.message}>
                <div className="rounded-md border bg-background">
                  <div className="flex flex-wrap gap-2 border-b p-2">
                    <Button type="button" size="sm" variant="ghost" onClick={() => insertMarkup("**", "**")}>
                      B
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => insertMarkup("_", "_")}>
                      I
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => insertMarkup("## ", "")}>
                      H2
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => insertMarkup("> ", "")}>
                      Quote
                    </Button>
                  </div>
                  <textarea
                    className="min-h-72 w-full bg-transparent p-3 text-sm leading-6 outline-none"
                    {...register("content")}
                    placeholder="Write the article body..."
                  />
                </div>
              </Field>
            </div>

            <aside className="grid content-start gap-4">
              <Field label="Article Status">
                <select className="h-10 rounded-md border bg-background px-3 text-sm" {...register("status")}>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="archived">Archived</option>
                </select>
              </Field>
              <Field label="Schedule Publish">
                <Input type="datetime-local" {...register("scheduledAt")} />
              </Field>
              <div className="rounded-md border bg-background p-3 text-sm font-semibold">
                Reading Time: <span className="text-primary">{readingTime} min</span>
              </div>
              <Toggle label="Featured Post" register={register("featured")} />
              <Toggle label="Trending Post" register={register("trending")} />
              <Toggle label="Breaking News" register={register("breakingNews")} />
              <Toggle label="Allow Comments" register={register("allowComments")} />
            </aside>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Field label="Category" error={errors.category?.message}>
              <Input {...register("category")} list="article-categories" placeholder="Business" />
            </Field>
            <Field label="Subcategory">
              <Input {...register("subcategory")} list="article-categories" placeholder="Markets" />
            </Field>
            <Field label="Tags">
              <Input {...register("tagsText")} placeholder="economy, stocks, analysis" />
            </Field>
            <Field label="Author" error={errors.author?.message}>
              <Input {...register("author")} placeholder="Editor name" />
            </Field>
          </div>

          <datalist id="article-categories">
            {categories.map((category) => (
              <option key={category} value={category} />
            ))}
          </datalist>
          <section className="grid gap-4 rounded-lg border bg-background p-4">
            <div className="flex items-center gap-2 font-black">
              <ImagePlus className="h-5 w-5 text-primary" />
              Media
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Featured Image" error={errors.image?.message}>
                <Input {...register("image")} placeholder="https://..." />
              </Field>
              <Field label="OG Image">
                <Input {...register("ogImage")} placeholder="https://..." />
              </Field>
              <Field label="Gallery">
                <Input {...register("galleryText")} placeholder="https://image-1.jpg, https://image-2.jpg" />
              </Field>
              <Field label="Video">
                <Input {...register("videoUrl")} placeholder="https://youtube.com/..." />
              </Field>
            </div>
          </section>

          <section className="grid gap-4 rounded-lg border bg-background p-4">
            <div className="font-black">SEO</div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Meta Title">
                <Input {...register("metaTitle")} maxLength={70} />
              </Field>
              <Field label="Canonical URL">
                <Input {...register("canonicalUrl")} placeholder="https://example.com/news/article" />
              </Field>
            </div>
            <Field label="Meta Description">
              <textarea className="min-h-20 rounded-md border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-accent" {...register("metaDescription")} maxLength={170} />
            </Field>
            <Field label="Schema Markup">
              <textarea className="min-h-28 rounded-md border bg-background p-3 font-mono text-xs outline-none focus:ring-2 focus:ring-accent" {...register("schemaMarkup")} placeholder='{"@context":"https://schema.org","@type":"NewsArticle"}' />
            </Field>
          </section>

          {previewOpen ? <ArticlePreview values={watched} /> : null}
          {message ? <p className="rounded-md bg-muted p-3 text-sm font-bold">{message}</p> : null}

          <div className="flex flex-wrap gap-3">
            <ActionButton loading={isSubmitting && pendingAction === "draft"} icon={Save} label="Save Draft" />
            <Button type="button" disabled={isSubmitting || !canPublish} onClick={handleSubmit((values) => submitWithStatus(values, "published"))}>
              {isSubmitting && pendingAction === "published" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Publish
            </Button>
            <Button type="button" variant="secondary" disabled={isSubmitting || !canPublish} onClick={handleSubmit((values) => submitWithStatus(values, "scheduled"))}>
              {isSubmitting && pendingAction === "scheduled" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarClock className="h-4 w-4" />}
              Schedule Publish
            </Button>
          </div>
        </form>
      </section>

      <section className="rounded-lg border bg-card p-5 shadow-sm">
        <div className="mb-5 flex items-center gap-2">
          <FilePenLine className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-black">Articles</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="border-b text-xs uppercase text-muted-foreground">
              <tr>
                <th className="py-3 pr-4">Title</th>
                <th className="py-3 pr-4">Category</th>
                <th className="py-3 pr-4">Author</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 pr-4">Flags</th>
                <th className="py-3 pr-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {articles.length ? (
                articles.map((article) => (
                  <tr key={article._id ?? article.slug} className="border-b last:border-0">
                    <td className="py-3 pr-4 font-bold">
                      <Link href={`/news/${article.slug}`} className="hover:text-primary">
                        {article.title}
                      </Link>
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">{article.category}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{article.author}</td>
                    <td className="py-3 pr-4">
                      <span className="rounded-sm bg-muted px-2 py-1 text-xs font-black capitalize">{article.status}</span>
                    </td>
                    <td className="py-3 pr-4 text-xs font-bold text-muted-foreground">
                      {[article.featured && "Featured", article.trending && "Trending", article.breakingNews && "Breaking"].filter(Boolean).join(", ") || "None"}
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex justify-end gap-2">
                        <Button type="button" size="sm" variant="secondary" onClick={() => editArticle(article)}>
                          Edit
                        </Button>
                        {canDelete ? (
                          <Button type="button" size="icon" variant="ghost" aria-label="Delete article" onClick={() => deleteArticle(article)}>
                            <Trash2 className="h-4 w-4 text-primary" />
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted-foreground">
                    No articles found. Create your first draft above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
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

function Toggle({ label, register }: { label: string; register: UseFormRegisterReturn }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-md border bg-background p-3 text-sm font-bold">
      {label}
      <input type="checkbox" className="h-4 w-4" {...register} />
    </label>
  );
}

function ActionButton({ loading, icon: Icon, label }: { loading: boolean; icon: typeof Save; label: string }) {
  return (
    <Button type="submit" variant="secondary" disabled={loading}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
      {label}
    </Button>
  );
}

function ArticlePreview({ values }: { values: ArticleFormValues }) {
  return (
    <section className="rounded-lg border bg-background p-4">
      <p className="mb-3 text-sm font-black uppercase text-primary">Preview</p>
      <article className="grid gap-4">
        {values.image ? (
          <div className="relative aspect-[16/7] overflow-hidden rounded-lg bg-muted">
            <Image src={values.image} alt={values.title || "Article preview"} fill className="object-cover" />
          </div>
        ) : null}
        <div>
          <p className="text-sm font-black uppercase text-primary">{values.category || "Category"}</p>
          <h2 className="mt-1 text-3xl font-black">{values.title || "Article title preview"}</h2>
          <p className="mt-3 text-muted-foreground">{values.excerpt || "Article excerpt preview."}</p>
        </div>
      </article>
    </section>
  );
}


