import { unstable_noStore as noStore } from "next/cache";
import { connectDB } from "@/lib/db";
import { Article as ArticleModel } from "@/models/Article";
import type { Article } from "@/types";

export async function publishDueScheduledArticles() {
  await ArticleModel.updateMany(
    { status: "scheduled", scheduledAt: { $lte: new Date() } },
    { $set: { status: "published", publishedAt: new Date() } }
  );
}

function serializeArticle(article: unknown): Article {
  const doc = article as Article & {
    _id?: { toString: () => string };
    publishedAt: Date;
    scheduledAt?: Date;
    createdAt?: Date;
    updatedAt?: Date;
  };

  return {
    ...doc,
    _id: doc._id?.toString(),
    publishedAt: new Date(doc.publishedAt).toISOString(),
    scheduledAt: doc.scheduledAt ? new Date(doc.scheduledAt).toISOString() : undefined,
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : undefined,
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : undefined
  };
}

export async function getArticles(filters?: {
  category?: string;
  limit?: number;
  featured?: boolean;
  trending?: boolean;
  sort?: "latest" | "popular";
}) {
  noStore();

  try {
    await connectDB();
    await publishDueScheduledArticles();
    const query: Record<string, unknown> = { status: "published" };
    if (filters?.category) query.category = new RegExp(`^${filters.category}$`, "i");
    if (typeof filters?.featured === "boolean") query.featured = filters.featured;
    if (typeof filters?.trending === "boolean") query.trending = filters.trending;

    const docs = await ArticleModel.find(query)
      .sort(filters?.sort === "popular" ? { views: -1, publishedAt: -1 } : { publishedAt: -1 })
      .limit(filters?.limit ?? 24)
      .lean();

    return docs.map(serializeArticle);
  } catch {
    return [];
  }
}

export async function getArticleBySlug(slug: string) {
  noStore();

  try {
    await connectDB();
    await publishDueScheduledArticles();
    const doc = await ArticleModel.findOneAndUpdate(
      { slug, status: "published" },
      { $inc: { views: 1 } },
      { new: true }
    ).lean();

    return doc ? serializeArticle(doc) : null;
  } catch {
    return null;
  }
}

export { serializeArticle };
