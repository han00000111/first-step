import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/*": ["./prisma/demo.db", "./prisma/schema.prisma", "./prisma/migrations/**/*"],
  },
};

export default nextConfig;
