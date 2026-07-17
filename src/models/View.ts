import { Schema, model, models } from "mongoose";

const viewSchema = new Schema(
  {
    articleId: { type: Schema.Types.ObjectId, ref: "Article", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    ipHash: String,
    userAgent: String,
    referrer: String
  },
  { timestamps: true }
);

export const View = models.View || model("View", viewSchema);
