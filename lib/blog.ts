"use server";
import { redirect } from "next/navigation";
import { one, q } from "./db";
import { requireSecretary, audit } from "./auth";
import { str, flash } from "./form";

// Public blog, written by the Secretary. Posts are drafts until published; the public site shows published posts only.

const COVER_MAX = 2 * 1024 * 1024;
/** Image type from the file's first bytes, never from its name or the browser's claim. */
function imageType(b: Buffer) {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (b.subarray(0, 4).toString() === "RIFF" && b.subarray(8, 12).toString() === "WEBP") return "image/webp";
  return null;
}

async function uniqueSlug(title: string) {
  const base = title.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "post";
  for (let n = 1; ; n++) {
    const slug = n === 1 ? base : `${base}-${n}`;
    if (!(await one("select 1 from blog_posts where slug = $1", [slug]))) return slug;
  }
}

export async function savePost(fd: FormData) {
  const u = await requireSecretary();
  const id = str(fd, "id"), title = str(fd, "title");
  const back = `/secretary/blog/${id || "new"}`;
  if (!title) redirect(flash(back, "Enter a title.", "error"));
  const file = fd.get("cover");
  let cover: { bytes: Buffer; mime: string } | null = null;
  if (file instanceof File && file.size > 0) {
    if (file.size > COVER_MAX) redirect(flash(back, "Cover image must be 2 MB or smaller.", "error"));
    const bytes = Buffer.from(await file.arrayBuffer()), mime = imageType(bytes);
    if (!mime) redirect(flash(back, "Cover image must be a JPG, PNG or WebP file.", "error"));
    cover = { bytes, mime };
  }
  const removeCover = fd.get("remove_cover") === "on";
  const vals = [title, str(fd, "summary"), str(fd, "body")];
  let postId = id;
  if (id) {
    const r = await one(`update blog_posts set title = $2, summary = $3, body = $4,
        cover = case when $5::bytea is not null then $5::bytea when $7 then null else cover end,
        cover_mime = case when $5::bytea is not null then $6 when $7 then null else cover_mime end, updated_at = now()
      where id = $1 returning id`, [id, ...vals, cover?.bytes ?? null, cover?.mime ?? null, removeCover]);
    if (!r) redirect("/secretary/blog");
  } else {
    // The slug is fixed at creation so published links never break when a title is edited.
    const r = await one("insert into blog_posts (slug, title, summary, body, cover, cover_mime, created_by) values ($1,$2,$3,$4,$5,$6,$7) returning id",
      [await uniqueSlug(title), ...vals, cover?.bytes ?? null, cover?.mime ?? null, u.id]);
    postId = r!.id;
  }
  await audit(u, id ? "update" : "create", "blog_post", postId, { firm_id: null });
  redirect(flash(`/secretary/blog/${postId}`, "Post saved"));
}

export async function setPostStatus(fd: FormData) {
  const u = await requireSecretary();
  const id = str(fd, "id"), publish = str(fd, "op") === "publish";
  await q("update blog_posts set status = $2, published_at = case when $3 then coalesce(published_at, now()) else published_at end, updated_at = now() where id = $1",
    [id, publish ? "published" : "draft", publish]);
  await audit(u, publish ? "publish" : "unpublish", "blog_post", id, { firm_id: null });
  redirect(flash(`/secretary/blog/${id}`, publish ? "Published. It's live on the blog." : "Unpublished. It's back to draft."));
}

export async function deletePost(fd: FormData) {
  const u = await requireSecretary();
  const id = str(fd, "id");
  await q("delete from blog_posts where id = $1", [id]);
  await audit(u, "delete", "blog_post", id, { firm_id: null });
  redirect(flash("/secretary/blog", "Post deleted"));
}
