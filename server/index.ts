import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import { z } from "zod";

const app = express();
const port = Number(process.env.PORT ?? 4000);
const mongoUri = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/news_website";

app.use(express.json({ limit: "2mb" }));

const articleSchema = new mongoose.Schema(
  {
    title: String,
    slug: { type: String, unique: true, index: true },
    excerpt: String,
    content: String,
    category: String,
    author: String,
    image: String,
    tags: [String],
    status: { type: String, default: "draft" },
    featured: Boolean,
    trending: Boolean,
    views: { type: Number, default: 0 },
    publishedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

const Article = mongoose.models.Article || mongoose.model("Article", articleSchema);

const articleInput = z.object({
  title: z.string().min(8),
  slug: z.string().min(3),
  excerpt: z.string().min(20),
  content: z.string().min(80),
  category: z.string().min(2),
  author: z.string().min(2),
  image: z.string().url(),
  tags: z.array(z.string()).default([]),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
  featured: z.boolean().default(false),
  trending: z.boolean().default(false)
});

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "news-api" });
});

app.get("/api/articles", async (_req, res) => {
  const articles = await Article.find({ status: "published" }).sort({ publishedAt: -1 }).limit(50).lean();
  res.json({ articles });
});

app.post("/api/articles", async (req, res) => {
  const parsed = articleInput.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid payload", errors: parsed.error.flatten() });
    return;
  }

  const article = await Article.create(parsed.data);
  res.status(201).json({ article });
});

async function bootstrap() {
  await mongoose.connect(mongoUri, { dbName: "news_website" });
  app.listen(port, () => {
    console.log(`News API listening on http://localhost:${port}`);
  });
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
