import { absoluteUrl } from "@/lib/utils";

const lowRiskImageHosts = [
  "res.cloudinary.com",
  "images.unsplash.com",
  "images.pexels.com",
  "pixabay.com",
  "cdn.pixabay.com",
  "live.staticflickr.com",
  "upload.wikimedia.org",
  "commons.wikimedia.org",
  "www.nasa.gov",
  "assets.science.nasa.gov"
];

export function generatedOgImagePath(title = "Novexa News", category = "News") {
  return `/api/og?title=${encodeURIComponent(title)}&category=${encodeURIComponent(category)}`;
}

export function generatedOgImageUrl(title = "Novexa News", category = "News") {
  return absoluteUrl(generatedOgImagePath(title, category));
}

export function isLowRiskImageUrl(value = "") {
  if (!value) return false;
  if (value.startsWith("/")) return true;

  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    return lowRiskImageHosts.some((allowedHost) => host === allowedHost || host.endsWith(`.${allowedHost}`));
  } catch {
    return false;
  }
}

export function safeArticleImage({
  image,
  title,
  category
}: {
  image?: string;
  title: string;
  category: string;
}) {
  if (image && isLowRiskImageUrl(image)) return image;
  if (image && process.env.FEED_USE_SOURCE_IMAGES === "true") return image;
  return generatedOgImagePath(title, category);
}

export function safeArticleOgImage({
  image,
  title,
  category
}: {
  image?: string;
  title: string;
  category: string;
}) {
  const safeImage = safeArticleImage({ image, title, category });
  return safeImage.startsWith("/") ? absoluteUrl(safeImage) : safeImage;
}
