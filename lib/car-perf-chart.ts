// CAR Performance Trend charts as plain SVG strings: one implementation for the app (dark panels, hover added by
// components/car-perf-charts.tsx) and the PDF export (light). Colours: the validated categorical order (blue, orange,
// aqua, yellow, magenta) per category, fixed everywhere; the overall line is bold ink; bands use the status colours.
import { CATS, type CatKey } from "./car-perf-model";

export type Theme = "dark" | "light";
const PAL = {
  dark: { cats: { gov: "#3987e5", sec: "#d95926", acc: "#199e70", cbt: "#c98500", dpr: "#d55181" } as Record<CatKey, string>, overall: "#f0efec",
    ink: "#f0efec", muted: "#9a988f", grid: "rgba(255,255,255,0.08)", axis: "rgba(255,255,255,0.22)", surface: "#0b1220",
    band: { Red: "rgba(208,59,59,0.16)", Amber: "rgba(250,178,25,0.12)", Green: "rgba(12,163,12,0.15)" }, findings: "#9085e9", breaches: "#e66767" },
  light: { cats: { gov: "#2a78d6", sec: "#eb6834", acc: "#1baf7a", cbt: "#eda100", dpr: "#e87ba4" } as Record<CatKey, string>, overall: "#0d1f4a",
    ink: "#0b0b0b", muted: "#6f6d68", grid: "#e1e0d9", axis: "#c3c2b7", surface: "#ffffff",
    band: { Red: "rgba(208,59,59,0.07)", Amber: "rgba(250,178,25,0.12)", Green: "rgba(12,163,12,0.08)" }, findings: "#6250d6", breaches: "#e34948" },
};
export const catColor = (k: CatKey, t: Theme = "dark") => PAL[t].cats[k];
export const overallColor = (t: Theme = "dark") => PAL[t].overall;
export const barColors = (t: Theme = "dark") => ({ findings: PAL[t].findings, breaches: PAL[t].breaches });

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const f1 = (x: number) => (Math.round(x * 10) / 10).toFixed(1);

export type TrendInput = { years: number[]; cats: Record<CatKey, (number | null)[]>; overall: (number | null)[]; target: (number | null)[]; catTargets?: Record<CatKey, (number | null)[]> };

/** Line chart: five category lines, a bold overall line, a dashed overall target, Red/Amber/Green bands; gaps for missing years. */
export function trendSvg(d: TrendInput, theme: Theme = "dark", W = 760, H = 340) {
  const p = PAL[theme], m = { t: 12, r: 96, b: 34, l: 38 };
  const iw = W - m.l - m.r, ih = H - m.t - m.b, n = d.years.length;
  const x = (i: number) => m.l + (n > 1 ? (iw * i) / (n - 1) : iw / 2), y = (v: number) => m.t + ih * (1 - v / 100);
  const path = (vals: (number | null)[]) => { let s = "", pen = false; vals.forEach((v, i) => { if (v == null) { pen = false; return; } s += `${pen ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`; pen = true; }); return s; };
  const out: string[] = [];
  ([[0, 65, "Red"], [65, 85, "Amber"], [85, 100, "Green"]] as const).forEach(([a, b, nm]) => {
    out.push(`<rect x="${m.l}" y="${y(b)}" width="${iw}" height="${y(a) - y(b)}" fill="${p.band[nm]}"/>`);
    out.push(`<text x="${m.l + 6}" y="${nm === "Red" ? y(a) - 6 : y(b) + 14}" font-size="11" fill="${p.muted}">${nm}</text>`);
  });
  [0, 20, 40, 60, 80, 100].forEach((v) => {
    out.push(`<line x1="${m.l}" x2="${m.l + iw}" y1="${y(v)}" y2="${y(v)}" stroke="${v === 0 ? p.axis : p.grid}"/>`);
    out.push(`<text x="${m.l - 8}" y="${y(v) + 4}" text-anchor="end" font-size="11" fill="${p.muted}">${v}</text>`);
  });
  d.years.forEach((yr, i) => out.push(`<text x="${x(i)}" y="${H - 10}" text-anchor="middle" font-size="12" fill="${p.muted}">${yr}</text>`));
  if (d.target.some((v) => v != null)) out.push(`<path d="${path(d.target)}" fill="none" stroke="${p.muted}" stroke-width="1.5" stroke-dasharray="5 4" data-series="target"/>`);
  if (d.catTargets) for (const c of CATS) if (d.catTargets[c.key]?.some((v) => v != null))
    out.push(`<path d="${path(d.catTargets[c.key])}" fill="none" stroke="${p.cats[c.key]}" stroke-width="1.2" stroke-dasharray="3 4" opacity="0.8" data-series="${c.key}"/>`);
  for (const c of CATS) {
    const vals = d.cats[c.key];
    out.push(`<g data-series="${c.key}"><path d="${path(vals)}" fill="none" stroke="${p.cats[c.key]}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>${vals.map((v, i) => (v == null ? "" : `<circle cx="${x(i)}" cy="${y(v)}" r="4" fill="${p.cats[c.key]}" stroke="${p.surface}" stroke-width="2"/>`)).join("")}</g>`);
  }
  out.push(`<g data-series="overall"><path d="${path(d.overall)}" fill="none" stroke="${p.overall}" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/>${d.overall.map((v, i) => (v == null ? "" : `<circle cx="${x(i)}" cy="${y(v)}" r="5" fill="${p.overall}" stroke="${p.surface}" stroke-width="2"/>`)).join("")}</g>`);
  const li = d.overall.map((v, i) => (v == null ? -1 : i)).filter((i) => i >= 0);
  if (li.length) { const i = li[li.length - 1]; out.push(`<text x="${x(i) + 10}" y="${y(d.overall[i]!) + 4}" font-size="12" font-weight="700" fill="${p.ink}">Overall ${f1(d.overall[i]!)}</text>`); }
  out.push(`<line class="cross" x1="0" x2="0" y1="${m.t}" y2="${m.t + ih}" stroke="${p.axis}" opacity="0"/>`);
  d.years.forEach((_, i) => out.push(`<rect class="hit" data-i="${i}" x="${x(i) - (n > 1 ? iw / (n - 1) / 2 : iw / 2)}" y="${m.t}" width="${n > 1 ? iw / (n - 1) : iw}" height="${ih}" fill="transparent" data-x="${x(i)}"/>`));
  const desc = li.length ? `Overall CAR score ${li.map((i) => `${d.years[i]}: ${f1(d.overall[i]!)}`).join("; ")}.` : "No scores yet.";
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${esc(`Category trend line chart. ${desc}`)}" xmlns="http://www.w3.org/2000/svg" style="display:block;font-family:system-ui,-apple-system,'Segoe UI',sans-serif">${out.join("")}</svg>`;
}

