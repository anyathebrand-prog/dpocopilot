import type { NextConfig } from "next";

const dev = process.env.NODE_ENV !== "production";
// Next inlines its bootstrap scripts and the app uses inline styles, so 'unsafe-inline' stays; dev also needs eval + the HMR websocket.
// shortcut: no nonce-based CSP, move to nonces if a pentest flags 'unsafe-inline'.
const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://db.onlinewebfonts.com",
  "font-src 'self' data: https://fonts.gstatic.com https://db.onlinewebfonts.com",
  "img-src 'self' data: blob:",
  "media-src 'self'",
  `connect-src 'self'${dev ? " ws: wss:" : ""}`,
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CSP },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  ...(dev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]),
];

const config: NextConfig = {
  output: "standalone", // Docker image for DPCO installs (Dockerfile, deploy/)
  // Uploads and the dev database live in ./data; never copy client files into build output.
  outputFileTracingExcludes: { "*": ["data/**"] },
  serverExternalPackages: ["@electric-sql/pglite", "pg", "unpdf", "exceljs", "docx"],
  turbopack: { root: __dirname },
  poweredByHeader: false,
  headers: async () => [{ source: "/:path*", headers: SECURITY_HEADERS }],
  experimental: {
    serverActions: { bodySizeLimit: "100mb" }, // training videos (lib/files.ts caps other files at 25 MB)
    // Off: on Windows the dev server is often force-stopped, which left this cache corrupt (every nested route 404ed).
    turbopackFileSystemCacheForDev: false,
  },
};

export default config;
