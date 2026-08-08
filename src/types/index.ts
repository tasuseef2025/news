export type Role =
  | "super_admin"
  | "admin"
  | "editor"
  | "author"
  | "journalist"
  | "moderator"
  | "subscriber";

export type Permission =
  | "create_articles"
  | "delete_articles"
  | "publish_articles"
  | "manage_users"
  | "manage_categories"
  | "manage_ads"
  | "view_analytics"
  | "manage_settings";

export type ArticleStatus = "draft" | "published" | "scheduled" | "archived";

export type Article = {
  _id?: string;
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
  sourcePublishedAt?: string;
  importedAt?: string;
  aiGeneratedAt?: string;
  lastUpdatedAt?: string;
  references?: Array<{ name: string; url: string; publishedAt?: string }>;
  reviewStatus?: "pending" | "approved" | "rejected" | "needs_review";
  rejectionReasons?: string[];
  qualityScore?: number;
  originalityScore?: number;
  factualConfidence?: number;
  duplicateRisk?: number;
  isDevelopingStory?: boolean;
  parentStoryId?: string;
  generationMode?: "manual" | "ai" | "feed";
  image: string;
  imageAlt?: string;
  imageCredit?: string;
  imageCreditUrl?: string;
  gallery?: string[];
  videoUrl?: string;
  tags: string[];
  status: ArticleStatus;
  featured: boolean;
  trending: boolean;
  breakingNews?: boolean;
  allowComments?: boolean;
  metaTitle?: string;
  metaDescription?: string;
  ogImage?: string;
  canonicalUrl?: string;
  schemaMarkup?: string;
  readingTime?: number;
  scheduledAt?: string;
  views: number;
  publishedAt: string;
  createdAt?: string;
  updatedAt?: string;
};

export type Advertisement = {
  _id?: string;
  title: string;
  placement: "top" | "middle" | "sidebar" | "footer";
  image?: string;
  href?: string;
  sponsor?: string;
  revenue?: number;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
};



