import type { NextConfig } from "next";

const config: NextConfig = {
  output: "standalone", // Docker image for DPCO installs (Dockerfile, deploy/)
  // Uploads and the dev database live in ./data; never copy client files into build output.
  outputFileTracingExcludes: { "*": ["data/**"] },
  serverExternalPackages: ["@electric-sql/pglite", "pg", "unpdf", "exceljs"],
  turbopack: { root: __dirname },
  experimental: {
    serverActions: { bodySizeLimit: "25mb" },
    // Off: on Windows the dev server is often force-stopped, which left this cache corrupt (every nested route 404ed).
    turbopackFileSystemCacheForDev: false,
  },
};

export default config;
