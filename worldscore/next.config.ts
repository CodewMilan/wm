import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Strict mode double-invokes effects in development. Here that would open a
  // second GPU session on every mount, against an account limited to five
  // concurrent sessions and billed per second.
  reactStrictMode: false,
  // Two dev servers sharing one build directory fight over the webpack cache
  // and trigger phantom Fast Refreshes in each other — which tears down a live
  // GPU session mid-connect. Set NEXT_DIST_DIR to run a second one safely.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
