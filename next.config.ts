import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every page is per-player (session cookie), so nothing is statically cached.
  cacheComponents: false,
  serverExternalPackages: ["@electric-sql/pglite", "pg"],
  // PGlite loads its WASM/data files at runtime; make sure they ship with the server functions.
  outputFileTracingIncludes: { "/**": ["./node_modules/@electric-sql/pglite/dist/**/*"] },
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
