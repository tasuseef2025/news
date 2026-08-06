import { Schema, model, models } from "mongoose";

const socialPublicationSchema = new Schema(
  {
    articleId: { type: Schema.Types.ObjectId, ref: "Article", required: true, index: true },
    platform: { type: String, enum: ["x"], required: true },
    status: { type: String, enum: ["publishing", "published", "failed"], required: true },
    remoteId: String,
    error: String,
    attempts: { type: Number, default: 0 },
    postedAt: Date
  },
  { timestamps: true }
);

socialPublicationSchema.index({ articleId: 1, platform: 1 }, { unique: true });

export const SocialPublication = models.SocialPublication || model("SocialPublication", socialPublicationSchema);
