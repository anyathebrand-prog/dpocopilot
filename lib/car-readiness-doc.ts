// CAR Readiness Document: sent to the client before the annual data protection compliance audit. It lists, in eight
// groups, the documents the client must make available for the audit and the Compliance Audit Return (CAR). Where DPO
// Copilot already holds a record for an item (RoPA, DPIAs, LIAs, processor assessments, registers, training), the
// status column says so; everything else has a tick box for the client.
import { one } from "./db";
import { answersOf } from "./data";
import { CSS as BASE } from "./car-report";
import { fmtDate, todayWAT } from "./rules";

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** Records DPO Copilot can count for a client, used to mark items already held on the platform. */
type Held = "ropa" | "dpia" | "lia" | "tia" | "tpra" | "dpa" | "breaches" | "dsars" | "trainings" | "reports" | "privacy_notice" | "retention" | "consent";
type Item = { name: string; purpose?: string; held?: Held };

export const CAR_DOC_GROUPS: { title: string; intro?: string; items: Item[] }[] = [
  { title: "Core documents", intro: "The documents an organisation should generally have available for the audit.", items: [
    { name: "Data Protection Policy", purpose: "Establishes the organisation's data protection framework." },
    { name: "Privacy Policy / Privacy Notice", purpose: "Explains how personal data is collected, used, stored and shared.", held: "privacy_notice" },
    { name: "Record of Processing Activities (RoPA)", purpose: "Documents personal data processing activities.", held: "ropa" },
    { name: "Data Protection Impact Assessment (DPIA) Procedure", purpose: "Explains how privacy risks are identified and assessed." },
    { name: "DPIA Reports / Workbooks", purpose: "Evidence of completed impact assessments.", held: "dpia" },
    { name: "Data Subject Consent Forms", purpose: "Demonstrates how consent is obtained where consent is the lawful basis.", held: "consent" },
    { name: "Lawful Basis Assessment", purpose: "Documents the legal basis for each processing activity.", held: "ropa" },
    { name: "Data Retention and Disposal Policy", purpose: "Defines retention periods and secure disposal procedures.", held: "retention" },
    { name: "Data Breach Management Procedure", purpose: "Explains how personal data breaches are identified and handled." },
    { name: "Internal Data Breach Register", purpose: "Records actual and suspected data breaches.", held: "breaches" },
    { name: "Data Subject Access Request (DSAR) Procedure", purpose: "Explains how data subject requests are handled." },
    { name: "DSAR Forms and Request Register", purpose: "Evidence of requests received and how they were resolved.", held: "dsars" },
    { name: "Data Protection Training Policy / Schedule", purpose: "Establishes staff awareness and training requirements.", held: "trainings" },
    { name: "Data Protection Audit Schedule", purpose: "Defines the organisation's internal compliance monitoring activities." },
    { name: "Third-Party Data Processing Policy", purpose: "Establishes requirements for engaging external processors." },
  ] },
  { title: "Governance and accountability documents", items: [
    { name: "DPO appointment letter" },
    { name: "DPO job description and responsibilities" },
    { name: "DPO professional certification and training evidence" },
    { name: "DPO continuous professional development (CPD) records" },
    { name: "DPO periodic compliance reports" },
    { name: "Management approval of data protection policies" },
    { name: "Organisational data protection roles and responsibilities" },
    { name: "Staff data protection training attendance registers", held: "trainings" },
    { name: "Staff confidentiality agreements" },
    { name: "Basic Privacy Checklist (Dos and Don'ts)" },
    { name: "Internal data protection monitoring and review reports" },
  ] },
  { title: "Data security and technical documents", items: [
    { name: "Information Security Policy" },
    { name: "Access Control Policy" },
    { name: "Password Management Policy" },
    { name: "Encryption Policy or standards" },
    { name: "Backup and Disaster Recovery Policy" },
    { name: "Business Continuity Plan" },
    { name: "Vulnerability Assessment and Penetration Testing (VAPT) reports, where applicable" },
    { name: "IT asset inventory" },
    { name: "System access and user privilege register" },
    { name: "Security incident logs", held: "breaches" },
    { name: "Network and endpoint security documentation" },
    { name: "Physical security procedures" },
    { name: "IT maintenance and monitoring schedules" },
  ] },
  { title: "Third-party and vendor management documents", items: [
    { name: "List of third-party data processors", held: "tpra" },
    { name: "Data Processing Agreements (DPAs)", held: "dpa" },
    { name: "Vendor due diligence questionnaires" },
    { name: "Vendor risk assessment reports", held: "tpra" },
    { name: "Sub-processor agreements" },
    { name: "Third-party confidentiality agreements" },
    { name: "Vendor security assessment reports" },
    { name: "Evidence of processor compliance reviews" },
    { name: "Contracts containing data protection clauses" },
    { name: "Vendor termination and data deletion records" },
  ] },
  { title: "Data subject rights and transparency documents", items: [
    { name: "Data Subject Rights Management Procedure" },
    { name: "Data subject consent withdrawal procedure" },
    { name: "Data correction and rectification procedure" },
    { name: "Data erasure procedure" },
    { name: "Data portability procedure, where applicable" },
    { name: "Complaints management procedure" },
    { name: "Data subject complaint register" },
    { name: "Website privacy notice", held: "privacy_notice" },
    { name: "Cookie policy and cookie consent records, where applicable" },
    { name: "Mobile application privacy notice, where applicable" },
  ] },
  { title: "Cross-border data transfer documents", items: [
    { name: "Cross-Border Data Transfer Policy" },
    { name: "International data transfer register" },
    { name: "Transfer Impact Assessment (TIA), where applicable", held: "tia" },
    { name: "Adequacy decision or applicable transfer mechanism evidence" },
    { name: "Standard Contractual Clauses (SCCs), where applicable" },
    { name: "Contracts with foreign data recipients" },
    { name: "Records of countries to which personal data is transferred" },
  ] },
  { title: "Regulatory and registration documents", items: [
    { name: "NDPC registration certificate or evidence of registration, where applicable" },
    { name: "NDPC registration details and category" },
    { name: "Previous CAR submissions and acknowledgement receipts" },
    { name: "Previous audit reports", held: "reports" },
    { name: "Evidence of remediation of previous audit findings" },
    { name: "NDPC correspondence and regulatory notices" },
    { name: "Evidence of CAR filing fee payment, where applicable" },
  ] },
  { title: "Risk assessment and compliance documents", items: [
    { name: "Data Protection Risk Assessment Register" },
    { name: "Legitimate Interest Assessment (LIA), where applicable", held: "lia" },
    { name: "Data Subject Vulnerability Assessment" },
    { name: "Privacy by Design and Default documentation" },
    { name: "Data Protection Gap Assessment Report" },
    { name: "Compliance Monitoring Reports" },
    { name: "Internal Audit Reports" },
    { name: "Corrective Action Plan" },
    { name: "Risk Treatment Register" },
    { name: "Evidence of implementation of previous audit recommendations" },
  ] },
];

