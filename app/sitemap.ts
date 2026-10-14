import type { MetadataRoute } from "next";
import { q } from "@/lib/db";
import { INSTALL } from "@/lib/install";
import { SITE_URL } from "@/lib/site-url";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (INSTALL.singleFirm) return []; // a DPCO's own install has no public site
  const posts = await q("select slug, coalesce(updated_at, published_at) as at from blog_posts where status = 'published'");
  return [
    ...["", "/pricing", "/pilot", "/blog", "/privacy", "/terms"].map((p) => ({ url: SITE_URL + p })),
    ...posts.map((p) => ({ url: `${SITE_URL}/blog/${p.slug}`, lastModified: p.at })),
  ];
}
