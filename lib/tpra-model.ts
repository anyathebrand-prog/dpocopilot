// Data Processor Third-Party Risk Assessment (TPRA): the scoring model. Pure functions only, so the assessment page can
// recalculate live in the browser with the same code the server and the report use.
// Residual risk = Impact (1–5, from six inherent-risk factors) × Likelihood (1–5, from six weighted control domains).
// Knock-outs force Critical. Firms can change weights, thresholds and review cycles; each change is a new model version
// and an assessment keeps the version it was scored under.

export type Rating = "Low" | "Medium" | "High" | "Critical";
export const RATINGS: Rating[] = ["Low", "Medium", "High", "Critical"];
export const RATING_COLOR: Record<Rating, string> = { Low: "#1e7a4c", Medium: "#b7791f", High: "#c2410c", Critical: "#b42318" };

/** Six inherent-risk factors, each scored 1–3 on the processing itself, before controls. */
export const FACTORS: { key: string; label: string; levels: [string, string, string] }[] = [
  { key: "sensitivity", label: "Data sensitivity", levels: ["Basic contact data", "Financial data, NIN or BVN, ID documents", "Sensitive data (health, biometrics, religion, etc.) or children's data"] },
  { key: "volume", label: "Volume of data subjects", levels: ["Under 1,000", "1,000–50,000", "Over 50,000"] },
  { key: "access", label: "Access level", levels: ["Anonymised or no direct access", "Limited or read-only", "Full access, hosting, or system admin"] },
  { key: "location", label: "Data location", levels: ["Nigeria only", "Transfer with a valid lawful basis", "Transfer with an unclear or no lawful basis"] },
  { key: "subprocessing", label: "Sub-processing", levels: ["None", "Disclosed and contracted", "Undisclosed or extensive"] },
  { key: "criticality", label: "Business criticality", levels: ["Easily replaceable", "Important", "Core or critical service"] },
];

/** Six control domains, each scored 0–4 against the evidence. */
export const DOMAINS: { key: string; label: string; covers: string }[] = [
  { key: "governance", label: "Governance", covers: "DPO, DCPMI registration, Compliance Audit Return filed, policies" },
  { key: "security", label: "Information security", covers: "Encryption, access control, penetration tests, certifications" },
  { key: "incident", label: "Incident and breach management", covers: "Detection, response plan, notification to the controller" },
  { key: "transfers", label: "Sub-processors and transfers", covers: "Sub-processor management and cross-border transfer safeguards" },
  { key: "lifecycle", label: "Data lifecycle", covers: "Retention, deletion, return of data" },
  { key: "track", label: "Track record", covers: "Past breaches, sanctions, references" },
];
export const SCORE_LABELS = ["0 · No control", "1 · Ad hoc", "2 · Documented", "3 · Implemented with evidence", "4 · Independently certified or audited"];

/** Any one forces the rating to Critical, whatever the score. */
export const KNOCKOUTS: { key: string; label: string }[] = [
  { key: "dpa", label: "Refuses to sign a DPA or to grant audit rights" },
  { key: "transfer", label: "Transfers data across borders with no lawful basis" },
  { key: "breach", label: "Has an unremediated breach or an outstanding NDPC sanction" },
  { key: "subs", label: "Refuses to disclose its sub-processors" },
];

/** Evidence requested from the processor: the control domain it scores and the lowest impact that triggers it. */
export const EVIDENCE: { name: string; domain: string; from: 1 | 3 | 4; when?: "dcpmi" | "transfer" }[] = [
  { name: "Completed due diligence or security questionnaire", domain: "All", from: 1 },
  { name: "NDPC DCPMI registration and latest Compliance Audit Return", domain: "governance", from: 1, when: "dcpmi" },
  { name: "DPO designation and contact details", domain: "governance", from: 1 },
  { name: "Privacy policy and data protection policy", domain: "governance", from: 1 },
  { name: "Sub-processor list with locations", domain: "transfers", from: 1 },
  { name: "Information security policy; ISO 27001 or SOC 2 if held", domain: "security", from: 3 },
  { name: "Incident and breach response plan, including notification procedure", domain: "incident", from: 3 },
  { name: "Data retention and deletion or return policy", domain: "lifecycle", from: 3 },
  { name: "Cross-border transfer mechanism", domain: "transfers", from: 3, when: "transfer" },
  { name: "Business continuity and disaster recovery plan", domain: "security", from: 4 },
  { name: "Penetration test or vulnerability assessment summary from the last 12 months", domain: "security", from: 4 },
  { name: "Staff data protection training records", domain: "governance", from: 4 },
];

