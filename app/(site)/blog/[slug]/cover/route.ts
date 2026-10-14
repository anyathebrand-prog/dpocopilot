import { one } from "@/lib/db";

/** Cover image of a published post. Drafts' images are never served. */
export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await one<{ cover: Uint8Array; cover_mime: string }>("select cover, cover_mime from blog_posts where slug = $1 and status = 'published' and cover is not null", [slug]);
  if (!p) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(p.cover), {
    headers: { "content-type": p.cover_mime, "x-content-type-options": "nosniff", "cache-control": "public, max-age=300" },
  });
}
