"use client";

import Image, { type ImageProps } from "next/image";
import { useEffect, useMemo, useState } from "react";
import { generatedOgImagePath } from "@/lib/article-images";

type ArticleImageProps = Omit<ImageProps, "src" | "alt"> & {
  src?: string;
  alt?: string;
  title: string;
  category: string;
};

export function ArticleImage({ src, alt, title, category, onError, ...props }: ArticleImageProps) {
  const fallback = useMemo(() => generatedOgImagePath(title, category), [category, title]);
  const [currentSrc, setCurrentSrc] = useState(src || fallback);

  useEffect(() => {
    setCurrentSrc(src || fallback);
  }, [fallback, src]);

  return (
    <Image
      {...props}
      src={currentSrc}
      alt={alt || title}
      onError={(event) => {
        onError?.(event);
        if (currentSrc !== fallback) setCurrentSrc(fallback);
      }}
    />
  );
}