/** DPA clauses checked at treatment (NDPA s.29). */
export const DPA_CLAUSES: { key: string; label: string; enhanced?: boolean }[] = [
  { key: "instructions", label: "Processes only on the controller's documented instructions" },
  { key: "confidentiality", label: "Confidentiality of staff with access" },
  { key: "security", label: "Appropriate technical and organisational security measures" },
  { key: "subprocessors", label: "Prior authorisation for sub-processors, with the same obligations passed down" },
  { key: "assistance", label: "Assists with data subject rights, DPIAs and NDPC consultation" },
  { key: "breach", label: "Breach notice to the controller within the agreed window", enhanced: true },
  { key: "audit", label: "Audit and inspection rights", enhanced: true },
  { key: "exit", label: "Deletion or return of data at the end of the contract, with certificate" },
  { key: "transfers", label: "No transfer outside Nigeria without a lawful basis (NDPA ss.41–43)" },
];
export const DPA_STATUS = ["Not started", "Drafted", "In negotiation", "Signed", "Refused"];

export type Model = {
  version: number;
  weights: Record<string, number>; // percent, sums to 100
  impact_bands: [number, number, number, number]; // upper factor total for Impact 1, 2, 3, 4 (5 above)
  likelihood_bands: [number, number, number, number]; // lowest control % for Likelihood 1, 2, 3, 4 (5 below)
  rating_bands: [number, number, number]; // highest residual for Low, Medium, High (Critical above)
  review_months: Record<Rating, number>; // 0 = before any data is shared
  floor: number; // minimum Impact for sensitive or children's data (0 = off)
  breach_hours: number; // default breach-notice window in the DPA
};

export const DEFAULT_MODEL: Model = {
  version: 0,
  weights: { governance: 20, security: 30, incident: 15, transfers: 15, lifecycle: 10, track: 10 },
  impact_bands: [7, 9, 12, 15],
  likelihood_bands: [85, 70, 50, 30],
  rating_bands: [4, 9, 16],
  review_months: { Low: 24, Medium: 12, High: 6, Critical: 0 },
  floor: 4,
  breach_hours: 24,
};

export const IMPACT_NAMES = ["", "Negligible", "Minor", "Moderate", "Major", "Severe"];
export const LIKELIHOOD_NAMES = ["", "Rare", "Unlikely", "Possible", "Likely", "Almost certain"];
export const DECISION: Record<Rating, string> = { Low: "Approve", Medium: "Approve", High: "Conditional approval", Critical: "Do not engage, or suspend" };
export const REQUIREMENTS: Record<Rating, string> = {
  Low: "Standard DPA.",
  Medium: "Standard DPA plus fixes for minor gaps.",
  High: "Remediation plan with owners and deadlines; enhanced DPA clauses (audit rights and a short breach-notice window); DPIA check; Lead Consultant sign-off.",
  Critical: "Escalate to client management; reassess after remediation; consider consulting the NDPC if the engagement must proceed.",
};

/** Merge a stored model over the default so a missing key never breaks scoring. */
export function asModel(m: unknown): Model {
  const x = (m && typeof m === "object" ? m : {}) as Partial<Model>;
  return { ...DEFAULT_MODEL, ...x, weights: { ...DEFAULT_MODEL.weights, ...(x.weights ?? {}) }, review_months: { ...DEFAULT_MODEL.review_months, ...(x.review_months ?? {}) } };
}

const int = (v: unknown, lo: number, hi: number) => { const n = Number(v); return v !== "" && v != null && Number.isInteger(n) && n >= lo && n <= hi ? n : null; };
const yes = (v: unknown) => v === "on" || v === "yes" || v === "1" || v === true;

export type Result = {
  factors: (number | null)[]; factorTotal: number | null; impactRaw: number | null; impact: number | null; floored: boolean;
  domains: (number | null)[]; controlPct: number | null; likelihood: number | null;
  residual: number | null; scored: Rating | null; knockouts: string[]; rating: Rating | null; overridden: boolean;
  decision: string | null; reviewMonths: number | null; tier: number; sensitive: boolean; transfer: boolean; dpiaPrompt: boolean;
};

