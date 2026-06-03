import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Pin the tracing root to this project (avoids inferring the wrong workspace).
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;

// `next dev` uses the local SQLite file (seeded). Cloudflare bindings (D1/R2)
// are provided by wrangler during `cf:preview` / `cf:deploy`.
