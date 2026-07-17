import { Schema, model, models } from "mongoose";

const commentSchema = new Schema(
  {
    articleId: { type: Schema.Types.ObjectId, ref: "Article", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    content: { type: String, required: true, trim: true },
    status: { type: String, enum: ["pending", "approved", "spam", "trash"], default: "pending", index: true }
  },
  { timestamps: true }
);

export const Comment = models.Comment || model("Comment", commentSchema);
