// CAR Performance Trend: the KPI definitions and the scoring formula. Pure functions only (no imports), so the page,
// the server, the PDF export and the unit tests all score the same way.
// KPI score (0–100) → category score (mean of non-N/A KPIs) → overall (weighted sum of the five categories, with the
// weight of an all-N/A category shared among the others in proportion) → band (Green ≥ 85, Amber 65–84, Red < 65).

export type CatKey = "gov" | "sec" | "acc" | "cbt" | "dpr";
export type Kind = "percent" | "count" | "status";
export type Band = "Green" | "Amber" | "Red";
export type Source = "auto" | "manual" | "import";

export const CATS: { key: CatKey; name: string; short: string }[] = [
  { key: "gov", name: "Governance", short: "G" },
  { key: "sec", name: "Technology / Security", short: "S" },
  { key: "acc", name: "Accountability & Risk", short: "A" },
  { key: "cbt", name: "Cross-border transfer", short: "C" },
  { key: "dpr", name: "Data processors", short: "P" },
];

export type KpiDef = { code: string; name: string; cat: CatKey; kind: Kind; how: string; source: string; href: string };
/** The twelve KPIs (platform definitions). `href` is the client page the value comes from. */
export const KPIS: KpiDef[] = [
  { code: "GOV-1", name: "ROPA coverage", cat: "gov", kind: "percent", how: "Processing activities with a complete RoPA entry ÷ all processing activities", source: "RoPA", href: "/ropa" },
  { code: "GOV-2", name: "Staff training completion", cat: "gov", kind: "percent", how: "Staff trained in completed data protection sessions in the year ÷ total staff", source: "Training plan", href: "/training" },
  { code: "GOV-3", name: "CAR filed on time", cat: "gov", kind: "status", how: "Filed on or before 31 March = 100, late = 50, not filed = 0", source: "CAR filing record", href: "/car-performance" },
  { code: "SEC-1", name: "Breaches recorded", cat: "sec", kind: "count", how: "Personal data breaches logged in the year", source: "Breach register", href: "/breaches" },
  { code: "SEC-2", name: "Breaches notified within 72 hrs", cat: "sec", kind: "percent", how: "Breaches notified to the NDPC within 72 hours ÷ notifiable breaches", source: "Breach register", href: "/breaches" },
  { code: "SEC-3", name: "High-risk findings closed in 90 days", cat: "sec", kind: "percent", how: "High-priority remediation actions closed within 90 days ÷ high-priority actions raised", source: "Remediation tracker", href: "/remediation" },
  { code: "ACC-1", name: "DPIA completion", cat: "acc", kind: "percent", how: "High-risk processing activities with an approved DPIA ÷ high-risk processing activities", source: "DPIAs", href: "/dpias" },
  { code: "ACC-2", name: "DSARs resolved on time", cat: "acc", kind: "percent", how: "DSARs closed within 30 days ÷ DSARs received in the year", source: "DSAR tracker", href: "/dsars" },
  { code: "ACC-3", name: "Open audit findings", cat: "acc", kind: "count", how: "Remediation actions still open for the audit year", source: "Remediation tracker", href: "/remediation" },
  { code: "CBT-1", name: "Transfers with documented safeguards", cat: "cbt", kind: "percent", how: "Cross-border transfers with a recorded mechanism ÷ all cross-border transfers", source: "Transfer risk", href: "/assessments/tia" },
  { code: "DPR-1", name: "Processors with signed DPAs", cat: "dpr", kind: "percent", how: "Processors with a signed data processing agreement ÷ all processors", source: "Third-party risk", href: "/assessments/tpra" },
  { code: "DPR-2", name: "Processor risk assessments done", cat: "dpr", kind: "percent", how: "Processors assessed (approved) in the year ÷ all processors", source: "Third-party risk", href: "/assessments/tpra" },
];
export const KPI = Object.fromEntries(KPIS.map((k) => [k.code, k])) as Record<string, KpiDef>;

export type Settings = { weights: Record<CatKey, number>; tolerances: Record<string, number> };
export const DEFAULT_SETTINGS: Settings = { weights: { gov: 25, sec: 25, acc: 20, cbt: 15, dpr: 15 }, tolerances: { "SEC-1": 10, "ACC-3": 30 } };
export function asSettings(x: unknown): Settings {
  const s = (x && typeof x === "object" ? x : {}) as Partial<Settings>;
  return { weights: { ...DEFAULT_SETTINGS.weights, ...(s.weights ?? {}) }, tolerances: { ...DEFAULT_SETTINGS.tolerances, ...(s.tolerances ?? {}) } };
}
export function checkSettings(s: Settings): string | null {
  const w = Object.values(s.weights);
  if (w.some((x) => !Number.isFinite(x) || x < 0)) return "Weights must be zero or more.";
  if (Math.round(w.reduce((a, b) => a + b, 0) * 100) / 100 !== 100) return "Weights must add up to 100%.";
  if (Object.values(s.tolerances).some((x) => !Number.isFinite(x) || x <= 0)) return "Tolerances must be more than zero.";
  return null;
}

