import type { MetadataRoute } from "next";
import { INSTALL } from "@/lib/install";
import { SITE_URL } from "@/lib/site-url";

export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  if (INSTALL.singleFirm) return { rules: { userAgent: "*", disallow: "/" } };
  // AI crawlers (GPTBot, ClaudeBot, PerplexityBot) are covered by "*".
  return { rules: { userAgent: "*", allow: "/", disallow: ["/app", "/portal", "/secretary", "/account", "/export", "/api"] }, sitemap: `${SITE_URL}/sitemap.xml` };
}
