import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fully static publication. Every issue and every leaf is prerendered
  // at build time; there is no server at runtime.
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
