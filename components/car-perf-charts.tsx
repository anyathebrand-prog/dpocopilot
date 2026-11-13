"use client";
// Interactive wrapper for the CAR Performance charts (SVG from lib/car-perf-chart.ts): hover tooltip and crosshair per
// year, and a legend that focuses one series. The same SVG is used in the PDF export, without the interaction.
import { useEffect, useRef, useState } from "react";

export type LegendItem = { key: string; label: string; color: string; bold?: boolean; dashed?: boolean };

export function PerfChart({ svg, tips, legend, label }: { svg: string; tips: string[]; legend?: LegendItem[]; label: string }) {
  const box = useRef<HTMLDivElement>(null), tip = useRef<HTMLDivElement>(null);
  const [focus, setFocus] = useState<string | null>(null);
  useEffect(() => {
    const el = box.current, t = tip.current;
    if (!el || !t) return;
    const s = el.querySelector("svg");
    if (!s) return;
    const cross = s.querySelector(".cross");
    const hits = [...s.querySelectorAll<SVGRectElement>(".hit")];
    const on = (r: SVGRectElement) => {
      const i = Number(r.dataset.i), x = Number(r.dataset.x);
      if (cross) { cross.setAttribute("x1", String(x)); cross.setAttribute("x2", String(x)); cross.setAttribute("opacity", "1"); }
      t.innerHTML = tips[i] ?? "";
      t.classList.add("on");
      const vb = s.viewBox.baseVal, px = (x / vb.width) * el.clientWidth, tw = t.offsetWidth;
      t.style.left = `${Math.min(Math.max(0, px + (px > el.clientWidth / 2 ? -tw - 14 : 14)), Math.max(0, el.clientWidth - tw))}px`;
    };
    const off = () => { cross?.setAttribute("opacity", "0"); t.classList.remove("on"); };
    const handlers = hits.map((r) => { const h = () => on(r); r.addEventListener("pointerenter", h); r.addEventListener("pointermove", h); r.addEventListener("pointerleave", off); return [r, h] as const; });
    return () => handlers.forEach(([r, h]) => { r.removeEventListener("pointerenter", h); r.removeEventListener("pointermove", h); r.removeEventListener("pointerleave", off); });
  }, [svg, tips]);
  useEffect(() => {
    box.current?.querySelectorAll<SVGElement>("[data-series]").forEach((g) => { g.style.opacity = !focus || g.dataset.series === focus || (g.dataset.series === "target" && focus === "overall") ? "" : "0.12"; });
  }, [focus, svg]);
  return (
    <div>
      {legend && (
        <div className="perf-legend" role="group" aria-label={`${label}: legend. Select a series to focus it.`}>
          {legend.map((l) => l.dashed
            ? <span key={l.key}><span className="perf-dash" style={{ borderColor: l.color }} />{l.label}</span>
            : <button type="button" key={l.key} aria-pressed={focus === l.key} className={focus && focus !== l.key ? "off" : ""} onClick={() => setFocus(focus === l.key ? null : l.key)}>
                <span className={`perf-ln${l.bold ? " bold" : ""}`} style={{ background: l.color }} />{l.label}</button>)}
        </div>
      )}
      <div className="perf-chart" ref={box}>
        <div dangerouslySetInnerHTML={{ __html: svg }} />
        <div className="perf-tip" ref={tip} role="status" />
      </div>
    </div>
  );
}
