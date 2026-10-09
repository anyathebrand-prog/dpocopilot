// CAR audit work plan per department (blog/University_NDPA_GAID_CAR_Audit_Work_Plan.xlsx): the 22 base controls every
// unit is audited against, worded for the department, plus the controls specific to the closest matching unit in the plan.
import { BASE_CONTROLS, UNITS, type Control, type Unit } from "./audit-workplan-data.ts";

const STOP = new Set(["of", "and", "the", "&", "department", "dept", "directorate", "unit", "office", "faculty", "school", "registry", "university", "centre", "center", "division", "section", "services", "service", "studies", "sciences", "sci", "general", "main", "head", "for"]);
// Common names in client organograms → words used in the work plan's unit names.
const SYN: [RegExp, string][] = [
  [/\b(hr|human|personnel|people|establishments?|staff)\b/, "establishments human resources"],
  [/\b(ict|it|technology|digital|computer|systems)\b/, "information communication technology dict"],
  [/\b(finance|financial|accounts?|accounting|treasury|payroll|bursary)\b/, "bursary"],
  [/\b(marketing|communications?|pr|public|media|protocol|brand|corporate)\b/, "information public relations protocol"],
  [/\b(legal|compliance|secretariat|company secretary)\b/, "legal"],
  [/\b(procurement|purchasing|supply|stores)\b/, "procurement"],
  [/\b(security|safety)\b/, "security"],
  [/\b(health|medical|clinic|hospital)\b/, "health"],
  [/\b(admissions?|enrolment|enrollment)\b/, "admissions"],
  [/\b(exams?|examinations?|records)\b/, "examinations records"],
  [/\b(student|welfare|hostel|halls?)\b/, "student affairs"],
  [/\b(research|innovation|r&d)\b/, "research innovation development"],
  [/\b(alumni|advancement|endowment|fundraising)\b/, "advancement alumni endowment"],
  [/\b(works|estate|facilities|maintenance|physical)\b/, "physical planning works"],
  [/\b(council|senate|board)\b/, "council senate"],
  [/\b(linkages|international|partnerships?)\b/, "linkages international collaborations"],
  [/\b(quality|audit)\b/, "quality assurance"],
  [/\b(dpo|data protection|privacy)\b/, "data protection dpo"],
];
const words = (s: string) => s.toLowerCase().replace(/[^a-z0-9& ]+/g, " ").split(/\s+/).filter((w) => w && !STOP.has(w));

/** The work plan unit that best matches a department name, or null (then only the base controls apply). */
export function matchUnit(dept: string): Unit | null {
  const d = dept.toLowerCase();
  const mine = new Set([...words(dept), ...SYN.filter(([re]) => re.test(d)).flatMap(([, w]) => words(w))]);
  let best: Unit | null = null, bestScore = 0;
  for (const u of UNITS) {
    const theirs = words(u.name), score = theirs.filter((w) => mine.has(w)).length / Math.sqrt(theirs.length || 1);
    if (score > bestScore) { best = u; bestScore = score; }
  }
  return bestScore >= 0.5 ? best : null;
}

/** Departments from the organogram's text (unit names, "Head, X" titles), then the onboarding department list. */
export function clientDepartments(organogramText: string | undefined, departments: string[]) {
  const out = new Map<string, string>();
  const add = (x: string) => { const k = x.trim().replace(/\s+/g, " "); if (k.length >= 2 && k.length <= 80 && !out.has(k.toLowerCase())) out.set(k.toLowerCase(), k); };
  for (const raw of (organogramText ?? "").split(/\n|\||•/)) {
    const line = raw.trim();
    const head = line.match(/^(?:head|director|dean|manager|hod|chief|lead)\b[\s,:–-]+(?:of\s+)?(.{2,60})$/i);
    if (head && !/^(?:executive|officer|operating|financial|technology)\b/i.test(head[1])) add(head[1]);
    else if (/\b(department|directorate|faculty|school|unit|office|division|registry|bursary|library|centre|center|institute|college|section)\b/i.test(line) && line.length <= 80) add(line);
  }
  for (const d of departments) add(d);
  return [...out.values()];
}

export type PlanRow = Control & { ref: string; specific: boolean };

/** The department's audit work plan. `ropa` = the client's RoPA entries for this department (purposes, data, systems). */
export function workplanFor(dept: string, ropa: { purpose: string; data_categories: string | null; system_owner: string | null }[] = []) {
  const unit = matchUnit(dept);
  const join = (xs: (string | null)[]) => [...new Set(xs.filter(Boolean).flatMap((x) => x!.split(/,\s*/)).map((x) => x.trim()).filter(Boolean))].join(", ");
  const kp = join(ropa.map((r) => r.purpose)) || unit?.keyProcesses || "";
  const data = join(ropa.map((r) => r.data_categories)) || unit?.data || "";
  const systems = join(ropa.map((r) => r.system_owner)) || unit?.systems || "";
  const prefix = dept.split(/[^A-Za-z]+/).filter((w) => w && !STOP.has(w.toLowerCase())).map((w) => w[0].toUpperCase()).join("").slice(0, 4) || "UNIT";
  const fill = (s: string) => s
    .replace(/ \(its key processes\)/, kp ? ` (${kp})` : "").replace(/ \(its data\)/, data ? ` (${data})` : "").replace(/ \(its systems\)/, systems ? ` (${systems})` : "")
    .replace(/its systems/, systems || "its systems").replace(/\{u\}|\{unit\}/g, dept).replace(/the unit's/g, `${dept}'s`).replace(/the unit\b/g, dept);
  const base = unit && !unit.baseRisk.length ? [] : BASE_CONTROLS.map((c, i) => ({ ...c, procedure: fill(c.procedure), objective: fill(c.objective), risk: unit?.baseRisk[i] || c.risk, specific: false }));
  const rows: PlanRow[] = [...base, ...(unit?.specific ?? []).map((c) => ({ ...c, procedure: fill(c.procedure), objective: fill(c.objective), specific: true }))]
    .map((c, i) => ({ ...c, ref: `${prefix}-${String(i + 1).padStart(2, "0")}` }));
  return { dept, unit, profile: { subjects: unit?.subjects ?? "", data, systems, keyProcesses: kp, risk: unit?.risk ?? "" }, rows };
}
