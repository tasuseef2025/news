import type { Metadata } from "next";
import { siteConfig } from "@/lib/site";
import { absoluteUrl } from "@/lib/utils";

type StaticPageMetadataInput = {
  title: string;
  description: string;
  path: string;
  ogTitle?: string;
  ogImageTitle?: string;
  ogCategory?: string;
};

export function staticPageMetadata({
  title,
  description,
  path,
  ogTitle,
  ogImageTitle,
  ogCategory = "News"
}: StaticPageMetadataInput): Metadata {
  const canonical = absoluteUrl(path);
  const image = absoluteUrl(`/api/og?title=${encodeURIComponent(ogImageTitle || title)}&category=${encodeURIComponent(ogCategory)}`);
  const socialTitle = ogTitle || `${title} | ${siteConfig.name}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title: socialTitle,
      description,
      url: canonical,
      siteName: siteConfig.name,
      type: "website",
      images: [{ url: image, width: 1200, height: 630, alt: title }]
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description,
      images: [image]
    }
  };
}
