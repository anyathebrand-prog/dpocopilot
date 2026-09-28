import Link from "next/link";
import { CircleAlert, ArrowRight } from "lucide-react";
import { signUp } from "@/lib/auth-actions";
import { Submit } from "@/components/client";
import { DarkHeader } from "@/components/dark-header";
import { HomeFX, SplitHeading } from "@/components/home-motion";
import { Reveal } from "@/components/reveal";
import "@/components/site-base.css";
import "@/components/homepage.css";
import "@/components/site-pages.css";

export const metadata = { title: "Create a firm account · DPO Copilot" };

// FLAG-1: sign-up is open in V1 by default. Make it invite-only here if pilot firms are set up by hand.
export default async function SignUp({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  return (
    <div className="bh" style={{ minHeight: "100dvh" }}>
      <HomeFX />
      <div className="bh-top"><DarkHeader /></div>
      <main id="main" className="hp-card hp-bare hp-grid-bg">
        <div className="hp-inner">
          <div className="hp-head">
            <Reveal><span className="hp-kicker">Create account</span></Reveal>
            <SplitHeading as="h1" className="hp-h2 big" line1="Create your" line2="firm workspace" />
            <Reveal delay={0.3}><p className="hp-sub">You&apos;ll be the firm&apos;s first Firm Admin, and can invite your team once you&apos;re in.</p></Reveal>
          </div>

          <Reveal delay={0.25} className="sp-card sp-narrow">
            {sp.error && <div className="sp-error" role="alert"><CircleAlert aria-hidden />{sp.error}</div>}
            <form action={signUp}>
              <label className="sp-field"><span>Your full name <em>(required)</em></span><input name="name" autoComplete="name" required /></label>
              <label className="sp-field"><span>Work email <em>(required)</em></span><input type="email" name="email" autoComplete="email" required /></label>
              <label className="sp-field"><span>Password <em>(required, at least 10 characters)</em></span><input type="password" name="password" autoComplete="new-password" minLength={10} required /></label>
              <label className="sp-field"><span>Firm name <em>(required)</em></span><input name="firm" autoComplete="organization" required /></label>
              <div className="sp-submit"><Submit className="btn-cta">Create firm <ArrowRight aria-hidden /></Submit></div>
            </form>
          </Reveal>

          <Reveal delay={0.35}>
            <p className="sp-alt">Already have an account? <Link href="/sign-in">Sign in</Link></p>
          </Reveal>
        </div>
      </main>
    </div>
  );
}
