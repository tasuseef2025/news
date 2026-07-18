import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { siteUrl } from "@/lib/site";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function absoluteUrl(path = "") {
  return siteUrl(path);
}
