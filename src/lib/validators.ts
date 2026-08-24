import { z } from "zod";

const optionalUrl = z.string().url().or(z.literal("")).optional();

export const articleSchema = z.object({
  title: z.string().min(8),
  slug: z.string().min(3).regex(/^[a-z0-9-]+$/),
  excerpt: z.string().min(20).max(240),
  content: z.string().min(80),
  category: z.string().min(2),
  subcategory: z.string().optional().default(""),
  author: z.string().min(2),
  image: z.string().url(),
  gallery: z.array(z.string().url()).default([]),
  videoUrl: optionalUrl,
  tags: z.array(z.string()).default([]),
  status: z.enum(["draft", "published", "scheduled", "archived"]).default("draft"),
  featured: z.boolean().default(false),
  trending: z.boolean().default(false),
  breakingNews: z.boolean().default(false),
  allowComments: z.boolean().default(true),
  metaTitle: z.string().max(70).optional().default(""),
  metaDescription: z.string().max(170).optional().default(""),
  ogImage: optionalUrl,
  canonicalUrl: optionalUrl,
  schemaMarkup: z.string().optional().default(""),
  readingTime: z.number().int().min(1).optional().default(1),
  scheduledAt: z.string().optional().default(""),
  sourceName: z.string().optional().default(""),
  sourceUrl: optionalUrl,
  originalSourceName: z.string().optional().default(""),
  originalSourceUrl: optionalUrl,
  references: z.array(z.object({ name: z.string().min(1), url: z.string().url(), publishedAt: z.union([z.string(), z.date()]).optional() })).default([]),
  generationMode: z.enum(["manual", "ai", "feed"]).optional().default("manual"),
  imageAlt: z.string().optional().default(""),
  duplicateRisk: z.number().min(0).max(100).optional().default(0)
});

export const signInSchema = z.object({
  email: z.email(),
  password: z.string().min(8)
});

