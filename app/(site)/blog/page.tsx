import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { q } from "@/lib/db";
import { DarkHeader } from "@/components/dark-header";
import { Reveal } from "@/components/reveal";
import { HomeFX, SplitHeading } from "@/components/home-motion";
import { fmtWAT } from "@/lib/rules";
import "@/components/site-base.css";
import "@/components/homepage.css";
import "@/components/site-pages.css";
import "@/components/blog.css";

export const metadata = { title: "Blog · DPO Copilot", description: "Practical notes on NDPA 2023 compliance for Nigerian DPCOs." };

const day = (d: Date) => fmtWAT(d).replace(/,? \d{2}:\d{2} WAT$/, "");

export default async function Blog() {
  const posts = await q("select slug, title, summary, published_at, cover_mime is not null as has_cover from blog_posts where status = 'published' order by published_at desc");
  return (
    <div className="bh">
      <HomeFX />
      <div className="bh-top"><DarkHeader /></div>
      <section className="hp-card hp-bare hp-grid-bg">
        <div className="hp-inner">
          <div className="hp-head">
            <Reveal><span className="hp-kicker">Blog</span></Reveal>
            <SplitHeading as="h1" className="hp-h2 big" line1="Notes on" line2="NDPA compliance" />
            <Reveal delay={0.3}><p className="hp-sub">Practical guidance for DPCOs and the organisations they look after.</p></Reveal>
          </div>
          {posts.length === 0 ? <Reveal className="sp-card"><p>No posts yet. Check back soon.</p></Reveal> : (
            <div className="blog-grid">
              {posts.map((p, i) => (
                <Reveal key={p.slug} delay={Math.min(i, 5) * 0.06} className="blog-card">
                  <Link href={`/blog/${p.slug}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- stored cover, any size */}
                    {p.has_cover && <img src={`/blog/${p.slug}/cover`} alt="" loading="lazy" />}
                    <span className="blog-date">{day(p.published_at)}</span>
                    <h2>{p.title}</h2>
                    {p.summary && <p>{p.summary}</p>}
                    <span className="blog-more">Read <ArrowRight aria-hidden /></span>
                  </Link>
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
