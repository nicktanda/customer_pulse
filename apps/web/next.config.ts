import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@customer-pulse/db"],
};

export default nextConfig;
