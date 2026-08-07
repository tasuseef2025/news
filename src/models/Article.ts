import { Schema, model, models } from "mongoose";
import type { ArticleStatus } from "@/types";

export type ArticleDocument = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  subcategory?: string;
  author: string;
  sourceName?: string;
  sourceUrl?: string;
  generationMode?: "manual" | "ai" | "feed";
  primaryKeyword?: string;
  keywordResearch?: {
    source: "google-trends" | "editorial";
    relatedKeywords: string[];
    geo?: string;
    approximateTraffic?: number;
    researchedAt: Date;
  };
  image: string;
  imageAlt?: string;
  imageCredit?: string;
  imageCreditUrl?: string;
  gallery: string[];
  videoUrl?: string;
  tags: string[];
  status: ArticleStatus;
  featured: boolean;
  trending: boolean;
  breakingNews: boolean;
  allowComments: boolean;
  metaTitle?: string;
  metaDescription?: string;
  ogImage?: string;
  canonicalUrl?: string;
  schemaMarkup?: string;
  readingTime: number;
  scheduledAt?: Date;
  views: number;
  publishedAt: Date;
};

const articleSchema = new Schema<ArticleDocument>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    excerpt: { type: String, required: true },
    content: { type: String, required: true },
    category: { type: String, required: true, index: true },
    subcategory: { type: String, trim: true },
    author: { type: String, required: true },
    sourceName: { type: String, trim: true },
    sourceUrl: { type: String, trim: true, index: true },
    generationMode: { type: String, enum: ["manual", "ai", "feed"], default: "manual", index: true },
    primaryKeyword: { type: String, trim: true, index: true },
    keywordResearch: {
      source: { type: String, enum: ["google-trends", "editorial"] },
      relatedKeywords: [{ type: String, trim: true }],
      geo: String,
      approximateTraffic: Number,
      researchedAt: Date
    },
    image: { type: String, required: true },
    imageAlt: { type: String, trim: true },
    imageCredit: { type: String, trim: true },
    imageCreditUrl: { type: String, trim: true },
    gallery: [{ type: String, trim: true }],
    videoUrl: String,
    tags: [{ type: String, trim: true }],
    status: { type: String, enum: ["draft", "published", "scheduled", "archived"], default: "draft", index: true },
    featured: { type: Boolean, default: false },
    trending: { type: Boolean, default: false },
    breakingNews: { type: Boolean, default: false, index: true },
    allowComments: { type: Boolean, default: true },
    metaTitle: String,
    metaDescription: String,
    ogImage: String,
    canonicalUrl: String,
    schemaMarkup: String,
    readingTime: { type: Number, default: 1 },
    scheduledAt: Date,
    views: { type: Number, default: 0 },
    publishedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

articleSchema.index({ title: "text", excerpt: "text", content: "text" });
articleSchema.index({ sourceUrl: 1 }, { unique: true, sparse: true });

export const Article = models.Article || model<ArticleDocument>("Article", articleSchema);


