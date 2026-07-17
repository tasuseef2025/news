import { Schema, model, models } from "mongoose";

const mediaSchema = new Schema(
  {
    url: { type: String, required: true },
    publicId: String,
    type: { type: String, enum: ["image", "video", "file"], default: "image", index: true },
    title: String,
    alt: String,
    caption: String,
    size: Number,
    width: Number,
    height: Number,
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

export const Media = models.Media || model("Media", mediaSchema);
