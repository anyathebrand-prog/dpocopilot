// Pure compliance logic: no I/O, so it is unit-tested directly (lib/rules.test.ts).
// All deadlines are computed here and stored, so dashboard, calendar and alerts agree (TRD §2.3).

export const WAT_OFFSET = "+01:00"; // Africa/Lagos, no daylight saving
const HOUR = 3600_000;
const DAY = 24 * HOUR;

const watFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Africa/Lagos", day: "numeric", month: "short", year: "numeric",
  hour: "2-digit", minute: "2-digit", hour12: false,
});
const watDateFmt = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" });

export const fmtWAT = (d: Date | string) => `${watFmt.format(new Date(d))} WAT`;
export const fmtDate = (d: string) => watDateFmt.format(new Date(d + "T00:00:00Z"));

/** "2026-09-26T10:30" typed in WAT → Date. Returns null for malformed input. */
export function parseWATLocal(s: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s)) return null;
  const d = new Date(`${s}:00${WAT_OFFSET}`);
  return isNaN(+d) ? null : d;
}

/** Current WAT time as a datetime-local value, for input max= attributes. */
export const nowWATLocal = (now = new Date()) => new Date(+now + HOUR).toISOString().slice(0, 16);
export const todayWAT = (now = new Date()) => new Date(+now + HOUR).toISOString().slice(0, 10);

