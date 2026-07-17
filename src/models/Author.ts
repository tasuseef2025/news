import { Schema, model, models } from "mongoose";

const authorSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    slug: { type: String, required: true, unique: true, lowercase: true, index: true },
    email: { type: String, lowercase: true, trim: true },
    bio: String,
    avatar: String,
    socialLinks: { type: Map, of: String },
    active: { type: Boolean, default: true, index: true }
  },
  { timestamps: true }
);

export const Author = models.Author || model("Author", authorSchema);