/** One KPI's value: a ratio (numerator/denominator), a raw value (count, percent or filing status), or N/A. */
export type Value = { numerator?: number | null; denominator?: number | null; raw?: number | string | null };
export const FILING = ["On time", "Late", "Not filed"] as const;

/** The KPI's display value: percent for ratios, the count, or the filing status. null = N/A. */
export function kpiValue(code: string, v: Value | undefined): number | string | null {
  if (!v) return null;
  const k = KPI[code];
  if (k.kind === "status") return FILING.includes(v.raw as never) ? (v.raw as string) : null;
  if (v.denominator != null) return v.denominator > 0 ? Math.round(((v.numerator ?? 0) / v.denominator) * 1000) / 10 : null;
  return v.raw == null || v.raw === "" || !Number.isFinite(Number(v.raw)) ? null : Number(v.raw);
}

/** KPI score 0–100, or null for N/A (zero denominator or no value). */
export function kpiScore(code: string, v: Value | undefined, s: Settings = DEFAULT_SETTINGS): number | null {
  const k = KPI[code], x = kpiValue(code, v);
  if (x == null) return null;
  if (k.kind === "status") return x === "On time" ? 100 : x === "Late" ? 50 : 0;
  if (k.kind === "count") return Math.max(0, 100 - (Number(x) / (s.tolerances[code] ?? 10)) * 100);
  return Math.max(0, Math.min(100, Number(x)));
}

export type Scores = { kpi: Record<string, number | null>; cats: Record<CatKey, number | null>; overall: number | null; band: Band | null };

export function score(values: Record<string, Value>, s: Settings = DEFAULT_SETTINGS): Scores {
  const kpi = Object.fromEntries(KPIS.map((k) => [k.code, kpiScore(k.code, values[k.code], s)])) as Record<string, number | null>;
  const cats = Object.fromEntries(CATS.map((c) => {
    const xs = KPIS.filter((k) => k.cat === c.key).map((k) => kpi[k.code]).filter((x): x is number => x != null);
    return [c.key, xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null];
  })) as Record<CatKey, number | null>;
  const live = CATS.filter((c) => cats[c.key] != null);
  const wsum = live.reduce((a, c) => a + (s.weights[c.key] ?? 0), 0);
  const overall = wsum > 0 ? live.reduce((a, c) => a + cats[c.key]! * ((s.weights[c.key] ?? 0) / wsum), 0) : null;
  return { kpi, cats, overall, band: overall == null ? null : band(overall) };
}

export const band = (x: number): Band => (r1(x) >= 85 ? "Green" : r1(x) >= 65 ? "Amber" : "Red");
export const r1 = (x: number) => Math.round(x * 10) / 10;
export const BAND_COLOR: Record<Band, string> = { Green: "#0ca30c", Amber: "#fab219", Red: "#d03b3b" };

/** GOV-3 from the filing date: on or before 31 March after the CAR year is on time. */
export function filingStatus(carYear: number, filedOn: string | null | undefined): (typeof FILING)[number] {
  if (!filedOn) return "Not filed";
  return filedOn <= `${carYear + 1}-03-31` ? "On time" : "Late";
}
/** The next 31 March filing deadline on or after `today` (yyyy-mm-dd). */
export function nextDeadline(today: string) {
  const y = Number(today.slice(0, 4)), d = `${y}-03-31` >= today ? `${y}-03-31` : `${y + 1}-03-31`;
  return { date: d, days: Math.round((Date.parse(d) - Date.parse(today)) / 86400000) };
}

/** Display a stored KPI value row ({numerator, denominator, raw_value} as text from the database). */
export function fmtRow(code: string, row: { numerator?: unknown; denominator?: unknown; raw_value?: unknown } | null | undefined) {
  if (!row) return "N/A";
  const v = kpiValue(code, { numerator: row.numerator == null ? null : Number(row.numerator), denominator: row.denominator == null ? null : Number(row.denominator), raw: row.raw_value as string | null });
  if (v == null) return "N/A";
  return KPI[code].kind === "percent" ? `${r1(Number(v))}%` : String(v);
}
