import Link from "next/link";
import { CircleAlert, CircleCheck, ArrowRight } from "lucide-react";
import { signIn } from "@/lib/auth-actions";
import { Submit } from "@/components/client";
import { DarkHeader } from "@/components/dark-header";
import { HomeFX, SplitHeading } from "@/components/home-motion";
import { Reveal } from "@/components/reveal";
import "@/components/site-base.css";
import "@/components/homepage.css";
import "@/components/site-pages.css";

export const metadata = { title: "Sign in · DPO Copilot" };

export default async function SignIn({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  return (
    <div className="bh" style={{ minHeight: "100dvh" }}>
      <HomeFX />
      <div className="bh-top"><DarkHeader /></div>
      <main id="main" className="hp-card hp-bare hp-grid-bg">
        <div className="hp-inner">
          <div className="hp-head">
            <Reveal><span className="hp-kicker">Workspace</span></Reveal>
            <SplitHeading as="h1" className="hp-h2 big" line1="Sign in" line2="to your workspace" />
            <Reveal delay={0.3}><p className="hp-sub">Your firm&apos;s workspace or your client portal.</p></Reveal>
          </div>

          <Reveal delay={0.25} className="sp-card sp-narrow">
            {sp.error && <div className="sp-error" role="alert"><CircleAlert aria-hidden />{sp.error}</div>}
            {sp.ok && <div className="sp-ok" role="status"><CircleCheck aria-hidden />{sp.ok}</div>}
            <form action={signIn}>
              <label className="sp-field"><span>Email</span><input type="email" name="email" autoComplete="email" required /></label>
              <label className="sp-field"><span>Password</span><input type="password" name="password" autoComplete="current-password" required /></label>
              <div className="sp-submit"><Submit className="btn-cta">Sign in <ArrowRight aria-hidden /></Submit></div>
            </form>
          </Reveal>

          <Reveal delay={0.35}>
            <p className="sp-alt">New DPCO firm? <Link href="/sign-up">Create a firm account</Link> or <Link href="/pilot">request pilot access</Link>.</p>
          </Reveal>
        </div>
      </main>
    </div>
  );
}
