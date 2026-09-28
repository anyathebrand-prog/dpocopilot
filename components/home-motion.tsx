"use client";
import { useEffect, useRef, type ElementType } from "react";
import { motion, MotionConfig, type Variants } from "framer-motion";

const ease = [0.22, 1, 0.36, 1] as const;

/** Cursor spotlight on [data-spot] elements (sets --mx / --my), via one delegated listener. */
export function HomeFX() {
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches || !matchMedia("(hover: hover)").matches) return;
    const onMove = (e: PointerEvent) => {
      const tile = (e.target as HTMLElement).closest?.("[data-spot]") as HTMLElement | null;
      if (!tile) return;
      const r = tile.getBoundingClientRect();
      tile.style.setProperty("--mx", `${e.clientX - r.left}px`);
      tile.style.setProperty("--my", `${e.clientY - r.top}px`);
    };
    document.addEventListener("pointermove", onMove, { passive: true });
    return () => document.removeEventListener("pointermove", onMove);
  }, []);
  return null;
}

/** Two-line heading: the first line rises in, then the gradient second line follows with a light sweep. */
export function SplitHeading({ line1, line2, className, as = "h2" }: { line1: string; line2: string; className?: string; as?: "h1" | "h2" }) {
  const Tag = motion[as] as ElementType;
  const line: Variants = { hidden: { y: "0.6em", opacity: 0, filter: "blur(6px)" }, show: (i: number) => ({ y: 0, opacity: 1, filter: "blur(0px)", transition: { duration: 0.8, ease, delay: i * 0.18 } }) };
  return (
    <MotionConfig reducedMotion="user">
      <Tag className={className} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.6 }}>
        <motion.span variants={line} custom={0} style={{ display: "block" }}>{line1}</motion.span>
        <motion.strong variants={line} custom={1} className="hp-sweep">{line2}</motion.strong>
      </Tag>
    </MotionConfig>
  );
}

/** Dot-matrix numeral that flickers on like an old display when scrolled into view. */
export function Flicker({ children, delay = 0, className }: { children: string; delay?: number; className?: string }) {
  return (
    <MotionConfig reducedMotion="user">
      <motion.span className={className} aria-hidden="true" initial={{ opacity: 0 }} whileInView={{ opacity: [0, 1, 0.15, 1, 0.3, 0.9, 1] }}
        viewport={{ once: true, amount: 0.8 }} transition={{ duration: 1.1, delay, times: [0, 0.12, 0.2, 0.3, 0.42, 0.52, 1], ease: "linear" }}>
        {children}
      </motion.span>
    </MotionConfig>
  );
}

/** Number that counts up (easeOutCubic) once visible. The server renders the final value, so it reads correctly without JS. */
export function CountUp({ value, duration = 1400 }: { value: number; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    el.textContent = "0";
    let raf = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min((now - start) / duration, 1);
        el.textContent = String(Math.round(value * (1 - Math.pow(1 - t, 3))));
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, { threshold: 0.5 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [value, duration]);
  return <span ref={ref}>{value}</span>;
}
