import { Schema, model, models } from "mongoose";

const tagSchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true, index: true },
    slug: { type: String, required: true, unique: true, lowercase: true, index: true },
    description: String
  },
  { timestamps: true }
);

export const Tag = models.Tag || model("Tag", tagSchema);
