import { Schema, Types, model, models } from "mongoose";
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
  originalSourceName?: string;
  originalSourceUrl?: string;
  rssFeedUrl?: string;
  sourceGuid?: string;
  sourceItemId?: string;
  sourcePublishedAt?: Date;
  importedAt?: Date;
  aiGeneratedAt?: Date;
  aiAttemptedAt?: Date;
  aiFailureReason?: string;
  lastUpdatedAt?: Date;
  references?: Array<{ name: string; url: string; publishedAt?: Date }>;
  sourceContentHash?: string;
  contentHash?: string;
  reviewStatus?: "pending" | "approved" | "rejected" | "needs_review";
  rejectionReasons?: string[];
  qualityScore?: number;
  originalityScore?: number;
  factualConfidence?: number;
  duplicateRisk?: number;
  isDevelopingStory?: boolean;
  parentStoryId?: Types.ObjectId;
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
    originalSourceName: { type: String, trim: true },
    originalSourceUrl: { type: String, trim: true },
    rssFeedUrl: { type: String, trim: true },
    sourceGuid: { type: String, trim: true },
    sourceItemId: { type: String, trim: true },
    sourcePublishedAt: Date,
    importedAt: Date,
    aiGeneratedAt: Date,
    aiAttemptedAt: { type: Date, index: true },
    aiFailureReason: { type: String, trim: true },
    lastUpdatedAt: Date,
    references: [{ name: { type: String, required: true }, url: { type: String, required: true }, publishedAt: Date }],
    sourceContentHash: { type: String, index: true },
    contentHash: { type: String, index: true },
    reviewStatus: { type: String, enum: ["pending", "approved", "rejected", "needs_review"], default: "pending", index: true },
    rejectionReasons: [{ type: String, trim: true }],
    qualityScore: { type: Number, min: 0, max: 100 },
    originalityScore: { type: Number, min: 0, max: 100 },
    factualConfidence: { type: Number, min: 0, max: 100 },
    duplicateRisk: { type: Number, min: 0, max: 100 },
    isDevelopingStory: { type: Boolean, default: false },
    parentStoryId: { type: Schema.Types.ObjectId, ref: "Article", index: true },
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
articleSchema.index({ status: 1, reviewStatus: 1, generationMode: 1, publishedAt: -1 });
articleSchema.index({ status: 1, reviewStatus: 1, generationMode: 1, category: 1, publishedAt: -1 });
articleSchema.index({ status: 1, reviewStatus: 1, generationMode: 1, trending: 1, views: -1, publishedAt: -1 });
articleSchema.index({ sourceUrl: 1 }, { unique: true, sparse: true });
articleSchema.index({ originalSourceUrl: 1 }, { unique: true, sparse: true });
articleSchema.index({ sourceGuid: 1, rssFeedUrl: 1 }, { unique: true, partialFilterExpression: { sourceGuid: { $type: "string" }, rssFeedUrl: { $type: "string" } } });
articleSchema.index({ sourceItemId: 1, rssFeedUrl: 1 }, { unique: true, partialFilterExpression: { sourceItemId: { $type: "string" }, rssFeedUrl: { $type: "string" } } });

export const Article = models.Article || model<ArticleDocument>("Article", articleSchema);


