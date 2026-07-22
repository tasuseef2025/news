import type { NextConfig } from "next";

const disableVercelImageOptimization = process.env.NEXT_IMAGE_UNOPTIMIZED !== "false";

const nextConfig: NextConfig = {
  output: "standalone",
  eslint: {
    ignoreDuringBuilds: true
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
