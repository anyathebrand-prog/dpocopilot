import type { NextConfig } from "next";

const config: NextConfig = {
  serverExternalPackages: ["@electric-sql/pglite"],
  turbopack: { root: __dirname },
  experimental: { serverActions: { bodySizeLimit: "25mb" } },
};

export default config;
