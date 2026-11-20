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
  // The art is already small WebP, so skip Vercel's image optimizer: its free tier caps
  // transformations per month, and resizing these gains almost nothing.
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
