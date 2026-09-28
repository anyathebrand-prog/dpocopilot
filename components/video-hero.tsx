"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { motion, MotionConfig } from "framer-motion";
import { DarkHeader } from "./dark-header";
import "./video-hero.css";

// Served from the app itself (public/media), so no third-party host sees visitors.
const VIDEO = "/media/Black_pod_unfolds_into_shield_20260927235912.mp4";
const ease = [0.16, 1, 0.3, 1] as const;
const TAGS = ["NDPA 2023", "DPIA", "CAR readiness"];

/** Full-screen hero: background video, the site header on top, and the headline block pinned to the bottom over a white fade. */
export function VideoHero() {
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) video.current?.pause();
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <section className="vx" aria-labelledby="vx-title">
        <motion.div className="vx-nav" initial={{ y: -16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.8, ease }}>
          <DarkHeader />
        </motion.div>

        <motion.div className="vx-video" aria-hidden="true" initial={{ opacity: 0, scale: 1.05 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1.8, ease }}>
          <video ref={video} autoPlay muted loop playsInline>
            <source src={VIDEO} type="video/mp4" />
          </video>
        </motion.div>

        <motion.div className="vx-foot" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 1, delay: 0.5, ease }}>
          <div className="vx-left">
            <motion.p className="vx-sub" initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.8, delay: 0.6, ease }}>
              <span className="vx-dot" aria-hidden="true" />Built for Nigerian DPCOs
            </motion.p>
            <motion.h1 className="vx-h1" id="vx-title" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.8, delay: 0.8, ease }}>
              NDPA compliance,<br />drafted and approved.
            </motion.h1>
            <motion.div className="vx-btns" initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.8, delay: 1, ease }}>
              <Link href="/pilot" className="vx-btn vx-dark">Get Started</Link>
              <Link href="/pricing" className="vx-btn vx-line">See pricing</Link>
            </motion.div>
          </div>
          <ul className="vx-tags" aria-label="Covers">
            {TAGS.map((t) => <li key={t}>{t}</li>)}
          </ul>
        </motion.div>
      </section>
    </MotionConfig>
  );
}
