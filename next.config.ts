import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Pin the tracing root to this project (avoids inferring the wrong workspace).
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
