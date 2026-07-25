import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Strict mode double-invokes effects in development. Here that would open a
  // second GPU session on every mount, against an account limited to five
  // concurrent sessions and billed per second.
  reactStrictMode: false,
};

export default nextConfig;