const HELD_LABEL: Record<Held, (n: number) => string> = {
  ropa: (n) => `${n} RoPA entr${n === 1 ? "y" : "ies"}`,
  dpia: (n) => `${n} DPIA${n === 1 ? "" : "s"}`,
  lia: (n) => `${n} LIA${n === 1 ? "" : "s"}`,
  tia: (n) => `${n} transfer assessment${n === 1 ? "" : "s"}`,
  tpra: (n) => `${n} processor${n === 1 ? "" : "s"} in the register`,
  dpa: (n) => `${n} signed DPA${n === 1 ? "" : "s"} recorded`,
  breaches: (n) => `${n} incident${n === 1 ? "" : "s"} logged`,
  dsars: (n) => `${n} request${n === 1 ? "" : "s"} logged`,
  trainings: (n) => `${n} training session${n === 1 ? "" : "s"}`,
  reports: (n) => `${n} audit report${n === 1 ? "" : "s"}`,
  privacy_notice: () => "Drafted in DPO Copilot",
  retention: () => "Drafted in DPO Copilot",
  consent: () => "Drafted in DPO Copilot",
};

export async function loadCarReadinessDoc(clientId: string, year: number) {
  const c = (await one<{ name: string }>("select name from clients where id = $1", [clientId]))!;
  const ans = await answersOf(clientId);
  const n = async (sql: string, args: unknown[] = [clientId]) => (await one<{ n: number }>(sql, args))?.n ?? 0;
  const doc = (k: string) => n("select count(*)::int as n from documents where client_id = $1 and template_key = $2", [clientId, k]);
  const held: Record<Held, number> = {
    ropa: await n("select count(*)::int as n from ropa_entries where client_id = $1 and state = 'active'"),
    dpia: await n("select count(*)::int as n from dpias where client_id = $1"),
    lia: await n("select count(*)::int as n from assessments where client_id = $1 and kind = 'lia'"),
    tia: await n("select count(*)::int as n from assessments where client_id = $1 and kind = 'tia'"),
    tpra: await n("select count(*)::int as n from assessments where client_id = $1 and kind = 'tpra'"),
    dpa: await n("select count(*)::int as n from assessments where client_id = $1 and kind = 'tpra' and answers->>'dpa_status' = 'Signed'"),
    breaches: (await n("select count(*)::int as n from incidents where client_id = $1")) + (await n("select count(*)::int as n from breaches where client_id = $1")),
    dsars: await n("select count(*)::int as n from dsars where client_id = $1"),
    trainings: await n("select count(*)::int as n from trainings where client_id = $1 and status <> 'cancelled'"),
    reports: await n("select count(*)::int as n from car_reports where client_id = $1 and audit_year < $2", [clientId, year]),
    privacy_notice: await doc("privacy_notice"),
    retention: await doc("data_retention_policy"),
    consent: await doc("consent_form"),
  };
  return { org: String(ans.org_legal_name || c.name), year, held, dpo: String(ans.dpo_name ?? "") };
}

