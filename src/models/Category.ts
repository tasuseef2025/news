import { Schema, model, models } from "mongoose";

const categorySchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true, index: true },
    slug: { type: String, required: true, unique: true, lowercase: true, index: true },
    description: String,
    parent: String,
    image: String,
    active: { type: Boolean, default: true, index: true },
    order: { type: Number, default: 0 }
  },
  { timestamps: true }
);

export const Category = models.Category || model("Category", categorySchema);
