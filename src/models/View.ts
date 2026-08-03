import { Schema, model, models } from "mongoose";

const viewSchema = new Schema(
  {
    articleId: { type: Schema.Types.ObjectId, ref: "Article", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    dedupeKey: { type: String, unique: true, sparse: true, index: true },
    visitorHash: { type: String, index: true },
    userAgent: String,
    referrer: String
  },
  { timestamps: true }
);

viewSchema.index({ articleId: 1, createdAt: -1 });

export const View = models.View || model("View", viewSchema);