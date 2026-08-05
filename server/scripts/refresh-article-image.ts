import "dotenv/config";
import mongoose from "mongoose";
import { findStockImage } from "../../src/lib/stock-images";
import { Article } from "../../src/models/Article";

const slug = process.argv[2];

async function refreshArticleImage() {
  if (!slug) throw new Error("Usage: npm run refresh:article-image -- <article-slug>");
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not configured");

  await mongoose.connect(process.env.MONGODB_URI, { dbName: "news_website", bufferCommands: false });
  const article = await Article.findOne({ slug });
  if (!article) throw new Error(`Article not found: ${slug}`);

  const recentArticles = await Article.find({ _id: { $ne: article._id }, image: { $type: "string" } })
    .select({ image: 1 })
    .sort({ createdAt: -1 })
    .limit(500)
    .lean();
  const excludeUrls = recentArticles.map((item) => item.image).filter((image): image is string => Boolean(image));
  const stockImage = await findStockImage({ title: article.title, category: article.category, excludeUrls });
  if (!stockImage) throw new Error("No licensed stock image was found. Check PEXELS_API_KEY, PIXABAY_API_KEY, and FEED_USE_STOCK_IMAGES.");

  article.image = stockImage.url;
  article.ogImage = stockImage.url;
  article.imageAlt = stockImage.alt || article.title;
  article.imageCredit = stockImage.credit;
  article.imageCreditUrl = stockImage.pageUrl;
  await article.save();

  console.log(`Updated image for: ${article.slug}`);
  console.log(`Provider: ${stockImage.provider}`);
  console.log(`Provider page: ${stockImage.pageUrl || "not supplied"}`);
}

refreshArticleImage()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });