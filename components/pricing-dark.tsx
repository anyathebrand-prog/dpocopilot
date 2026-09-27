"use client";
import Link from "next/link";
import { useState } from "react";
import { motion, AnimatePresence, MotionConfig, type Variants } from "framer-motion";
import { Check, Plus, ArrowRight } from "lucide-react";

const ease = [0.22, 1, 0.36, 1] as const;

export type Tier = { key: string; name: string; who: string; price: string; cta: string; note: string };

const cards: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.12, delayChildren: 0.15 } } };
const card: Variants = { hidden: { opacity: 0, y: 32, filter: "blur(6px)" }, show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.8, ease } } };

/** Tier cards: the pilot plan is the yellow "ink" card; the others are dark tiles. */
export function Tiers({ tiers }: { tiers: readonly Tier[] }) {
  return (
    <MotionConfig reducedMotion="user">
      <motion.div className="pd-tiers" variants={cards} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.25 }}>
        {tiers.map((t) => {
          const main = t.key === "firm";
          return (
            <motion.section key={t.key} variants={card} className={`hm-tile pd-tier ${main ? "main" : ""}`} aria-labelledby={`t-${t.key}`}
              whileHover={{ y: -6, transition: { type: "spring", stiffness: 300, damping: 20 } }}>
              <span className={`pd-badge ${main ? "on" : ""}`}>{t.note}</span>
              <h3 id={`t-${t.key}`}>{t.name}</h3>
              <p className="pd-who">{t.who}</p>
              <p className="pd-price">{t.price}</p>
              <motion.div whileTap={{ scale: 0.97 }}>
                <Link href="/pilot" className={`pd-btn ${main ? "" : "ghost"}`}>{t.cta}{main && <ArrowRight aria-hidden />}</Link>
              </motion.div>
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
      <div className="hm-tile pd-mock" role="img" aria-label={`Example CAR readiness: ${overall} percent overall`}>
        <div className="pd-mock-head"><b>CAR readiness</b><span className="pd-example">Example</span></div>
        <p className="pd-score">{overall}<span>%</span></p>
        {rows.map(([label, v], i) => (
          <div key={label} className="pd-row">
            <div className="pd-row-label"><span>{label}</span><span>{v}%</span></div>
            <div className="pd-bar"><motion.i initial={{ width: 0 }} whileInView={{ width: `${v}%` }} viewport={{ once: true }} transition={{ duration: 1, ease, delay: 0.2 + i * 0.12 }} /></div>
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
      <div className="pd-faq">
        {items.map(([q, a], i) => {
          const isOpen = open === i;
          return (
            <motion.div key={q} className={`pd-item ${isOpen ? "open" : ""}`} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, ease, delay: i * 0.05 }}>
              <h3>
                <button aria-expanded={isOpen} aria-controls={`faq-${i}`} onClick={() => setOpen(isOpen ? null : i)}>
                  <span>{q}</span>
                  <motion.span className="pd-plus" animate={{ rotate: isOpen ? 45 : 0 }} transition={{ duration: 0.25 }}><Plus aria-hidden /></motion.span>
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

export const CheckMark = () => <span className="pd-check"><Check aria-hidden strokeWidth={3} /><span className="sr-only">Included</span></span>;
