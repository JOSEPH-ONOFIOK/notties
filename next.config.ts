import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every page is per-player (session cookie), so nothing is statically cached.
  cacheComponents: false,
  serverExternalPackages: ["@electric-sql/pglite", "pg"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: {
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
