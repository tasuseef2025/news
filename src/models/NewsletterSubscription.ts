import { Schema, model, models } from "mongoose";

const newsletterSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    name: String,
    status: { type: String, enum: ["subscribed", "unsubscribed"], default: "subscribed", index: true },
    source: String
  },
  { timestamps: true }
);

export const NewsletterSubscription =
  models.NewsletterSubscription || model("NewsletterSubscription", newsletterSchema);
