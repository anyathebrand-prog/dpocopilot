// Capacity building plan: the six data protection trainings a DPCO schedules for each client, and the printable plan.
import { CSS } from "./car-report";
import { fmtDate } from "./rules";

export const TRAININGS = {
  management: { name: "Management Training", audience: "Board, executive and senior management", about: "Accountability under the NDPA, governance, risk appetite, approving DPIAs and the framework, and sanctions." },
  dpo_certification: { name: "DPO Certification Training", audience: "Data Protection Officer and deputies", about: "Certification for the DPO (e.g. CDPO) as required for the role under NDPA s.32 and the GAID." },
  cpd: { name: "Continuous Professional Development (CPD) Training", audience: "DPO and data protection team", about: "Updates on NDPC guidance, the GAID, enforcement and practice, to keep certification current." },
  champion: { name: "Data Protection Champion Training", audience: "Data Protection Champions in each department", about: "The champion's role, RoPA upkeep, spotting and escalating breaches and data subject requests." },
  general_staff: { name: "General Staff Training", audience: "All staff, interns and contractors", about: "Data protection awareness: principles, rights, security habits, phishing, reporting incidents." },
  role_based: { name: "Role Based Data Protection Training", audience: "Staff in high-risk roles (HR, ICT, finance, customer service, marketing)", about: "Role-specific handling: consent and marketing, HR records, access control, transfers, retention." },
} as const;
export type TrainingKind = keyof typeof TRAININGS;
export const KINDS = Object.keys(TRAININGS) as TrainingKind[];

export const EVIDENCE_KINDS = { schedule: "Training schedule / agenda", attendance: "Attendance register", photo: "Pictures", video: "Videos", materials: "Training materials", certificate: "Certificates", other: "Other" } as const;

export const sessionDates = (t: Record<string, any>) =>
  `${fmtDate(t.starts_on)}${t.ends_on && t.ends_on !== t.starts_on ? ` – ${fmtDate(t.ends_on)}` : ""}${t.start_time ? `, ${t.start_time}` : ""}`;

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** The capacity building plan for one client and year: summary by training, then every session with its evidence. */
export function planHtml(org: string, firm: string, year: string, rows: any[], evidence: Record<string, { evidence_kind: string | null }[]>) {
  const status = (r: any) => (r.status === "completed" ? "Completed" : r.status === "cancelled" ? "Cancelled" : "Scheduled");
  const body = `
<section class="cover">
  <p style="font-size:12pt;margin:0"><b>${esc(org)}</b></p>
  <h1 style="font-size:28pt;margin:12px 0">Capacity Building Plan ${esc(year)}</h1>
  <p style="margin:0">Data protection training programme under the Nigeria Data Protection Act, 2023 and the GAID, 2025</p>
  <p class="muted" style="margin-top:28px">Prepared by ${esc(firm)}</p>
</section>
<section class="break">
  <h1>1. Training Programme</h1>
  <p>The NDPA requires controllers to implement organisational measures, including staff training and awareness, appropriate to the risk of their processing (s.39), and the GAID expects documented, periodic data protection training. This plan sets out the training ${esc(org)} will deliver in ${esc(year)}.</p>
  <table><tr><th>Training</th><th>Audience and focus</th><th style="width:12%">Sessions</th><th style="width:14%">Participants (planned / trained)</th></tr>
  ${KINDS.map((k) => { const rs = rows.filter((r) => r.kind === k && r.status !== "cancelled"); const p = rs.reduce((s, r) => s + (r.planned_participants ?? 0), 0), a = rs.reduce((s, r) => s + (r.actual_participants ?? 0), 0);
    return `<tr><td><b>${TRAININGS[k].name}</b></td><td>${TRAININGS[k].audience}. ${TRAININGS[k].about}</td><td>${rs.length || "Not scheduled"}</td><td>${rs.length ? `${p} / ${a}` : "—"}</td></tr>`; }).join("")}
  </table>
  <h1>2. Schedule</h1>
  ${rows.length ? `<table><tr><th>Training</th><th>Date</th><th>Mode / venue</th><th>Facilitator</th><th style="width:10%">Planned</th><th style="width:10%">Attended</th><th>Status</th><th>Evidence</th></tr>
  ${rows.map((r) => `<tr><td>${TRAININGS[r.kind as TrainingKind].name}${r.title ? `<br>${esc(r.title)}` : ""}</td><td>${sessionDates(r)}</td><td>${esc([r.mode, r.venue].filter(Boolean).join(", ")) || "—"}</td><td>${esc(r.facilitator) || "—"}</td><td>${r.planned_participants ?? "—"}</td><td>${r.actual_participants ?? "—"}</td><td>${status(r)}${r.completed_on ? ` ${fmtDate(r.completed_on)}` : ""}</td><td>${(evidence[r.id] ?? []).length ? Object.entries((evidence[r.id] ?? []).reduce((m: Record<string, number>, f) => ({ ...m, [f.evidence_kind ?? "other"]: (m[f.evidence_kind ?? "other"] ?? 0) + 1 }), {})).map(([k, n]) => `${EVIDENCE_KINDS[k as keyof typeof EVIDENCE_KINDS] ?? k} (${n})`).join(", ") : "—"}</td></tr>`).join("")}
  </table>` : `<p>No training sessions scheduled yet.</p>`}
</section>`;
  return { title: `${org} Capacity Building Plan ${year}`, css: CSS(`${org} · Capacity Building Plan ${year}`), body };
}
