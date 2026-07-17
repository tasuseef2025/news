import { Schema, model, models } from "mongoose";

const feedSourceSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    url: { type: String, required: true, unique: true, trim: true, index: true },
    defaultCategory: { type: String, default: "Breaking News", index: true },
    active: { type: Boolean, default: true, index: true },
    autoPublish: { type: Boolean, default: false },
    lastFetchedAt: Date
  },
  { timestamps: true }
);

export const FeedSource = models.FeedSource || model("FeedSource", feedSourceSchema);
