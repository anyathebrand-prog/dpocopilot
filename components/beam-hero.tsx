"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { ClipboardList, ListTree, FileSearch, ShieldAlert, FolderCheck } from "lucide-react";
import { DarkHeader } from "./dark-header";
import "./beam-hero.css";

// What the product covers, in the brand-row style (no customer logos we can't claim).
const COVERAGE: [typeof ClipboardList, string][] = [
  [ClipboardList, "Data mapping"], [ListTree, "RoPA"], [FileSearch, "DPIA"], [ShieldAlert, "72h breach clock"], [FolderCheck, "CAR readiness"],
];

type Phase = "p1" | "splash" | "p2" | "idle";
const DURATION: Record<Phase, number> = { p1: 800, splash: 800, p2: 800, idle: 1000 };

export function BeamHero() {
  const pipeline = useRef<HTMLDivElement>(null);
  const nodeStack = useRef<HTMLDivElement>(null);
  const nodeX = useRef<HTMLDivElement>(null);
  const nodeShield = useRef<HTMLDivElement>(null);
  const glowPath = useRef<SVGPathElement>(null);
  const corePath = useRef<SVGPathElement>(null);
  const gradient = useRef<SVGLinearGradientElement>(null);
  const splash = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const [p, s, x, sh, glow, core, grad, spl] = [pipeline.current, nodeStack.current, nodeX.current, nodeShield.current, glowPath.current, corePath.current, gradient.current, splash.current];
    if (!p || !s || !x || !sh || !glow || !core || !grad || !spl) return;

    // Beam path: stack node → centre node → shield node, in pipeline coordinates.
    const setPath = () => {
      const pRect = p.getBoundingClientRect();
      const c = (el: HTMLElement) => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2 - pRect.left, r.top + r.height / 2 - pRect.top]; };
      const [startX, startY] = c(s), [midX, midY] = c(x), [endX, endY] = c(sh);
      const d = `M ${startX},${startY} L ${midX},${midY} L ${endX},${endY}`;
      glow.setAttribute("d", d);
      core.setAttribute("d", d);
    };
    const setBeam = (percentage: number) => {
      const center = percentage * 100;
      grad.setAttribute("x1", `${center - 5}%`);
      grad.setAttribute("x2", `${center + 5}%`);
      grad.setAttribute("y1", "0%");
      grad.setAttribute("y2", "0%");
    };
    const beamOpacity = (o: string) => { glow.style.opacity = o === "1" ? "0.6" : "0"; core.style.opacity = o; };

    setPath();
    addEventListener("resize", setPath);

    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setBeam(0.5); // one still frame: beam lit at the centre node
      return () => removeEventListener("resize", setPath);
    }

    let phase: Phase = "p1";
    let lastStateChange = performance.now();
    let raf = 0;
    const frame = (now: number) => {
      const elapsed = now - lastStateChange;
      const t = Math.min(elapsed / DURATION[phase], 1);
      if (phase === "p1") {
        setBeam(0.5 * t);
        s.classList.toggle("active", t < 0.4);
        if (t >= 1) { phase = "splash"; lastStateChange = now; beamOpacity("0"); spl.classList.add("animate"); }
      } else if (phase === "splash") {
        if (t >= 1) { phase = "p2"; lastStateChange = now; spl.classList.remove("animate"); beamOpacity("1"); }
      } else if (phase === "p2") {
        setBeam(0.5 + 0.5 * t);
        sh.classList.toggle("active", t > 0.6);
        if (t >= 1) { sh.classList.remove("active"); phase = "idle"; lastStateChange = now; }
      } else if (t >= 1) {
        phase = "p1"; lastStateChange = now;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => { cancelAnimationFrame(raf); removeEventListener("resize", setPath); };
  }, []);

  // Renders inside the page's .bh wrapper so the sections below share its background and spacing.
  return (
    <>
      <div className="bh-top"><DarkHeader /></div>

      <section className="hero-card" aria-labelledby="bh-title">
        <div className="hero-grid" aria-hidden="true" />

        <div className="icon-pipeline" ref={pipeline} aria-hidden="true">
          <svg className="beam-svg" width="100%" height="100%">
            <defs>
              <filter id="glow">
                <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                <feComposite in="SourceGraphic" in2="coloredBlur" operator="over" />
              </filter>
              <linearGradient id="beam-gradient" ref={gradient} gradientUnits="userSpaceOnUse" x1="-5%" y1="0%" x2="5%" y2="0%">
                <stop offset="0%" stopColor="#3b8fd9" stopOpacity="0" />
                <stop offset="20%" stopColor="#3b8fd9" stopOpacity="0.8" />
                <stop offset="50%" stopColor="#fff" stopOpacity="1" />
                <stop offset="80%" stopColor="#a8dcff" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#a8dcff" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path ref={glowPath} className="beam-glow" fill="none" stroke="url(#beam-gradient)" strokeWidth="2" filter="url(#glow)" />
            <path ref={corePath} className="beam-core" fill="none" stroke="url(#beam-gradient)" strokeWidth="0.8" />
          </svg>

          <div className="icon-node node-light-right" id="node-stack" ref={nodeStack}>
            <svg viewBox="0 0 24 24"><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></svg>
          </div>
          <div className="pipeline-line" />
          <div className="bh-center">
            <div className="splash" ref={splash} />
            <div className="icon-node-center" id="node-x" ref={nodeX}>
              {/* DPO Copilot seal mark */}
              <svg viewBox="0 0 40 40">
                <circle cx="20" cy="20" r="17" fill="none" stroke="#fff" strokeWidth="2.5" />
                <circle cx="20" cy="20" r="12" fill="none" stroke="#fff" strokeWidth="1.2" strokeDasharray="1.6 2.4" />
                <path d="M13.5 20.5l4.2 4.2 8.5-9.2" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
          <div className="pipeline-line right" />
          <div className="icon-node node-light-left" id="node-shield" ref={nodeShield}>
            <svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><polyline points="9 12 11 14 15 10" /></svg>
          </div>
        </div>

        <div className="hero-content">
          <h1 className="hero-heading" id="bh-title">
            The simple way
            <strong>to run NDPA compliance</strong>
          </h1>
          <p className="hero-sub">
            One workspace for every client&apos;s data map, DPIAs, breaches and audit file,<br />
            with a copilot that drafts and a qualified person who approves.
          </p>
          <Link href="/pilot" className="btn-cta">Get Started</Link>
        </div>
      </section>

      <ul className="brands" aria-label="What DPO Copilot covers">
        {COVERAGE.map(([Icon, label], i) => (
          <li key={label} className="brand-item" style={{ ["--i" as string]: i }}><Icon aria-hidden />{label}</li>
        ))}
      </ul>
    </>
  );
}
