import { Schema, model, models } from "mongoose";
import type { Advertisement as AdvertisementType } from "@/types";

export type AdvertisementDocument = Omit<AdvertisementType, "_id" | "createdAt" | "updatedAt">;

const advertisementSchema = new Schema<AdvertisementDocument>(
  {
    title: { type: String, required: true, trim: true },
    placement: { type: String, enum: ["top", "middle", "sidebar", "footer"], required: true, index: true },
    image: String,
    href: String,
    sponsor: String,
    revenue: { type: Number, default: 0 },
    active: { type: Boolean, default: true, index: true }
  },
  { timestamps: true }
);

export const Advertisement =
  models.Advertisement || model<AdvertisementDocument>("Advertisement", advertisementSchema);
