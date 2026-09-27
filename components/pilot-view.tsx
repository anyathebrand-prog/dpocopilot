"use client";
import Link from "next/link";
import { useState } from "react";
import { motion, MotionConfig, type Variants } from "framer-motion";
import { Stamp, CircleAlert, ArrowRight } from "lucide-react";
import { PricingScene } from "./pricing-scene";
import { AnimatedHeading } from "./home-motion";
import { Reveal } from "./reveal";
import { Submit } from "./client";

const ease = [0.22, 1, 0.36, 1] as const;
const list: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.3 } } };
const item: Variants = { hidden: { opacity: 0, y: 14, filter: "blur(4px)" }, show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.5, ease } } };

const STEPS: [string, string][] = [
  ["Tell us about your practice", "A few details so we understand your firm and your clients."],
  ["We set up your workspace", "Your firm account, with your team in the right roles."],
  ["Bring your clients", "Import your existing registers and invite client contacts to their portal."],
];
const SIZES = ["1–5", "6–20", "21–50", "More than 50"];

export function PilotView({ action, ok, error }: { action: (fd: FormData) => Promise<void>; ok?: string; error?: string }) {
  const [size, setSize] = useState("");
  return (
    <MotionConfig reducedMotion="user">
      <div className="pv-grid">
        <aside className="hm-tile pv-panel">
          <Reveal><span className="hm-pill">Pilot</span></Reveal>
          <AnimatedHeading as="h1" className="hm-h2 big pv-h1" text="Join the pilot" />
          <Reveal delay={0.2}><p className="hm-lead">We&apos;re onboarding a small group of DPCO firms and setting each one up personally.</p></Reveal>
          <PricingScene />
          <h2 className="pv-h2">What happens next</h2>
          <ol className="pv-steps">
            <motion.span className="pv-line" initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ duration: 1.2, ease, delay: 0.6 }} aria-hidden />
            {STEPS.map(([t, d], i) => (
              <motion.li key={t} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, ease, delay: 0.7 + i * 0.25 }}>
                <motion.span className="pv-num" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400, damping: 18, delay: 0.7 + i * 0.25 }}><span>{i + 1}</span></motion.span>
                <div><b>{t}</b><p>{d}</p></div>
              </motion.li>
            ))}
          </ol>
        </aside>

        <div className="hm-tile pv-card">
          {ok ? (
            <div className="pv-done" role="status">
              <div className="pv-seal-wrap">
                <motion.span className="hm-ripple" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: [0.6, 1.6], opacity: [0.7, 0] }} transition={{ delay: 0.35, duration: 0.9, ease: "easeOut" }} />
                <motion.div className="pv-seal" initial={{ scale: 1.6, opacity: 0, rotate: -12 }} animate={{ scale: 1, opacity: 1, rotate: -4 }} transition={{ type: "spring", stiffness: 260, damping: 14, delay: 0.1 }}>
                  <Stamp aria-hidden /><span>Request received</span>
                </motion.div>
              </div>
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.5, ease }}>
                <h2 className="hm-h2 pv-thanks">Thank you</h2>
                <p className="hm-lead">{ok}</p>
                <div className="hm-actions pv-actions"><Link href="/" className="hm-btn">Back to home <ArrowRight aria-hidden /></Link><Link href="/pricing" className="hm-btn dark">See pricing</Link></div>
              </motion.div>
            </div>
          ) : (
            <motion.form action={action} variants={list} initial="hidden" animate="show" className="pv-form">
              <motion.h2 variants={item} className="pv-form-title">Request pilot access</motion.h2>
              {error && <motion.div variants={item} className="pv-error" role="alert"><CircleAlert aria-hidden />{error}</motion.div>}
              <motion.label variants={item} className="pv-field"><span>Your name <em>(required)</em></span><input name="name" autoComplete="name" required /></motion.label>
              <motion.label variants={item} className="pv-field"><span>Work email <em>(required)</em></span><input type="email" name="email" autoComplete="email" required /></motion.label>
              <motion.label variants={item} className="pv-field"><span>Firm name <em>(required)</em></span><input name="firm" autoComplete="organization" required /></motion.label>
              <motion.fieldset variants={item} className="pv-field">
                <legend>How many client organisations do you manage?</legend>
                <div className="pv-sizes">
                  {SIZES.map((s) => (
                    <label key={s} className={`pv-size ${size === s ? "on" : ""}`}>
                      <input type="radio" name="client_count" value={s} checked={size === s} onChange={() => setSize(s)} />
                      {size === s && <motion.span layoutId="pv-size-pill" className="pv-size-bg" transition={{ type: "spring", stiffness: 500, damping: 35 }} />}
                      <span className="pv-size-text">{s}</span>
                    </label>
                  ))}
                </div>
              </motion.fieldset>
              <motion.label variants={item} className="pv-field"><span>Phone number</span><input type="tel" name="phone" autoComplete="tel" /></motion.label>
              <motion.label variants={item} className="pv-field"><span>Anything we should know?</span><textarea name="message" /></motion.label>
              <div aria-hidden="true" style={{ position: "absolute", left: -9999 }}><label>Website <input name="website" tabIndex={-1} autoComplete="off" /></label></div>
              <motion.p variants={item} className="pv-note">We use these details only to contact you about the pilot. See our <Link href="/privacy">privacy notice</Link>.</motion.p>
              <motion.div variants={item} whileTap={{ scale: 0.98 }} className="pv-submit"><Submit className="hm-btn">Request pilot access</Submit></motion.div>
            </motion.form>
          )}
        </div>
      </div>
    </MotionConfig>
  );
}
