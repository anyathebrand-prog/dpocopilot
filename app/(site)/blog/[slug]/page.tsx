import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { one } from "@/lib/db";
import { DarkHeader } from "@/components/dark-header";
import { Doc } from "@/components/ui";
import { fmtWAT } from "@/lib/rules";
import "@/components/site-base.css";
import "@/components/homepage.css";
import "@/components/site-pages.css";
import "@/components/blog.css";

const post = (slug: string) => one("select slug, title, summary, body, published_at, cover_mime is not null as has_cover from blog_posts where slug = $1 and status = 'published'", [slug]);

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const p = await post((await params).slug);
  return p ? { title: `${p.title} · DPO Copilot`, description: p.summary || undefined } : {};
}

export default async function Post({ params }: { params: Promise<{ slug: string }> }) {
  const p = await post((await params).slug);
  if (!p) notFound();
  return (
    <div className="bh">
      <div className="bh-top"><DarkHeader /></div>
      <section className="hp-card hp-bare">
        <div className="hp-inner blog-post">
          <Link href="/blog" className="blog-back"><ArrowLeft aria-hidden />All posts</Link>
          <span className="blog-date">{fmtWAT(p.published_at).replace(/,? \d{2}:\d{2} WAT$/, "")}</span>
          <h1>{p.title}</h1>
          {p.summary && <p className="blog-lede">{p.summary}</p>}
          {/* eslint-disable-next-line @next/next/no-img-element -- stored cover, any size */}
          {p.has_cover && <img className="blog-cover" src={`/blog/${p.slug}/cover`} alt="" />}
          <Doc body={p.body} bare className="blog-body" />
        </div>
      </section>
    </div>
  );
}
