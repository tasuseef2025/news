export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/cron";
import { connectDB } from "@/lib/db";
import { generatedOgImagePath } from "@/lib/article-images";
import { publicArticleFilter } from "@/lib/public-articles";
import { findStockImage, isTrackingOrPlaceholderImage, stockImageIdentity } from "@/lib/stock-images";
import { Article } from "@/models/Article";

export async function GET(request: Request) {
  const authError = verifyCronRequest(request);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit") || 30), 100);
  const force = searchParams.get("force") === "true";
  const category = searchParams.get("category")?.trim();

  await connectDB();
  const articleFilter = {
    ...publicArticleFilter(),
    ...(category ? { category: new RegExp(`^${category.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") } : {})
  };
  const articles = await Article.find(articleFilter).sort({ publishedAt: -1 }).limit(limit).select("_id title slug category image").lean();
  const usedArticles = await Article.find({ image: { $type: "string" } }).select({ image: 1 }).sort({ publishedAt: -1 }).limit(1000).lean();
  const usedImages = usedArticles.map((article) => article.image).filter((image): image is string => Boolean(image));
  const imageCounts = usedImages.reduce((counts, image) => {
    const key = stockImageIdentity(image);
    counts.set(key, (counts.get(key) || 0) + 1);
    return counts;
  }, new Map<string, number>());
  let updated = 0;
  const results: Array<{ slug: string; image: string; provider?: string }> = [];

  for (const article of articles) {
    const currentImage = String(article.image || "");
    const repeated = currentImage ? (imageCounts.get(stockImageIdentity(currentImage)) || 0) > 1 : false;
    const needsReplacement = !currentImage || currentImage.includes("/api/og") || isTrackingOrPlaceholderImage(currentImage) || repeated;
    if (!force && !needsReplacement) continue;

    const stockImage = await findStockImage({ title: article.title, category: article.category, excludeUrls: usedImages });
    const image = stockImage?.url || generatedOgImagePath(article.title, article.category);
    if (stockImage?.url) usedImages.push(stockImage.url);

    await Article.findByIdAndUpdate(article._id, {
      image,
      ogImage: image,
      imageAlt: stockImage?.alt || article.title,
      imageCredit: stockImage?.credit || "Original Novexa News graphic",
      imageCreditUrl: stockImage?.pageUrl || undefined
    });
    updated += 1;
    results.push({ slug: article.slug, image, provider: stockImage?.provider });
  }

  revalidatePath("/", "layout");
  return NextResponse.json({ message: "Image backfill completed", updated, scanned: articles.length, results, ranAt: new Date().toISOString() });
}
