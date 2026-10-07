import type { NextConfig } from "next";

const config: NextConfig = {
  output: "standalone", // Docker image for DPCO installs (Dockerfile, deploy/)
  // Uploads and the dev database live in ./data; never copy client files into build output.
  outputFileTracingExcludes: { "*": ["data/**"] },
  serverExternalPackages: ["@electric-sql/pglite", "pg"],
  turbopack: { root: __dirname },
  experimental: { serverActions: { bodySizeLimit: "25mb" } },
};

export default config;