/** Score an assessment's answers under a model. Answer keys: f_<factor>, d_<domain>, ko_<knockout>, override_rating. */
export function score(a: Record<string, unknown>, model: Model = DEFAULT_MODEL): Result {
  const factors = FACTORS.map((f) => int(a[`f_${f.key}`], 1, 3));
  const factorTotal = factors.every((x) => x != null) ? factors.reduce<number>((s, x) => s + x!, 0) : null;
  const ib = model.impact_bands;
  const impactRaw = factorTotal == null ? null : factorTotal <= ib[0] ? 1 : factorTotal <= ib[1] ? 2 : factorTotal <= ib[2] ? 3 : factorTotal <= ib[3] ? 4 : 5;
  const sensitive = factors[0] === 3;
  const floored = impactRaw != null && sensitive && model.floor > impactRaw;
  const impact = impactRaw == null ? null : floored ? model.floor : impactRaw;

  const domains = DOMAINS.map((d) => int(a[`d_${d.key}`], 0, 4));
  const controlPct = domains.every((x) => x != null) ? Math.round(DOMAINS.reduce((s, d, i) => s + (model.weights[d.key] ?? 0) * domains[i]! / 4, 0) * 10) / 10 : null;
  const lb = model.likelihood_bands;
  const likelihood = controlPct == null ? null : controlPct >= lb[0] ? 1 : controlPct >= lb[1] ? 2 : controlPct >= lb[2] ? 3 : controlPct >= lb[3] ? 4 : 5;

  const residual = impact != null && likelihood != null ? impact * likelihood : null;
  const rb = model.rating_bands;
  const scored: Rating | null = residual == null ? null : residual <= rb[0] ? "Low" : residual <= rb[1] ? "Medium" : residual <= rb[2] ? "High" : "Critical";
  const knockouts = KNOCKOUTS.filter((k) => yes(a[`ko_${k.key}`])).map((k) => k.label);
  const override = RATINGS.includes(a.override_rating as Rating) ? (a.override_rating as Rating) : null;
  const base: Rating | null = knockouts.length ? "Critical" : scored;
  const rating = override ?? base;
  const transfer = (factors[3] ?? 1) > 1 || a.leaves_nigeria === "Yes";
  return {
    factors, factorTotal, impactRaw, impact, floored, domains, controlPct, likelihood, residual, scored, knockouts, rating, overridden: !!override && override !== base,
    decision: rating ? DECISION[rating] : null, reviewMonths: rating ? model.review_months[rating] : null,
    tier: impact ?? 1, sensitive, transfer,
    dpiaPrompt: (rating === "High" || rating === "Critical") && (sensitive || (factors[1] ?? 0) === 3 || yes(a.high_risk)),
  };
}

/** Evidence items to request at this impact. */
export function checklist(r: Pick<Result, "tier" | "transfer">, a: Record<string, unknown> = {}) {
  return EVIDENCE.map((e, i) => ({ ...e, i, needed: r.tier >= e.from && (e.when !== "transfer" || r.transfer) && (e.when !== "dcpmi" || String(a.dcpmi ?? "") !== "Not a DCPMI") }));
}

/** Add months to an ISO date (yyyy-mm-dd). */
export function addMonths(iso: string, months: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
}

/** Validate a model posted from the settings page; returns an error message or the model. */
export function checkModel(m: Model): string | null {
  const w = Object.values(m.weights);
  if (w.some((x) => !Number.isFinite(x) || x < 0)) return "Weights must be zero or more.";
  if (Math.round(w.reduce((s, x) => s + x, 0)) !== 100) return "Weights must add up to 100%.";
  const asc = (xs: number[]) => xs.every((x, i) => i === 0 || x > xs[i - 1]);
  if (!asc(m.impact_bands) || m.impact_bands[0] < 6 || m.impact_bands[3] >= 18) return "Impact thresholds must rise between 6 and 17.";
  if (!asc([...m.likelihood_bands].reverse()) || m.likelihood_bands[0] > 100 || m.likelihood_bands[3] <= 0) return "Likelihood thresholds must fall from 100% towards 0%.";
  if (!asc(m.rating_bands) || m.rating_bands[0] < 1 || m.rating_bands[2] >= 25) return "Rating bands must rise between 1 and 24.";
  if (Object.values(m.review_months).some((x) => !Number.isInteger(x) || x < 0 || x > 60)) return "Review cycles must be whole months from 0 to 60.";
  if (![0, 2, 3, 4, 5].includes(m.floor)) return "The floor must be off or an Impact from 2 to 5.";
  if (!Number.isInteger(m.breach_hours) || m.breach_hours < 1 || m.breach_hours > 720) return "The breach-notice window must be 1 to 720 hours.";
  return null;
}