export function addDays(date: string, n: number) {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** FR7.3: regulator notification due 72 hours after awareness. */
export const breachDeadline = (awareAt: Date) => new Date(+awareAt + 72 * HOUR);

/** FR16.3: DSAR response due `days` after date received (default 30, Secretary setting). */
export const dsarDeadline = (receivedOn: string, days: number) => addDays(receivedOn, days);

/** Date-only deadlines fall due at the end of that day in WAT. */
export const endOfDayWAT = (date: string) => new Date(`${date}T23:59:59${WAT_OFFSET}`);

export type DeadlineState = "normal" | "soon" | "overdue";

export function deadlineState(due: Date, now: Date, soonMs: number): DeadlineState {
  const left = +due - +now;
  if (left < 0) return "overdue";
  return left <= soonMs ? "soon" : "normal";
}

export function relTime(due: Date, now: Date) {
  const ms = Math.abs(+due - +now);
  const d = Math.floor(ms / DAY), h = Math.floor((ms % DAY) / HOUR), m = Math.floor((ms % HOUR) / 60_000);
  const span = d >= 2 ? `${d} days` : d === 1 ? `1 day ${h}h` : h >= 1 ? `${h}h ${m}m` : `${m}m`;
  return +due < +now ? `Overdue by ${span}` : `${span} left`;
}

/** Breach countdown figure, e.g. "31h 12m left". */
export function countdown(due: Date, now: Date) {
  const ms = +due - +now;
  if (ms < 0) return relTime(due, now);
  return `${Math.floor(ms / HOUR)}h ${Math.floor((ms % HOUR) / 60_000)}m left`;
}

/** DPIA risk score = likelihood × impact on a 1–5 scale (schema SQ-13, provisional). */
export function riskLevel(score: number) {
  return score >= 17 ? "Very high" : score >= 10 ? "High" : score >= 5 ? "Medium" : "Low";
}

// ---------- CAR readiness (FR8.4–8.5) ----------

export const CAR_CATEGORIES: Record<string, string> = {
  governance: "People and process (governance)",
  technology: "Technology (data security controls and standards)",
  accountability_risk: "Accountability and basic risk evaluation",
  cross_border_transfer: "Cross-border data transfer",
  data_processors: "Data processors",
};

type CarItem = { category_key: string; status: string };
export type Score = { complete: number; applicable: number; pct: number };

function score(items: CarItem[]): Score {
  const applicable = items.filter((i) => i.status !== "not_applicable");
  const complete = applicable.filter((i) => i.status === "complete").length;
  return { complete, applicable: applicable.length, pct: applicable.length ? Math.round((complete / applicable.length) * 100) : 0 };
}

export function readiness(items: CarItem[]) {
  const byCategory: Record<string, Score> = {};
  for (const k of Object.keys(CAR_CATEGORIES)) byCategory[k] = score(items.filter((i) => i.category_key === k));
  return { overall: score(items), byCategory };
}

// ---------- Gap rules (FR12.2) — deterministic; AI only explains ----------

export type GapInput = {
  today: string;
  ropa: { id: string; purpose: string; lawful_basis: string | null; retention_period: string | null; involves_sensitive: boolean; is_high_risk: boolean; has_transfer: boolean; transfer_safeguard: string | null; dpia_count: number }[];
  approvedTemplates: string[];
  evidence: { id: string; title: string; due_on: string | null; status: string }[];
  dsars: { id: string; requester_name: string; deadline_on: string; status: string }[];
  car: { id: string; item_text: string; status: string }[];
};
export type Gap = { rule_key: string; severity: "high" | "medium" | "low"; fingerprint: string; message: string; next_action: string; link: string };

export const REQUIRED_POLICIES: Record<string, string> = {
  privacy_notice: "Privacy Notice",
  data_retention_policy: "Data Retention Policy",
  consent_form: "Consent Form",
};

export function findGaps(i: GapInput): Gap[] {
  const gaps: Gap[] = [];
  const add = (g: Gap) => gaps.push(g);
  for (const r of i.ropa) {
    const link = `ropa/${r.id}`;
    if (!r.lawful_basis) add({ rule_key: "no_lawful_basis", severity: "high", fingerprint: `no_lawful_basis:${r.id}`, message: `"${r.purpose}" has no lawful basis recorded.`, next_action: "Choose the lawful basis for this processing activity (NDPA s.25).", link });
    if (r.involves_sensitive && r.dpia_count === 0) add({ rule_key: "sensitive_without_dpia", severity: "high", fingerprint: `sensitive_without_dpia:${r.id}`, message: `"${r.purpose}" processes sensitive personal data but has no DPIA.`, next_action: "Start a DPIA linked to this activity.", link: `dpias/new?ropa=${r.id}` });
    else if (r.is_high_risk && r.dpia_count === 0) add({ rule_key: "high_risk_without_dpia", severity: "high", fingerprint: `high_risk_without_dpia:${r.id}`, message: `"${r.purpose}" is marked high risk but has no DPIA.`, next_action: "Start a DPIA linked to this activity.", link: `dpias/new?ropa=${r.id}` });
    if (!r.retention_period) add({ rule_key: "no_retention_period", severity: "medium", fingerprint: `no_retention_period:${r.id}`, message: `"${r.purpose}" has no retention period.`, next_action: "Record how long this data is kept and why.", link });
    if (r.has_transfer && !r.transfer_safeguard) add({ rule_key: "transfer_without_safeguard", severity: "high", fingerprint: `transfer_without_safeguard:${r.id}`, message: `"${r.purpose}" transfers data outside Nigeria with no documented safeguard.`, next_action: "Document the legal basis or safeguard for the transfer.", link });
  }
  for (const [key, name] of Object.entries(REQUIRED_POLICIES)) {
    if (!i.approvedTemplates.includes(key)) add({ rule_key: "missing_required_policy", severity: "medium", fingerprint: `missing_required_policy:${key}`, message: `No approved ${name}.`, next_action: `Generate or finish the ${name} and send it for review.`, link: "documents" });
  }
  for (const e of i.evidence) {
    if (e.due_on && e.due_on < i.today && (e.status === "open" || e.status === "rejected")) add({ rule_key: "evidence_overdue", severity: "medium", fingerprint: `evidence_overdue:${e.id}`, message: `Evidence request "${e.title}" is overdue.`, next_action: "Follow up with the client contact.", link: `evidence/${e.id}` });
  }
  for (const d of i.dsars) {
    if (d.status !== "open") continue;
    const past = d.deadline_on < i.today;
    if (past || d.deadline_on <= addDays(i.today, 7)) add({ rule_key: "dsar_deadline_risk", severity: past ? "high" : "medium", fingerprint: `dsar_deadline_risk:${d.id}`, message: `Request from ${d.requester_name} is ${past ? "past" : "near"} its deadline (${fmtDate(d.deadline_on)}).`, next_action: "Draft, approve and record the response.", link: `dsars/${d.id}` });
  }
  for (const c of i.car) {
    if (c.status === "missing") add({ rule_key: "car_item_missing", severity: "low", fingerprint: `car_item_missing:${c.id}`, message: `CAR item missing: ${c.item_text}`, next_action: "Request evidence or mark the item's status.", link: "car-readiness" });
  }
  const order = { high: 0, medium: 1, low: 2 };
  return gaps.sort((a, b) => order[a.severity] - order[b.severity]);
}

// ---------- Major-importance indicator (FR3.5) — rule-based ----------

export type Criterion = { description: string; question_key: string; op: "gte" | "yes" | "includes"; value: string | null; source_ref: string };

export function evaluateMI(criteria: Criterion[], answers: Record<string, unknown>) {
  const reasoning = criteria.map((c) => {
    const a = answers[c.question_key];
    const met =
      c.op === "gte" ? Number(a) >= Number(c.value) :
      c.op === "yes" ? a === "yes" :
      Array.isArray(a) ? a.includes(c.value) : false;
    return { description: c.description, met, source_ref: c.source_ref, answer: a ?? null };
  });
  return { result: reasoning.some((r) => r.met) ? ("likely" as const) : ("unlikely" as const), reasoning };
}

// ---------- CSV (F17 import) ----------

export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], field = "", quoted = false;
  text = text.replace(/^﻿/, "");
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((f) => f.trim())) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f.trim())) rows.push(row);
  return rows;
}

// ---------- Regulatory library ingestion (F18) ----------

/** Splits pasted source text into citable sections at lines like "Section 40 — Personal data breaches". */
export function splitSections(text: string) {
  const out: { section_ref: string; heading: string | null; body: string }[] = [];
  for (const line of text.replace(/\r/g, "").split("\n")) {
    const m = line.match(/^\s*((?:Section|Article|Part|Regulation|Paragraph|Schedule)\s+[\w().]+)\s*[:.\-—–]?\s*(.*)$/i);
    if (m) out.push({ section_ref: m[1].replace(/\s+/g, " "), heading: m[2].trim() || null, body: "" });
    else if (line.trim()) {
      if (!out.length) out.push({ section_ref: "Full text", heading: null, body: "" });
      out[out.length - 1].body += (out[out.length - 1].body ? "\n" : "") + line.trim();
    }
  }
  return out.filter((s) => s.body || s.heading).map((s) => ({ ...s, body: s.body || s.heading! }));
}
