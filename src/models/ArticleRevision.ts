import { Schema, model, models } from "mongoose";

const articleRevisionSchema = new Schema(
  {
    articleId: { type: Schema.Types.ObjectId, ref: "Article", required: true, index: true },
    title: { type: String, required: true },
    excerpt: String,
    content: { type: String, required: true },
    metaTitle: String,
    metaDescription: String,
    sourceUrl: String,
    sourceName: String,
    reason: { type: String, required: true },
    revisedAt: { type: Date, default: Date.now, index: true }
  },
  { timestamps: true }
);

articleRevisionSchema.index({ articleId: 1, revisedAt: -1 });

export const ArticleRevision = models.ArticleRevision || model("ArticleRevision", articleRevisionSchema);
