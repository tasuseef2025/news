import { Schema, model, models } from "mongoose";

const webVitalSchema = new Schema(
  {
    name: { type: String, required: true, index: true },
    value: { type: Number, required: true },
    rating: String,
    delta: Number,
    id: String,
    navigationType: String,
    path: String
  },
  { timestamps: true }
);

export const WebVital = models.WebVital || model("WebVital", webVitalSchema);
