import { Schema, model, models } from "mongoose";

const bookmarkSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    articleId: { type: Schema.Types.ObjectId, ref: "Article", required: true, index: true }
  },
  { timestamps: true }
);

bookmarkSchema.index({ userId: 1, articleId: 1 }, { unique: true });

export const Bookmark = models.Bookmark || model("Bookmark", bookmarkSchema);
