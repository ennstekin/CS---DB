import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.myikas.com",
      },
    ],
  },
};

export default nextConfig;
