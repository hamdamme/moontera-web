import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/application/*": [
      "./assets/application-reference.pdf",
      "./public/fonts/Geist-Regular.ttf",
    ],
  },
};

export default nextConfig;
