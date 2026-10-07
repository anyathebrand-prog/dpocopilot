import Link from "next/link";
import { redirect } from "next/navigation";
import { one } from "@/lib/db";
import { savePost, setPostStatus, deletePost } from "@/lib/blog";
import { Flash, Field, Hidden, Chip } from "@/components/ui";
import { Submit, Confirm } from "@/components/client";

export default async function EditPost({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>> }) {
  const { id } = await params;
  const sp = await searchParams;
  const isNew = id === "new";
  const p = isNew ? null : await one("select id, slug, title, summary, body, status, cover_mime is not null as has_cover from blog_posts where id = $1", [/^[0-9a-f-]{36}$/.test(id) ? id : null]);
  if (!isNew && !p) redirect("/secretary/blog");
  const h = <Hidden values={{ id: p?.id }} />;
  return (
    <>
      <nav className="meta" aria-label="Breadcrumb"><Link href="/secretary/blog">Blog</Link> / {isNew ? "New post" : p!.title}</nav>
      <h1 style={{ marginTop: 8 }}>{isNew ? "New post" : p!.title} {p && <Chip status={p.status === "published" ? "approved" : "draft"} />}</h1>
      <Flash sp={sp} />
      <form action={savePost} className="panel" style={{ maxWidth: 820 }}>{h}
        <Field label="Title" required><input name="title" defaultValue={p?.title ?? ""} required maxLength={160} /></Field>
        <Field label="Summary" help="One or two sentences. Shown on the blog list and in search results."><textarea name="summary" defaultValue={p?.summary ?? ""} rows={2} maxLength={300} /></Field>
        <Field label="Body" help={'Start a line with "## " for a heading or "- " for a bullet point. Leave a blank line between paragraphs.'}>
          <textarea name="body" defaultValue={p?.body ?? ""} rows={18} />
        </Field>
        <Field label="Cover image" help="Optional. JPG, PNG or WebP, up to 2 MB. Wide images (about 1600 × 900) look best.">
          <input type="file" name="cover" accept=".jpg,.jpeg,.png,.webp" />
        </Field>
        {p?.has_cover && <label className="check"><input type="checkbox" name="remove_cover" />Remove the current cover image</label>}
        <div className="row"><Submit>Save</Submit>{p?.status === "published" && <a className="btn secondary" href={`/blog/${p.slug}`} target="_blank">View on site</a>}</div>
      </form>
      {p && (
        <div className="row" style={{ marginTop: 16 }}>
          <form action={setPostStatus}>{h}
            {p.status === "published"
              ? <Submit className="btn secondary" name="op" value="unpublish">Unpublish</Submit>
              : <Submit name="op" value="publish">Publish</Submit>}
          </form>
          <Confirm action={deletePost} title="Delete this post?" body="It is removed from the blog and can't be recovered." label="Delete post">{h}</Confirm>
        </div>
      )}
    </>
  );
}
