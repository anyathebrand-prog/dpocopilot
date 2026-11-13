"use client";
import Link from "next/link";
import { useState } from "react";
import { motion, MotionConfig, type Variants } from "framer-motion";
import { Mail, ShieldCheck, Rocket, FileDown, CircleAlert, ArrowRight, Send } from "lucide-react";
import { Submit } from "./client";
import { TOPICS } from "@/lib/contact-topics";

const ease = [0.22, 1, 0.36, 1] as const;
const list: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.3 } } };
const item: Variants = { hidden: { opacity: 0, y: 14, filter: "blur(4px)" }, show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.5, ease } } };

/** Contact page: a card with the ways to reach us, and a card with the message form (or the sent confirmation). */
export function ContactView({ action, ok, error }: { action: (fd: FormData) => Promise<void>; ok?: string; error?: string }) {
  const [topic, setTopic] = useState("sales");
  return (
    <MotionConfig reducedMotion="user">
      <div className="sp-pilot">
        <aside className="sp-card ct-ways">
          <h2 className="sp-card-title">Other ways to reach us</h2>
          <ul className="ct-list">
            <li><span className="ct-ic"><Mail aria-hidden /></span><div><b>Email</b><p>For sales, support and anything else.</p><a href="mailto:info@dpocopilot.ng">info@dpocopilot.ng</a></div></li>
            <li><span className="ct-ic"><ShieldCheck aria-hidden /></span><div><b>Data Protection Officer</b><p>Questions about how we handle personal data, or to exercise your rights.</p><a href="mailto:dpo@dpocopilot.ng">dpo@dpocopilot.ng</a></div></li>
            <li><span className="ct-ic"><Rocket aria-hidden /></span><div><b>Join the pilot</b><p>DPCO firms we set up personally, with their first year free.</p><Link href="/pilot">Request pilot access <ArrowRight aria-hidden /></Link></div></li>
            <li><span className="ct-ic"><FileDown aria-hidden /></span><div><b>Brochure</b><p>What DPO Copilot does, in a short PDF.</p><a href="/downloads/dpo-copilot-brochure.pdf" download>Download the brochure</a></div></li>
          </ul>
          <p className="ct-meta">We reply within one working day, Monday to Friday.</p>
        </aside>

        <div className="sp-card">
          {ok ? (
            <div className="sp-done" role="status">
              <div className="sp-seal-wrap">
                <motion.span className="sp-ripple" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: [0.6, 1.6], opacity: [0.7, 0] }} transition={{ delay: 0.35, duration: 0.9, ease: "easeOut" }} />
                <motion.div className="sp-seal" initial={{ scale: 1.6, opacity: 0, rotate: -12 }} animate={{ scale: 1, opacity: 1, rotate: -4 }} transition={{ type: "spring", stiffness: 260, damping: 14, delay: 0.1 }}>
                  <Send aria-hidden /><span>Message sent</span>
                </motion.div>
              </div>
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.5, ease }}>
                <h2>Thank you</h2>
                <p>{ok}</p>
                <div className="hp-actions"><Link href="/" className="btn-cta">Back to home</Link><Link href="/pricing" className="hp-ghost">See pricing <ArrowRight aria-hidden /></Link></div>
              </motion.div>
            </div>
          ) : (
            <motion.form action={action} variants={list} initial="hidden" animate="show">
              <motion.h2 variants={item} className="sp-card-title">Send us a message</motion.h2>
              {error && <motion.div variants={item} className="sp-error" role="alert"><CircleAlert aria-hidden />{error}</motion.div>}
              <motion.fieldset variants={item} className="sp-field">
                <legend>What is it about?</legend>
                <div className="sp-sizes">
                  {TOPICS.map(([k, l]) => (
                    <label key={k} className={`sp-size ${topic === k ? "on" : ""}`}>
                      <input type="radio" name="topic" value={k} checked={topic === k} onChange={() => setTopic(k)} />
                      {topic === k && <motion.span layoutId="ct-topic-pill" className="sp-size-bg" transition={{ type: "spring", stiffness: 500, damping: 35 }} />}
                      <span className="sp-size-text">{l}</span>
                    </label>
                  ))}
                </div>
              </motion.fieldset>
              <motion.label variants={item} className="sp-field"><span>Your name <em className="req" aria-hidden="true">*</em><span className="sr-only">(required)</span></span><input name="name" autoComplete="name" required /></motion.label>
              <motion.label variants={item} className="sp-field"><span>Email <em className="req" aria-hidden="true">*</em><span className="sr-only">(required)</span></span><input type="email" name="email" autoComplete="email" required /></motion.label>
              <motion.label variants={item} className="sp-field"><span>Organisation</span><input name="organisation" autoComplete="organization" /></motion.label>
              <motion.label variants={item} className="sp-field"><span>Phone number</span><input type="tel" name="phone" autoComplete="tel" /></motion.label>
              <motion.label variants={item} className="sp-field"><span>Message <em className="req" aria-hidden="true">*</em><span className="sr-only">(required)</span></span><textarea name="message" required maxLength={4000} /></motion.label>
              <div aria-hidden="true" style={{ position: "absolute", left: -9999 }}><label>Website <input name="website" tabIndex={-1} autoComplete="off" /></label></div>
              <motion.p variants={item} className="sp-note">We use these details only to reply to you. See our <Link href="/privacy">privacy notice</Link>.</motion.p>
              <motion.div variants={item} whileTap={{ scale: 0.98 }} className="sp-submit"><Submit className="btn-cta">Send message</Submit></motion.div>
            </motion.form>
          )}
        </div>
      </div>
    </MotionConfig>
  );
}
