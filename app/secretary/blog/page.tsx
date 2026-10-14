import Link from "next/link";
import { q } from "@/lib/db";
import { fmtWAT } from "@/lib/rules";
import { Flash, PageHead, Chip, Empty } from "@/components/ui";

export default async function BlogAdmin({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const posts = await q("select id, slug, title, status, published_at, updated_at from blog_posts order by coalesce(published_at, updated_at) desc");
  return (
    <>
      <PageHead title="Blog" sub="Posts on the public website. Drafts are only visible here."><Link className="btn" href="/secretary/blog/new">New post</Link></PageHead>
      <Flash sp={sp} />
      {posts.length === 0 ? <Empty><p>No posts yet.</p></Empty> : posts.map((p) => (
        <div key={p.id} className="rule-row info">
          <span><Link href={`/secretary/blog/${p.id}`}><b>{p.title}</b></Link>
            <div className="meta">{p.status === "published" ? <>Published {fmtWAT(p.published_at)} · <a href={`/blog/${p.slug}`} target="_blank">View on site</a></> : `Last edited ${fmtWAT(p.updated_at)}`}</div></span>
          <Chip status={p.status === "published" ? "approved" : "draft"} />
        </div>
      ))}
    </>
  );
}
