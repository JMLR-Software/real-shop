import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export: `pnpm build` writes a plain HTML/CSS/JS site to ./out.
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
