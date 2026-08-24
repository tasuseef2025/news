import type { NextConfig } from "next";
import duplicateRedirects from "./src/lib/duplicate-redirects.json";

const disableVercelImageOptimization = process.env.NEXT_IMAGE_UNOPTIMIZED !== "false";

const nextConfig: NextConfig = {
  output: "standalone",
  eslint: {
    ignoreDuringBuilds: true
  },
  async redirects() {
    return [
      { source: "/category/latest", destination: "/latest", permanent: true },
      ...duplicateRedirects.map((redirect) => ({
        source: redirect.source,
        destination: redirect.destination,
        permanent: true
      }))
    ];
  },
  images: {
    unoptimized: disableVercelImageOptimization,
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 86400,
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" }
    ]
  }
};

export default nextConfig;
