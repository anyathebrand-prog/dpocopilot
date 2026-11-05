import Link from "next/link";
import { CircleAlert, ArrowRight } from "lucide-react";
import { notFound } from "next/navigation";
import { signUp } from "@/lib/auth-actions";
import { signUpOpen } from "@/lib/install";
import { Submit } from "@/components/client";
import { DarkHeader } from "@/components/dark-header";
import { HomeFX, SplitHeading } from "@/components/home-motion";
import { Reveal } from "@/components/reveal";
import "@/components/site-base.css";
import "@/components/homepage.css";
import "@/components/site-pages.css";
import { INSTALL, headerBrand } from "@/lib/install";
import { NG_STATES } from "@/lib/solo-profile";

export const generateMetadata = () => ({ title: `Create a firm account · ${INSTALL.name}` });

// FLAG-1: sign-up is open in V1 by default. Make it invite-only here if pilot firms are set up by hand.
export default async function SignUp({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  if (!(await signUpOpen(sp.token ?? ""))) notFound();
  const solo = sp.plan === "solo";
  const req = <><em className="req" aria-hidden="true">*</em><span className="sr-only">(required)</span></>;
  return (
    <div className="bh" style={{ minHeight: "100dvh" }}>
      <HomeFX />
      <div className="bh-top"><DarkHeader brand={headerBrand} /></div>
      <main id="main" className="hp-card hp-bare hp-grid-bg">
        <div className="hp-inner">
          <div className="hp-head">
            <Reveal><span className="hp-kicker">Create account</span></Reveal>
            <SplitHeading as="h1" className="hp-h2 big" line1="Create your" line2={solo ? "Solo DPO account" : "firm workspace"} />
            <Reveal delay={0.3}><p className="hp-sub">{solo
              ? "Next you'll choose the DPCO firm you work under. They see these details and approve you before you start."
              : <>You&apos;ll be the firm&apos;s first Firm Admin, and can invite your team once you&apos;re in.</>}</p></Reveal>
          </div>

          <Reveal delay={0.25} className="sp-card sp-narrow">
            {sp.error && <div className="sp-error" role="alert"><CircleAlert aria-hidden />{sp.error}</div>}
            <form action={signUp}>
              {sp.token && <input type="hidden" name="token" value={sp.token} />}
              <label className="sp-field"><span>Your full name <em className="req" aria-hidden="true">*</em><span className="sr-only">(required)</span></span><input name="name" autoComplete="name" required /></label>
              <label className="sp-field"><span>Work email <em className="req" aria-hidden="true">*</em><span className="sr-only">(required)</span></span><input type="email" name="email" autoComplete="email" required /></label>
              <label className="sp-field"><span>Password <em>(required, at least 10 characters)</em></span><input type="password" name="password" autoComplete="new-password" minLength={10} required /></label>
              {!solo && <label className="sp-field"><span>Firm name {req}</span><input name="firm" autoComplete="organization" required /></label>}
              {solo && (
                <>
                  <input type="hidden" name="plan" value="solo" />
                  <label className="sp-field"><span>Phone number {req}</span><input type="tel" name="phone" autoComplete="tel" required /></label>
                  <label className="sp-field"><span>State {req}</span><select name="state" required defaultValue=""><option value="" disabled>Choose…</option>{NG_STATES.map((s) => <option key={s}>{s}</option>)}</select></label>
                  <label className="sp-field"><span>Years of experience in data protection {req}</span><input type="number" name="years_experience" min={0} max={60} required /></label>
                  <label className="sp-field"><span>Certification {req}</span><input name="certification" required placeholder="e.g. CDPO, NDPC-recognised DPO training" /></label>
                  <label className="sp-field"><span>Certificate {req} <em>(PDF, PNG or JPEG, up to 5 MB)</em></span><input type="file" name="cert_file" accept=".pdf,.png,.jpg,.jpeg" required /></label>
                  <label className="sp-field"><span>CV <em>(PDF, PNG or JPEG, up to 5 MB; or give your LinkedIn below)</em></span><input type="file" name="cv_file" accept=".pdf,.png,.jpg,.jpeg" /></label>
                  <label className="sp-field"><span>LinkedIn profile <em>(or upload your CV above)</em></span><input type="url" name="linkedin" placeholder="https://www.linkedin.com/in/…" /></label>
                </>
              )}
              <div className="sp-submit"><Submit className="btn-cta">{solo ? "Create account" : "Create firm"} <ArrowRight aria-hidden /></Submit></div>
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
