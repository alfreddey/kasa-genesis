import type { NextConfig } from "next";

// When API_INTERNAL_URL is set (the Docker image sets it to http://api:8000), the web server
// forwards /api/v1/* to the API, so the browser only talks to this origin: one port, no CORS.
// Next.js reads this at build time, so it is a build argument in web/Dockerfile.
const apiInternalUrl = process.env.API_INTERNAL_URL?.replace(/\/+$/, "");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Self-contained server build, used by web/Dockerfile (#5).
  output: "standalone",
  experimental: {
    // The first narration of a story can take minutes while the model downloads.
    proxyTimeout: 300_000,
  },
  async rewrites() {
    if (!apiInternalUrl) return [];
    return [{ source: "/api/v1/:path*", destination: `${apiInternalUrl}/api/v1/:path*` }];
  },
};

export default nextConfig;
