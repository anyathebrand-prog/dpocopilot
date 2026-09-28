"use client";
import Link from "next/link";
import { useState } from "react";
import { motion, AnimatePresence, MotionConfig, type Variants } from "framer-motion";
import { Check, Plus, ArrowRight } from "lucide-react";

const ease = [0.22, 1, 0.36, 1] as const;

export type Tier = { key: string; name: string; who: string; price: string; cta: string; note: string };

const cards: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } } };
const card: Variants = { hidden: { opacity: 0, y: 32, filter: "blur(6px)" }, show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.8, ease } } };

/** Tier cards: dark tiles; the pilot plan carries the blue glow and a solid badge. */
export function Tiers({ tiers }: { tiers: readonly Tier[] }) {
  return (
    <MotionConfig reducedMotion="user">
      <motion.div className="sp-tiers" variants={cards} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.25 }}>
        {tiers.map((t) => {
          const main = t.key === "firm";
          return (
            <motion.section key={t.key} variants={card} className={`hp-mod sp-tier ${main ? "main" : ""}`} data-spot aria-labelledby={`t-${t.key}`}>
              <span className="sp-badge">{t.note}</span>
              <h3 id={`t-${t.key}`}>{t.name}</h3>
              <p>{t.who}</p>
              <p className="sp-price">{t.price}</p>
              <Link href="/pilot" className={main ? "btn-cta" : "hp-ghost"}>{t.cta}{main && <ArrowRight aria-hidden />}</Link>
            </motion.section>
          );
        })}
      </motion.div>
    </MotionConfig>
  );
}

/** Illustrative CAR readiness panel. Clearly labelled "Example". */
export function ReadinessMock() {
  const rows: [string, number][] = [["People and process", 86], ["Technology", 80], ["Accountability and risk", 67], ["Cross-border transfer", 100], ["Data processors", 67]];
  const overall = Math.round(rows.reduce((s, [, v]) => s + v, 0) / rows.length);
  return (
    <MotionConfig reducedMotion="user">
      <div className="sp-card" role="img" aria-label={`Example CAR readiness: ${overall} percent overall`}>
        <div className="sp-mock-head"><span>CAR readiness</span><span className="sp-example">Example</span></div>
        <p className="sp-score">{overall}<span>%</span></p>
        {rows.map(([label, v], i) => (
          <div key={label} className="sp-row">
            <div className="sp-row-label"><span>{label}</span><span>{v}%</span></div>
            <div className="sp-bar"><motion.i initial={{ width: 0 }} whileInView={{ width: `${v}%` }} viewport={{ once: true }} transition={{ duration: 1, ease, delay: 0.2 + i * 0.12 }} /></div>
          </div>
        ))}
      </div>
    </MotionConfig>
  );
}

export function Faq({ items }: { items: [string, string][] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <MotionConfig reducedMotion="user">
      <div className="sp-faq">
        {items.map(([q, a], i) => {
          const isOpen = open === i;
          return (
            <motion.div key={q} className={`sp-item ${isOpen ? "open" : ""}`} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, ease, delay: i * 0.05 }}>
              <h3>
                <button aria-expanded={isOpen} aria-controls={`faq-${i}`} onClick={() => setOpen(isOpen ? null : i)}>
                  <span>{q}</span>
                  <motion.span className="sp-plus" animate={{ rotate: isOpen ? 45 : 0 }} transition={{ duration: 0.25 }}><Plus aria-hidden /></motion.span>
                </button>
              </h3>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div id={`faq-${i}`} initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease }} style={{ overflow: "hidden" }}>
                    <p>{a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </MotionConfig>
  );
}

export const CheckMark = () => <span className="sp-check"><Check aria-hidden strokeWidth={3} /><span className="sr-only">Included</span></span>;