export function carReadinessDocHtml(o: Awaited<ReturnType<typeof loadCarReadinessDoc>>) {
  const title = `CAR Readiness Document ${o.year}`;
  const total = CAR_DOC_GROUPS.reduce((s, g) => s + g.items.length, 0);
  const status = (it: Item) => {
    const k = it.held, count = k ? o.held[k] : 0;
    return k && count ? `<span class="ok">On DPO Copilot</span><br><span class="small">${esc(HELD_LABEL[k](count))}</span>` : `<span class="box"></span> Provided`;
  };
  const onPlatform = CAR_DOC_GROUPS.flatMap((g) => g.items).filter((it) => it.held && o.held[it.held]).length;

  const body = `
<table class="band"><tr>
  <td class="band-l"><span class="org">${esc(o.org)}</span></td>
  <td class="band-r"><span class="kicker">NDPA 2023 · GAID 2025 · Compliance Audit Return</span><br><span class="doc">CAR Readiness Document</span></td>
</tr></table>

<table class="facts"><tr>
  <td><span class="lbl">Organisation</span><br><b>${esc(o.org)}</b></td>
  <td><span class="lbl">Audit year</span><br><b>${o.year}</b></td>
  <td><span class="lbl">Data Protection Officer</span><br><b>${o.dpo ? esc(o.dpo) : "To be confirmed"}</b></td>
  <td><span class="lbl">Date</span><br><b>${fmtDate(todayWAT())}</b></td>
</tr></table>

<h2>1. Purpose of this document</h2>
<p>Under the Nigeria Data Protection Act, 2023 (NDPA) and the General Application and Implementation Directive, 2025 (GAID Art. 10), a data controller or processor of major importance must carry out an annual data protection compliance audit and file its Compliance Audit Return (CAR) with the Nigeria Data Protection Commission (NDPC) through a licensed Data Protection Compliance Organisation. This document lists the documents ${esc(o.org)} should make available for the ${o.year} audit, so that each control can be tested against evidence.</p>

<h2>2. How to use this list</h2>
<ul>
  <li>Tick each document as you provide it, and send it to your Data Protection Compliance Organisation or upload it in the compliance portal.</li>
  <li>Where a document does not exist, say so. A missing document is recorded as a gap with a recommendation, not a reason to delay the audit.</li>
  <li>Items marked <i>where applicable</i> are needed only if the activity applies to ${esc(o.org)}.</li>
  ${onPlatform ? `<li>Items marked <span class="ok">On DPO Copilot</span> are already held on the platform (${onPlatform} of ${total}). Please confirm they are current and send any versions held elsewhere.</li>` : ""}
</ul>

${CAR_DOC_GROUPS.map((g, gi) => {
  const core = gi === 0;
  return `<h2>${gi + 3}. ${esc(g.title)}</h2>${g.intro ? `<p>${esc(g.intro)}</p>` : ""}
<table class="docs"><thead><tr><th style="width:6%">S/N</th><th style="width:${core ? 34 : 70}%">Document</th>${core ? "<th>Purpose</th>" : ""}<th style="width:20%">Status</th></tr></thead>
${g.items.map((it, i) => `<tr${i % 2 ? ' class="alt"' : ""}><td>${gi + 3}.${i + 1}</td><td><b>${esc(it.name)}</b></td>${core ? `<td>${esc(it.purpose ?? "")}</td>` : ""}<td>${status(it)}</td></tr>`).join("")}
</table>`;
}).join("\n")}

<h2>${CAR_DOC_GROUPS.length + 3}. Next steps</h2>
<p>Once the documents are in, each item on the CAR readiness checklist is tested against the evidence, gaps are risk-rated with recommendations, and the audit report and Compliance Audit Return are prepared for ${esc(o.org)}'s review and sign-off before filing with the NDPC by 31 March.</p>

<table class="sig"><tr>
  <td class="k2">Received by</td><td class="ln"></td><td class="k2">Date</td><td class="ln d"></td><td class="gap"></td>
  <td class="k2">Documents due by</td><td class="ln d"></td>
</tr><tr><td></td><td class="hint">Name, designation and signature</td><td></td><td></td><td class="gap"></td><td></td><td></td></tr></table>`;

  const css = BASE(`${o.org} · ${title}`) + `
thead { display: table-header-group; } h2 { break-after: avoid; } tr { break-inside: avoid; }
table.band { margin: 0 0 14px; } table.band td { border: none; background: #0d1f4a; color: #fff; padding: 14px 16px; vertical-align: middle; }
.band-l .org { font-size: 14pt; font-weight: 700; color: #fff; } .band-r { text-align: right; width: 50%; }
.kicker { font-size: 8pt; letter-spacing: .08em; text-transform: uppercase; color: #9fc0ee; } .doc { font-size: 17pt; font-weight: 700; color: #fff; }
table.facts td { border: none; border-bottom: 2px solid #e3e8f0; padding: 6px 10px 8px 0; }
.lbl { font-size: 7.5pt; text-transform: uppercase; letter-spacing: .06em; color: #5f6878; font-weight: 600; }
.small { font-size: 8.5pt; color: #5f6878; } tr.alt td { background: #f7f9fc; }
.ok { color: #1e7a4c; font-weight: 700; }
.box { display: inline-block; width: 10px; height: 10px; border: 1px solid #1b2433; vertical-align: middle; margin-right: 4px; }
table.sig { margin-top: 26px; break-inside: avoid; } table.sig td { border: none; padding: 0 6px 0 0; vertical-align: bottom; }
table.sig td.k2 { font-size: 8pt; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: #0d1f4a; white-space: nowrap; width: 1%; padding-bottom: 2px; }
table.sig td.ln { border-bottom: 1px solid #1b2433; height: 30px; width: 30%; } table.sig td.ln.d { width: 14%; } table.sig td.gap { width: 4%; }
table.sig td.hint { font-size: 7.5pt; color: #5f6878; padding-top: 3px; }`;
  return { title: `${o.org} - ${title}`, body, css };
}
