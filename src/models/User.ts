import { Schema, model, models } from "mongoose";
import type { Role } from "@/types";

export type UserDocument = {
  name: string;
  email: string;
  password?: string;
  image?: string;
  role: Role;
};

const userSchema = new Schema<UserDocument>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, index: true },
    password: { type: String, select: false },
    image: String,
    role: {
      type: String,
      enum: ["super_admin", "admin", "editor", "author", "journalist", "moderator", "subscriber"],
      default: "subscriber"
    }
  },
  { timestamps: true }
);

export const User = models.User || model<UserDocument>("User", userSchema);
