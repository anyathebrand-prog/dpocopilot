// CAR audit report and remediation plan for one client and audit year, in the DPCO report format (blog/Report.pdf).
// Built from the CAR checklist, other findings, onboarding answers, RoPA, the firm profile and the report details.
import { q, one } from "./db";
import { answersOf } from "./data";
import { list } from "./questionnaire";
import { CAR_CATEGORIES, readiness, carRisk, carItemRisk, assurance, maturityLevel, MATURITY, remediationDue, fmtDate, todayWAT } from "./rules";

export type Item = { id: string; category_key: string; section: string | null; item_text: string; status: string; priority: string | null; answer: string | null; na_reason: string | null; recommendation: string | null };
export type Finding = { id: string; observation: string; risk: string; recommendation: string | null; status: string };
export type CarReport = NonNullable<Awaited<ReturnType<typeof loadCarReport>>>;

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const cssString = (s: string) => `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
const RISK = { high: "High", medium: "Medium", low: "Low" } as Record<string, string>;
/** A control as a phrase inside a sentence: no trailing "?", ordinary capitals lowered, acronyms (NDPC, DPO) kept. */
const phrase = (t: string) => { const x = t.replace(/\?$/, ""); return /^[A-Z][a-z]/.test(x) ? x[0].toLowerCase() + x.slice(1) : x; };
const SCOPE: Record<string, string> = {
  governance: "Review of governance structure, DPO arrangements, data protection policies, training, internal reporting and organisational safeguards.",
  principles: "Review of transparency, lawfulness, fairness, purpose limitation, data minimisation, accuracy, retention, confidentiality and accountability.",
  technology: "Review of technical safeguards, access controls, storage controls, disaster recovery, security standards and protection of personal data.",
  accountability_risk: "Review of DPIA, LIA, breach/complaint records, DSAR processes, ROPA, lawful basis documentation and SAPR reporting.",
  cross_border_transfer: "Review of personal data transfer outside Nigeria, transfer basis, destination country, documentation and safeguards.",
  data_processors: "Review of third-party processor arrangements, contracts, due diligence, access control and post-termination safeguards.",
};

export async function loadCarReport(clientId: string, year: number) {
  const items = await q<Item>(`select id, category_key, section, item_text, status, priority, answer, na_reason, recommendation from client_car_items
    where client_id = $1 and audit_year = $2 order by position`, [clientId, year]);
  if (!items.length) return null;
  const findings = await q<Finding>("select id, observation, risk, recommendation, status from car_findings where client_id = $1 and audit_year = $2 order by created_at", [clientId, year]);
  const c = (await one(`select c.name, c.sector, c.mi_class, f.name as firm_name, f.address as firm_address, f.website as firm_website, f.email as firm_email,
      f.phone as firm_phone, f.ndpc_licence_no, f.signatory_name, f.signatory_credentials, f.signatory_title
    from clients c join firms f on f.id = c.firm_id where c.id = $1`, [clientId]))!;
  const a = await answersOf(clientId);
  const ropa = await q<{ purpose: string; department: string | null; data_categories: string | null }>(
    "select purpose, department, data_categories from ropa_entries where client_id = $1 and state = 'active' order by department nulls last, purpose", [clientId]);
  const rep = (await one("select background, conclusion_notes, verified_on, maturity_override from car_reports where client_id = $1 and audit_year = $2", [clientId, year])) ?? {};
  const str = (k: string) => (typeof a[k] === "string" && (a[k] as string).trim() ? (a[k] as string).trim() : null);

  const org = str("org_legal_name") ?? c.name;
  const answerOf = (re: RegExp) => items.find((i) => re.test(i.item_text));
  const reg = answerOf(/registered with the NDPC/i), regNo = answerOf(/NDPC registration number/i)?.answer;
  const subjects = answerOf(/how many data subjects/i)?.answer ?? str("subjects_6mo");
  const r = readiness(items);
  const parts = Object.entries(CAR_CATEGORIES).filter(([k]) => items.some((i) => i.category_key === k));
  const risk = (i: Item) => carItemRisk(i.status, i.priority) ?? "low";
  const included = items.filter((i) => (i.status !== "complete" && i.status !== "not_applicable") || i.na_reason || i.recommendation);
  return {
    year, org, items, findings, ropa, parts, readiness: r, risk, included,
    client: c,
    reportDate: (rep.verified_on as string | undefined) ?? todayWAT(),
    background: (rep.background as string | undefined)?.trim() || defaultBackground(org, a),
    conclusionNotes: (rep.conclusion_notes as string | undefined)?.trim() ?? "",
    maturity: (rep.maturity_override as number | undefined) ?? maturityLevel(r.overall.pct),
    profile: {
      address: str("org_address"), phone: str("org_phone"), email: str("org_email"), website: str("org_website"), sector: str("org_sector") ?? c.sector,
      location: str("org_branch"), dpo: str("dpo_name"),
      registration: !reg ? null : reg.status === "complete" || /^y/i.test(reg.answer ?? "") ? `Registered with the NDPC${regNo ? ` (registration number ${regNo})` : "; registration number not provided"}.`
        : reg.status === "missing" ? "Registration with the NDPC is not in place or was not evidenced." : `Registration status: ${reg.answer ?? "being confirmed"}.`,
      classification: c.mi_class === "major_importance" ? "Data Controller/Data Processor of Major Importance, subject to NDPC confirmation."
        : c.mi_class === "not_major_importance" ? "Not of major importance." : "Not yet classified.",
      subjects,
    },
  };
}

/** Background paragraph from the onboarding answers, used until the consultant writes one. */
export function defaultBackground(org: string, a: Record<string, unknown>) {
  const s = (k: string) => (typeof a[k] === "string" && (a[k] as string).trim() ? (a[k] as string).trim() : null);
  const depts = list(a.org_departments), whose = [...list(a.subjects), ...list(a.subjects_other)], purposes = list(a.purposes);
  return [
    `${org} is ${s("org_sector") ? `an organisation in the ${s("org_sector")!.toLowerCase()} sector` : "an organisation"}${s("org_address") ? `, with its head office at ${s("org_address")}` : ""}.`,
    depts.length ? `Its departments include ${depts.join(", ")}.` : "",
    whose.length ? `It collects and processes personal data relating to ${whose.join(", ").toLowerCase()}${purposes.length ? `, for purposes including ${purposes.join(", ").toLowerCase()}` : ""}.` : "",
  ].filter(Boolean).join(" ");
}

export const observation = (i: Item) => i.na_reason?.trim() || `${i.answer ? `Response: ${i.answer}. ` : ""}${
  i.status === "missing" ? "Not in place, or no evidence was provided." : i.status === "in_progress" ? "Partially in place; implementation or evidence is incomplete."
    : i.status === "complete" ? "In place." : "Not applicable."}`;
export const recommendation = (i: Item) => i.recommendation?.trim() || "Agree a corrective action with management and retain evidence of implementation.";

export const CSS = (header: string) => `
@page { size: A4; margin: 22mm 17mm 20mm; @top-center { content: ${cssString(header)}; font: 8pt Arial, sans-serif; color: #5f6878; } @bottom-right { content: "pg. " counter(page); font: 8pt Arial, sans-serif; color: #5f6878; } }
@page :first { @top-center { content: none; } @bottom-right { content: none; } }
body { font: 10.5pt/1.55 Arial, "Segoe UI", sans-serif; color: #1b2433; max-width: 820px; margin: 24px auto; padding: 0 20px; }
h1, h2, h3 { color: #0d1f4a; } h1 { font-size: 20pt; margin: 0 0 12px; } h2 { font-size: 14pt; margin: 22px 0 8px; } h3 { font-size: 11.5pt; margin: 16px 0 6px; }
.break { break-before: page; } table { width: 100%; border-collapse: collapse; margin: 8px 0 14px; font-size: 9.5pt; }
th, td { border: 1px solid #c9ced6; padding: 6px 8px; text-align: left; vertical-align: top; } th { background: #0d1f4a; color: #fff; font-weight: 600; }
tr { break-inside: avoid; } td.k { width: 30%; font-weight: 600; background: #f4f6fa; } .sub td { background: #e8eef7; font-weight: 600; }
.cover { min-height: 250mm; display: flex; flex-direction: column; justify-content: center; border-left: 10px solid #0d1f4a; padding-left: 28px; }
.cover .year { font-size: 44pt; font-weight: 700; color: #2a6aa8; line-height: 1; } .cover .title { font-size: 26pt; font-weight: 700; color: #0d1f4a; margin: 10px 0 28px; line-height: 1.15; }
.muted { color: #5f6878; } .note { font-size: 9pt; color: #5f6878; font-style: italic; }
.r-high { color: #b42318; font-weight: 700; } .r-medium { color: #b26a00; font-weight: 700; } .r-low { color: #1e7a4c; font-weight: 700; }
.sign { margin-top: 28px; } .sign .line { border-top: 1px solid #1b2433; width: 260px; margin-top: 36px; padding-top: 4px; }
.noprint { margin: 12px 0; } @media print { .noprint { display: none; } body { margin: 0; max-width: none; } }`;

const riskCell = (r: string) => `<td class="r-${r}">${RISK[r] ?? r}</td>`;
const firmBlock = (c: CarReport["client"]) => [c.firm_name, c.firm_address, c.firm_website, c.firm_email, c.firm_phone].filter(Boolean).map((x) => esc(x)).join("<br>");
const notStated = (v: unknown) => (v ? esc(v) : `<span class="muted">Not stated in the questionnaire</span>`);

/** The audit report as print-ready HTML (title, styles, body), following the DPCO report structure. */
export function carReportHtml(d: CarReport) {
  const c = d.client, o = esc(d.org), Y = d.year;
  const highItems = d.items.filter((i) => i.status !== "complete" && i.status !== "not_applicable" && d.risk(i) === "high");
  const highFindings = d.findings.filter((f) => f.status === "open" && f.risk === "high");
  const done = d.items.filter((i) => i.status === "complete");
  const gaps = d.items.filter((i) => i.status === "missing" || i.status === "in_progress");
  const [lvl, lvlName, lvlText] = MATURITY[d.maturity - 1];
  const header = `${d.org} Data Protection Compliance Audit Report © ${c.firm_name}`;

  const partSummary = (k: string) => {
    const it = d.items.filter((i) => i.category_key === k), cr = carRisk(it), app = it.filter((i) => i.status !== "not_applicable");
    const keyGaps = it.filter((i) => i.status !== "complete" && i.status !== "not_applicable").sort((x, y) => "hml".indexOf(d.risk(x)[0]) - "hml".indexOf(d.risk(y)[0])).slice(0, 3);
    return { rating: assurance(cr?.score), text: `${app.filter((i) => i.status === "complete").length} of ${app.length} controls in place.${keyGaps.length ? ` Key gaps: ${keyGaps.map((i) => i.item_text.replace(/\?$/, "")).join("; ")}.` : " No significant gaps identified."}` };
  };

  const body = `
<section class="cover">
  <div class="year">${Y}</div><div class="title">DATA PROTECTION<br>COMPLIANCE AUDIT REPORT</div>
  <p style="font-size:12pt"><b>${esc(c.firm_name)}</b><br>${[c.firm_address, c.firm_website, c.firm_email, c.firm_phone].filter(Boolean).map(esc).join("<br>")}</p>
  <p style="margin-top:28px"><b>Abstract</b><br>Prepared in line with the Nigeria Data Protection Act, 2023, the NDP Act GAID and applicable NDPC audit requirements.</p>
</section>

<section class="break">
  <p class="muted" style="font-size:14pt;margin:0">${Y} DATA PROTECTION ANNUAL AUDIT REPORT</p>
  <h1 style="font-size:24pt;margin:8px 0 18px">${o.toUpperCase()}</h1>
  <table><tr><td class="k">ORGANISATION</td><td>${o}</td></tr><tr><td class="k">SECTOR</td><td>${notStated(d.profile.sector)}</td></tr>
  <tr><td class="k">ADDRESS</td><td>${notStated(d.profile.address)}</td></tr><tr><td class="k">REPORT YEAR</td><td>${Y}</td></tr></table>

  <h2>Data Protection Annual Audit Report</h2>
  <table>
    <tr><td class="k">Name of Organisation</td><td>${o}</td></tr>
    <tr><td class="k">Official Address</td><td>${notStated(d.profile.address)}</td></tr>
    <tr><td class="k">Phone</td><td>${notStated(d.profile.phone)}</td></tr>
    <tr><td class="k">Email</td><td>${notStated(d.profile.email)}</td></tr>
    <tr><td class="k">Website</td><td>${notStated(d.profile.website)}</td></tr>
    <tr><td class="k">Sector</td><td>${notStated(d.profile.sector)}</td></tr>
    <tr><td class="k">Branch / Location</td><td>${notStated(d.profile.location)}</td></tr>
    <tr><td class="k">Registration Status</td><td>${notStated(d.profile.registration)}</td></tr>
    <tr><td class="k">Registration Classification</td><td>${esc(d.profile.classification)}</td></tr>
    <tr><td class="k">Data Protection Officer</td><td>${notStated(d.profile.dpo)}</td></tr>
    <tr><td class="k">DPCO Name</td><td>${esc(c.firm_name)}</td></tr>
    <tr><td class="k">DPCO Email</td><td>${notStated(c.firm_email)}</td></tr>
    <tr><td class="k">Estimated Data Subjects</td><td>${d.profile.subjects ? `The questionnaire indicates at least ${esc(d.profile.subjects)} data subjects processed in the period assessed.` : notStated(null)}</td></tr>
  </table>
  <p class="note">The above information is based on the organisation profile details available to the audit team and responses contained in the audit questionnaire completed for ${o}.</p>

  <h2>Table of Contents</h2>
  <table><tr><th>Section</th></tr>${["Audit Verification Statement", "1.0 Executive Summary", "2.0 Audit Process Activities", "3.0 Risk Classifications", "4.0 Audit Scope and Audit Summary", "5.0 Audit Findings", "6.0 High Risk Audit Findings", "7.0 Conclusion"].map((s) => `<tr><td>${s}</td></tr>`).join("")}</table>
</section>

<section class="break">
  <h1>Audit Verification Statement</h1>
  <p>I, ${notStated(c.signatory_name)} of ${esc(c.firm_name)}, a licensed Data Protection Compliance Organisation (DPCO), hereby make this verification statement that the Data Protection Audit Report herein filed for ${o} was conducted in line with the Nigeria Data Protection Act, 2023, the NDP Act GAID and the audit methodology prescribed by the Nigeria Data Protection Commission. The report is, to the best of our professional assessment, an accurate reflection of the organisation's personal data management practices based on documents reviewed, questionnaire responses obtained and audit procedures performed.</p>
  <table><tr><td class="k">Licence Number</td><td>${notStated(c.ndpc_licence_no)}</td></tr><tr><td class="k">Date</td><td>${fmtDate(d.reportDate)}</td></tr></table>

  <h1 style="margin-top:28px">Report of Data Protection Audit for ${o}</h1>
  <h2>1.0 Executive Summary</h2>
  <h3>1.1 Background</h3>${d.background.split(/\r?\n\s*\r?\n/).map((p) => `<p>${esc(p)}</p>`).join("")}
  <h3>1.2 Nature and Basis of the Audit</h3>
  <p>This audit was performed to assess ${o}'s compliance posture under the Nigeria Data Protection Act, 2023, the NDP Act GAID and applicable NDPC audit expectations. The audit relied primarily on questionnaire responses, available evidence indications, review of relevant process areas, and risk-based assessment of governance, lawful basis, data protection principles, security controls, accountability records, cross-border transfers and third-party processor arrangements.</p>
  <p>Of ${d.readiness.overall.applicable} applicable controls assessed, ${d.readiness.overall.complete} (${d.readiness.overall.pct}%) were found to be in place${done.length ? `, including: ${done.slice(0, 4).map((i) => phrase(i.item_text)).join("; ")}` : ""}. ${gaps.length ? `${gaps.length} control${gaps.length > 1 ? "s" : ""} require${gaps.length > 1 ? "" : "s"} management attention, of which ${highItems.length + highFindings.length} ${highItems.length + highFindings.length === 1 ? "is" : "are"} assessed as high risk.` : "No control gaps were identified."}</p>
  <h3>1.3 Audit Objective</h3>
  <ul><li>Define the scope of coverage for the audit, including governance, accountability, data protection function, data protection principles, documentation, processing activities and data security controls.</li>
  <li>Review ${o}'s responses, documents and practices relating to personal data processing across its operations.</li>
  <li>Provide reasonable assurance to management on the effectiveness of controls used in the collection, storage, use, disclosure, retention and protection of personal data.</li>
  <li>Identify non-conformities, assess their implications and provide practical recommendations for remediation in line with the NDPA, GAID and NDPC requirements.</li>
  <li>Support ${o} and the licensed DPCO in preparing a complete compliance file for NDPC filing and future regulatory review.</li></ul>
</section>

<section class="break">
  <h2>2.0 Audit Process Activities</h2>
  <table>
    <tr><td class="k">Planning Phase</td><td>Determine audit subject; define audit objective; set audit scope; agree document request list; identify key departments and stakeholders.</td></tr>
    <tr><td class="k">Fieldwork and Documentation Phase</td><td>Review questionnaire responses, policies, forms, portals, records, contracts, ICT controls, privacy notices and departmental practices; validate evidence where made available.</td></tr>
    <tr><td class="k">Testing and Classification Phase</td><td>Assess controls against NDPA/NDPC expectations; classify gaps by risk level; review whether processing aligns with principles of data protection.</td></tr>
    <tr><td class="k">Reporting Phase</td><td>Prepare draft report; discuss findings with management; agree remediation actions, responsibilities and timelines; issue verified report through licensed DPCO.</td></tr>
    <tr><td class="k">Follow-up Phase</td><td>Monitor closure of corrective actions; update ROPA, DPIA, training records, policies and annual filing evidence.</td></tr>
  </table>
  <h3>Audit Methodology</h3>
  <p>The audit adopted a risk-based approach involving desk review of questionnaire responses, assessment of control evidence indicated by the organisation, evaluation of key data processing areas and mapping of observed gaps to NDPA/NDPC expectations. Where evidence was not provided, a response was left blank, or the response indicated "No", the matter was treated as a control gap and appropriate recommendations were made.</p>
  <h2>3.0 Risk Classifications</h2>
  <table><tr><th>Level</th><th>Description</th></tr>
    <tr><td class="r-high">High</td><td>The vulnerability poses an urgent threat to the organisation, regulatory compliance, data subjects or operations. Remediation should be prioritised.</td></tr>
    <tr><td class="r-medium">Medium</td><td>Successful exploitation or compliance failure is possible and may result in notable disruption, regulatory exposure or impairment of data subject rights. Remediation should be completed within a reasonable timeframe.</td></tr>
    <tr><td class="r-low">Low</td><td>The vulnerability poses a limited immediate threat. It should be monitored and remediated as part of continuous improvement.</td></tr></table>
  <p class="note">Each control's risk follows its assessed status and the priority of the audit parameter: a missing control is high risk, a partly implemented one medium, and an implemented one low; controls of medium priority are rated one level lower. High/Red findings are significant and may undermine the legality, safety and integrity of processing operations. Medium/Amber findings require structured remediation. Low/Green findings should be monitored and improved as part of ongoing maturity development.</p>
</section>

<section class="break">
  <h2>4.0 Audit Scope</h2>
  <p>The scope of the data protection audit was to assess the effectiveness of the technical and organisational measures put in place by management for the protection of personally identifiable information within ${o}'s systems, departments, service units and business processes.</p>
  <table>${d.parts.map(([k, l]) => `<tr><td class="k">${esc(l.replace(/^Part \d+: /, ""))}</td><td>${SCOPE[k] ?? ""}</td></tr>`).join("")}</table>
  <h3>Institutional Data Processing Context</h3>
  ${d.ropa.length ? `<table><tr><th>Area</th><th>Personal Data Processed</th><th>Purpose</th></tr>${d.ropa.map((x) => `<tr><td>${esc(x.department ?? x.purpose)}</td><td>${esc(x.data_categories ?? "Not recorded")}</td><td>${esc(x.purpose)}</td></tr>`).join("")}</table>`
    : `<p class="muted">No processing activities have been recorded in the Record of Processing Activities yet.</p>`}
  <h2>Audit Summary</h2>
  <table><tr><th>Audit Area</th><th>Assurance Rating</th><th>Summary Assessment</th></tr>
  ${d.parts.map(([k, l]) => { const s = partSummary(k); return `<tr><td>${esc(l.replace(/^Part \d+: /, ""))}</td><td><b>${s.rating}</b></td><td>${esc(s.text)}</td></tr>`; }).join("")}</table>
  <p class="note">Assurance ratings follow each area's risk score: Substantial (below 20), Reasonable (20–49), Limited (50–79), No assurance (80 and above).</p>
</section>

<section class="break">
  <h2>5.0 Audit Findings</h2>
  <p>The tables below identify areas for improvement arising from the questionnaire responses and evidence indicated during the audit process.</p>
  ${d.parts.map(([k, l]) => {
    const rows = d.included.filter((i) => i.category_key === k);
    if (!rows.length) return `<h3>${esc(l.toUpperCase())}</h3><p class="muted">All controls in this area were assessed as in place.</p>`;
    return `<h3>${esc(l.toUpperCase())}</h3><table><tr><th style="width:26%">Control</th><th>Non-conformity / Observation</th><th>Recommendation</th><th style="width:9%">Priority</th></tr>${rows.map((i, n) =>
      (i.section && i.section !== rows[n - 1]?.section ? `<tr class="sub"><td colspan="4">${esc(i.section)}</td></tr>` : "") +
      `<tr><td>${esc(i.item_text)}</td><td>${esc(observation(i))}</td><td>${esc(recommendation(i))}</td>${riskCell(d.risk(i))}</tr>`).join("")}</table>`;
  }).join("")}
  ${d.findings.length ? `<h3>OTHER FINDINGS AND OBSERVATIONS</h3><table><tr><th>Finding / Observation</th><th>Recommendation</th><th style="width:10%">Status</th><th style="width:9%">Priority</th></tr>${d.findings.map((f) =>
    `<tr><td>${esc(f.observation)}</td><td>${esc(f.recommendation ?? "Agree a corrective action with management and retain evidence of implementation.")}</td><td>${f.status === "resolved" ? "Resolved" : "Open"}</td>${riskCell(f.risk)}</tr>`).join("")}</table>` : ""}
</section>

<section class="break">
  <h2>6.0 High Risk Audit Findings</h2>
  <p>We carried out the audit of ${o}'s data protection processes and systems in line with the Nigeria Data Protection Act, 2023, applicable NDPC requirements and the audit approach set out in this report. ${highItems.length + highFindings.length ? "The following high-risk matters require urgent management attention:" : "No high-risk matters were identified."}</p>
  ${highItems.length + highFindings.length ? `<ul>${[...highItems.map((i) => i.na_reason?.trim() || `${i.item_text.replace(/\?$/, "")}: not in place or not evidenced.`), ...highFindings.map((f) => f.observation)].map((t) => `<li>${esc(t)}</li>`).join("")}</ul>
  <p>These findings should be prioritised in management's remediation plan because they affect accountability, transparency, breach readiness, regulatory reporting and the organisation's ability to demonstrate compliance to the NDPC.</p>` : ""}

  <h2>7.0 Conclusion</h2>
  <p>${done.length ? `The audit shows that ${o} has taken steps toward data protection compliance, with ${d.readiness.overall.complete} of ${d.readiness.overall.applicable} applicable controls in place, including ${done.slice(0, 5).map((i) => phrase(i.item_text)).join("; ")}. These are useful foundations for a structured compliance programme.` : `The audit found that ${o} is at an early stage of data protection compliance, with few of the controls assessed yet in place.`}</p>
  ${gaps.length ? `<p>However, the audit identified gaps that require management attention${highItems.length ? `, the most significant relating to: ${highItems.slice(0, 8).map((i) => phrase(i.item_text)).join("; ")}` : ""}. Management should therefore prioritise a practical remediation plan with clear responsibilities, timelines and evidence requirements.</p>` : ""}
  ${d.conclusionNotes ? d.conclusionNotes.split(/\r?\n\s*\r?\n/).map((p) => `<p>${esc(p)}</p>`).join("") : ""}
  <p>Overall, ${o} is assessed at <b>Maturity Level ${lvl} (${lvlName})</b>. ${lvlText}</p>
  <p>Please find attached the detailed observations and risk profile for management attention.</p>
  <div class="sign"><div class="line">${notStated(c.signatory_name)}${c.signatory_credentials ? `, ${esc(c.signatory_credentials)}` : ""}</div>
    <p style="margin:4px 0 0">${c.signatory_title ? `${esc(c.signatory_title)}<br>` : ""}${firmBlock(c)}</p></div>
</section>`;
  return { title: `${d.org} Data Protection Compliance Audit Report ${Y}`, css: CSS(header), body };
}