/** Grouped bars: open audit findings and breaches recorded per year. */
export function barsSvg(years: number[], findings: (number | null)[], breaches: (number | null)[], theme: Theme = "dark", W = 520, H = 260) {
  const p = PAL[theme], m = { t: 18, r: 8, b: 34, l: 34 };
  const iw = W - m.l - m.r, ih = H - m.t - m.b;
  const top = Math.max(5, ...findings.map((v) => v ?? 0), ...breaches.map((v) => v ?? 0));
  const step = top <= 10 ? 2 : top <= 25 ? 5 : top <= 50 ? 10 : 20, max = Math.ceil(top / step) * step;
  const y = (v: number) => m.t + ih * (1 - v / max);
  const out: string[] = [];
  for (let v = 0; v <= max; v += step) {
    out.push(`<line x1="${m.l}" x2="${m.l + iw}" y1="${y(v)}" y2="${y(v)}" stroke="${v === 0 ? p.axis : p.grid}"/>`);
    out.push(`<text x="${m.l - 8}" y="${y(v) + 4}" text-anchor="end" font-size="11" fill="${p.muted}">${v}</text>`);
  }
  const gw = iw / Math.max(1, years.length), bw = Math.min(26, gw * 0.3), gap = 2;
  years.forEach((yr, i) => {
    const cx = m.l + gw * i + gw / 2;
    out.push(`<text x="${cx}" y="${H - 10}" text-anchor="middle" font-size="12" fill="${p.muted}">${yr}</text>`);
    ([[findings[i], p.findings, -1], [breaches[i], p.breaches, 1]] as const).forEach(([v, c, side]) => {
      const bx = side < 0 ? cx - gap / 2 - bw : cx + gap / 2;
      if (v == null) { out.push(`<text x="${bx + bw / 2}" y="${y(0) - 4}" text-anchor="middle" font-size="10" fill="${p.muted}">–</text>`); return; }
      const t = y(v), h = y(0) - t, r = Math.min(4, h);
      if (h > 0) out.push(`<path d="M${bx},${y(0)}V${t + r}Q${bx},${t} ${bx + r},${t}H${bx + bw - r}Q${bx + bw},${t} ${bx + bw},${t + r}V${y(0)}Z" fill="${c}"/>`);
      if (i === 0 || i === years.length - 1) out.push(`<text x="${bx + bw / 2}" y="${t - 5}" text-anchor="middle" font-size="11" font-weight="600" fill="${p.ink}">${v}</text>`);
    });
    out.push(`<rect class="hit" data-i="${i}" x="${cx - gw / 2}" y="${m.t}" width="${gw}" height="${ih}" fill="transparent" data-x="${cx}"/>`);
  });
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${esc(`Open audit findings and breaches recorded per year: ${years.map((yr, i) => `${yr} ${findings[i] ?? "–"} findings, ${breaches[i] ?? "–"} breaches`).join("; ")}.`)}" xmlns="http://www.w3.org/2000/svg" style="display:block;font-family:system-ui,-apple-system,'Segoe UI',sans-serif">${out.join("")}</svg>`;
}
