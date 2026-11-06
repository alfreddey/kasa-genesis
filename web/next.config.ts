import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Self-contained server build, ready for the Docker image (#5).
  output: "standalone",
};

export default nextConfig;
