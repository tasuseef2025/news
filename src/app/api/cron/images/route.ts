export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/cron";
import { connectDB } from "@/lib/db";
import { generatedOgImagePath } from "@/lib/article-images";
import { findStockImage } from "@/lib/stock-images";
import { Article } from "@/models/Article";

export async function GET(request: Request) {
  const authError = verifyCronRequest(request);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit") || 30), 100);
  const force = searchParams.get("force") === "true";

  await connectDB();
  const articles = await Article.find({ status: "published", reviewStatus: { $ne: "rejected" } }).sort({ publishedAt: -1 }).limit(limit).select("_id title slug category image content").lean();
  const usedArticles = await Article.find({ image: { $type: "string" } }).select({ image: 1 }).sort({ publishedAt: -1 }).limit(1000).lean();
  const usedImages = usedArticles.map((article) => article.image).filter((image): image is string => Boolean(image));
  let updated = 0;
  const results: Array<{ slug: string; image: string; provider?: string }> = [];

  for (const article of articles) {
    const currentImage = String(article.image || "");
    if (!force && currentImage && !currentImage.includes("/api/og")) continue;

    const stockImage = await findStockImage({ title: article.title, category: article.category, excludeUrls: usedImages });
    const image = stockImage?.url || generatedOgImagePath(article.title, article.category);
    const credit = stockImage?.credit;
    if (stockImage?.url) usedImages.push(stockImage.url);
    const content = credit && !String(article.content || "").includes(credit) ? `${article.content}\n\n${credit}` : article.content;

    await Article.findByIdAndUpdate(article._id, {
      image,
      ogImage: image,
      content
    });
    updated += 1;
    results.push({ slug: article.slug, image, provider: stockImage?.provider });
  }

  revalidatePath("/", "layout");
  return NextResponse.json({ message: "Image backfill completed", updated, scanned: articles.length, results, ranAt: new Date().toISOString() });
}
