import Link from "next/link";
import { CircleAlert, CircleCheck, ArrowRight } from "lucide-react";
import { signIn } from "@/lib/auth-actions";
import { Submit } from "@/components/client";
import { DarkHeader } from "@/components/dark-header";
import { AnimatedHeading, HomeFX } from "@/components/home-motion";
import { Reveal } from "@/components/reveal";
import "@/components/home.css";
import "@/components/pricing-dark.css";
import "@/components/pilot-dark.css";
import "@/components/auth-dark.css";

export const metadata = { title: "Sign in · DPO Copilot" };

export default async function SignIn({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  return (
    <div className="hm pd au">
      <HomeFX />
      <div className="pd-top"><DarkHeader /></div>
      <main id="main" className="au-main">
        <Reveal><span className="hm-pill">Workspace</span></Reveal>
        <AnimatedHeading as="h1" className="hm-h2 big au-h1" text="Sign in" />
        <Reveal delay={0.15}><p className="hm-lead au-lead">Welcome back. Sign in to your firm&apos;s workspace or your client portal.</p></Reveal>

        <Reveal delay={0.25} className="hm-tile au-card">
          {sp.error && <div className="pv-error" role="alert"><CircleAlert aria-hidden />{sp.error}</div>}
          {sp.ok && <div className="au-ok" role="status"><CircleCheck aria-hidden />{sp.ok}</div>}
          <form action={signIn}>
            <label className="pv-field"><span>Email</span><input type="email" name="email" autoComplete="email" required /></label>
            <label className="pv-field"><span>Password</span><input type="password" name="password" autoComplete="current-password" required /></label>
            <div className="pv-submit au-submit"><Submit className="hm-btn">Sign in <ArrowRight aria-hidden /></Submit></div>
          </form>
        </Reveal>

        <Reveal delay={0.35}>
          <p className="au-alt">New DPCO firm? <Link href="/sign-up">Create a firm account</Link> or <Link href="/pilot">request pilot access</Link>.</p>
        </Reveal>
      </main>
    </div>
  );
}
