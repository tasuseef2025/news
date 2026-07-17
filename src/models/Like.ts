import { Schema, model, models } from "mongoose";

const likeSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    articleId: { type: Schema.Types.ObjectId, ref: "Article", required: true, index: true },
    ipHash: String
  },
  { timestamps: true }
);

likeSchema.index({ userId: 1, articleId: 1 }, { unique: true, sparse: true });

export const Like = models.Like || model("Like", likeSchema);
