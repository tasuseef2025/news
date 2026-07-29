import { Schema, model, models } from "mongoose";

const tipSchema = new Schema(
  {
    anonymous: { type: Boolean, default: false },
    name: { type: String, trim: true },
    email: { type: String, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    location: { type: String, trim: true },
    category: { type: String, trim: true, default: "News Tip" },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    media: [
      {
        url: { type: String, required: true, trim: true },
        type: { type: String, enum: ["image", "video", "other"], default: "other" },
        publicId: { type: String, trim: true }
      }
    ],
    status: { type: String, enum: ["new", "reviewing", "verified", "rejected"], default: "new", index: true },
    ipHash: { type: String, trim: true }
  },
  { timestamps: true }
);

tipSchema.index({ title: "text", description: "text", location: "text" });

export const Tip = models.Tip || model("Tip", tipSchema);

