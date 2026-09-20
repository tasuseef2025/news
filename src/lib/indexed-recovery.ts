import { z } from "zod";

export function indexedArticleSlugs(input: unknown, origin: string) {
  const urls = z.array(z.string().url()).min(1).parse(input);
  const allowedHost = new URL(origin).hostname.replace(/^www\./, "");
  const slugs = new Set<string>();
  for (const value of urls) {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname.replace(/^www\./, "") !== allowedHost || url.port || url.username || url.password) {
      throw new Error("Indexed URL export contains an unexpected site origin");
    }
    const match = url.pathname.match(/^\/news\/([a-z0-9-]+)\/?$/);
    if (match && !url.search && !url.hash) slugs.add(match[1]);
  }
  if (!slugs.size) throw new Error("Indexed URL export contains no canonical article URLs");
  return [...slugs];
}

export function recoveryPublicationDate(doc: Record<string, unknown>) {
  for (const value of [doc.publishedAt, doc.sourcePublishedAt, doc.createdAt]) {
    if (!(value instanceof Date) && typeof value !== "string") continue;
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date;
  }
  throw new Error("Original publication date is unavailable; manual review required");
}

export function recoveryCandidate(doc: Record<string, unknown>, slugs: ReadonlySet<string>, redirectedPaths: ReadonlySet<string>) {
  return slugs.has(String(doc.slug)) && doc.status === "draft" && !redirectedPaths.has(`/news/${doc.slug}`);
}

export function recoveryWriteFilter<T extends Record<string, unknown>>(doc: T) {
  if (doc.status !== "draft") throw new Error("Only unavailable drafts may be recovered");
  return {
    _id: doc._id as T["_id"],
    slug: doc.slug,
    status: "draft",
    title: doc.title,
    content: doc.content,
    updatedAt: doc.updatedAt ?? { $exists: false },
    sourceUrl: doc.sourceUrl ?? { $exists: false },
    originalSourceUrl: doc.originalSourceUrl ?? { $exists: false },
    author: doc.author ?? { $exists: false },
    publishedAt: doc.publishedAt ?? { $exists: false }
  };
}
