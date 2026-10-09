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

/** Whole days from `today` to `date` (both 'YYYY-MM-DD'); negative once past. */
export const daysUntil = (date: string, today: string) => Math.round((Date.parse(date) - Date.parse(today)) / DAY);

/** CAR filing reminders go out 30, 14, 7 and 1 day(s) before, and on the day. */
export const CAR_REMINDER_DAYS = [30, 14, 7, 1, 0];

/** The reminder stage due for a CAR date, or null outside the 30-day window. A missed run catches up
 *  with the latest stage (due in 10 days → the 14-day reminder), so each stage is sent at most once. */
export function carReminderStage(due: string, today: string): number | null {
  const left = daysUntil(due, today);
  if (left < 0 || left > CAR_REMINDER_DAYS[0]) return null;
  return Math.min(...CAR_REMINDER_DAYS.filter((d) => d >= left));
}

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

/** DPIA risk score = likelihood × impact on a 1–5 scale, rated as in the DPIA report format (blog/DPIA_Report_GAID.docx):
 *  Low 1–4, Medium 5–9, High 10–15, Critical 16–25. */
export function riskLevel(score: number) {
  return score >= 16 ? "Critical" : score >= 10 ? "High" : score >= 5 ? "Medium" : "Low";
}

// ---------- CAR readiness (FR8.4–8.5) ----------

/** The six parts of the NDP Audit Questionnaire (GAID Schedule 2). Checklists started on the older template use five of them. */
export const CAR_CATEGORIES: Record<string, string> = {
  governance: "Part 1: People and process (governance)",
  principles: "Part 2: Data protection principles and lawful basis",
  technology: "Part 3: Technology and security controls",
  accountability_risk: "Part 4: Accountability and risk evaluation",
  cross_border_transfer: "Part 5: Cross-border data transfer",
  // Part 6 (data processors) is no longer part of the checklist: processors are assessed under Third-party risk (TPRA),
  // and departments are audited with the work plan (Section B). Its stored answers are kept but left out of every view and score.
};

type CarItem = { category_key: string; status: string; priority?: string | null };
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

/** CAR item risk from its status, lowered by the question's priority: Missing is high risk, In progress medium,
 *  Complete low; a Medium-priority question drops one level (Low-priority two). Not applicable carries none.
 *  Items without a priority (older template) count as High priority. */
export type CarRisk = "high" | "medium" | "low";
const LEVELS: CarRisk[] = ["low", "medium", "high"];
export function carItemRisk(status: string, priority?: string | null): CarRisk | null {
  const base = ({ missing: 2, in_progress: 1, complete: 0 } as Record<string, number>)[status];
  if (base === undefined) return null;
  return LEVELS[Math.max(0, base - (priority === "medium" ? 1 : priority === "low" ? 2 : 0))];
}

/** Risk score 0–100 over applicable items (Missing 1, In progress 0.5, Complete 0), High-priority questions counting double,
 *  rated High ≥ 50, Medium ≥ 20, else Low. ponytail: provisional bands and weights; tune with the first pilot DPCOs. */
export function carRisk(items: CarItem[]): { score: number; rating: CarRisk } | null {
  let sum = 0, total = 0;
  for (const i of items) {
    const s = ({ missing: 1, in_progress: 0.5, complete: 0 } as Record<string, number>)[i.status];
    if (s === undefined) continue;
    const w = i.priority === "high" ? 2 : 1;
    sum += s * w; total += w;
  }
  if (!total) return null;
  const score = Math.round((100 * sum) / total);
  return { score, rating: score >= 50 ? "high" : score >= 20 ? "medium" : "low" };
}

// ---------- CAR audit report and remediation plan ----------

/** Assurance rating for one audit area from its CAR risk score (0–100). ponytail: provisional bands; tune with pilot DPCOs. */
export function assurance(score: number | null | undefined) {
  if (score === null || score === undefined) return "Not assessed";
  return score < 20 ? "Substantial" : score < 50 ? "Reasonable" : score < 80 ? "Limited" : "No assurance";
}

export const MATURITY: [number, string, string][] = [
  [1, "Initial", "Data protection practices are largely informal or undocumented; most required controls are not yet in place."],
  [2, "Foundational", "Foundational awareness and initial structures exist, but people, culture, processes, records and technical controls require further strengthening."],
  [3, "Defined", "Key policies, roles and processes are defined and partly operating; evidence and consistency across the organisation need strengthening."],
  [4, "Managed", "Controls are largely implemented, evidenced and monitored; remaining gaps are specific and being managed."],
  [5, "Optimised", "Data protection is embedded, measured and continuously improved across the organisation."],
];

/** Maturity level (1–5) from overall CAR readiness %. */
export const maturityLevel = (readinessPct: number) => (readinessPct < 20 ? 1 : readinessPct < 40 ? 2 : readinessPct < 60 ? 3 : readinessPct < 80 ? 4 : 5);

/** Remediation target date by risk: High 30 days, Medium 90, Low 180 after the report date. */
export const remediationDue = (reportDate: string, risk: string) => addDays(reportDate, risk === "high" ? 30 : risk === "medium" ? 90 : 180);

/** Remediation tracker status as shown and exported: Overdue is derived from the target date, never stored. */
export type TrackerStatus = "Not Started" | "In Progress" | "Completed" | "Overdue";
export function trackerStatus(r: { status: string; target_date: string | null }, today: string): TrackerStatus {
  if (r.status === "completed") return "Completed";
  if (r.target_date && r.target_date < today) return "Overdue";
  return r.status === "in_progress" ? "In Progress" : "Not Started";
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
