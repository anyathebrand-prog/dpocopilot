// Data Protection Audit Readiness Letter (blog/2025_Data_Protection_Audit_Readiness_Letter_GAID02.pdf), drafted automatically
// when a client's invoice is marked paid: what the client must have ready before audit fieldwork starts, under the NDPA and GAID.
import { q, one } from "./db";
import { answersOf } from "./data";
import { list } from "./questionnaire";
import { fmtDate, todayWAT } from "./rules";
import { CSS } from "./car-report";

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const initials = (n: string) => n.split(/\s+/).filter((w) => /^[A-Za-z]/.test(w) && !/^(ltd|limited|plc|of|and|the|nig)\.?$/i.test(w)).map((w) => w[0].toUpperCase()).join("").slice(0, 8);
const nextMonday = (from: string, days: number) => { const d = new Date(Date.parse(from + "T00:00:00Z") + days * 86400000); d.setUTCDate(d.getUTCDate() + ((8 - d.getUTCDay()) % 7)); return d.toISOString().slice(0, 10); };

/** Draft a letter for a paid invoice (once per invoice). Returns the letter id. */
export async function draftReadinessLetter(invoiceId: string, userId: string) {
  const existing = await one<{ id: string }>("select id from readiness_letters where invoice_id = $1", [invoiceId]);
  if (existing) return existing.id;
  const inv = (await one("select i.firm_id, i.client_id, c.name, c.car_audit_year, f.name as firm from invoices i join clients c on c.id = i.client_id join firms f on f.id = i.firm_id where i.id = $1", [invoiceId]))!;
  const today = todayWAT(), year = today.slice(0, 4);
  const n = (await one<{ n: number }>("select count(*)::int as n from readiness_letters where firm_id = $1 and extract(year from created_at) = $2", [inv.firm_id, Number(year)]))!.n;
  const ans = await answersOf(inv.client_id);
  const org = String(ans.org_legal_name || inv.name);
  const ref = `${initials(inv.firm) || "DPCO"}/${initials(org)}/DPA/${year}/${String(n + 1).padStart(2, "0")}`;
  return (await one<{ id: string }>(`insert into readiness_letters (firm_id, client_id, invoice_id, our_ref, audit_year, commencement_on, addressee, salutation, created_by)
    values ($1,$2,$3,$4,$5,$6,$7,$8,$9) returning id`,
    [inv.firm_id, inv.client_id, invoiceId, ref, inv.car_audit_year ?? Number(year) - 1, nextMonday(today, 10), ans.dpo_name ? `${ans.dpo_name}\nThe Data Protection Officer` : "The Data Protection Officer", "Dear Sir/Madam,", userId]))!.id;
}

/** Sector-specific examples for the data inventory and DPIA rows. */
function sectorExamples(sector: string, subjects: string[]) {
  const s = sector.toLowerCase();
  if (s.includes("education")) return { people: "students, applicants, staff, alumni, research participants, health, CCTV and visitor data", dpia: "biometrics, CCTV, e-learning, online examinations, student portals and large-scale records digitisation", vendors: "portals, payment platforms, learning management systems, cloud and hosting providers", children: true };
  if (s.includes("health")) return { people: "patients, next of kin, staff, health records, CCTV and visitor data", dpia: "electronic health records, telemedicine, laboratory systems, CCTV and data sharing with HMOs", vendors: "health information systems, laboratories, HMOs, payment platforms, cloud and hosting providers", children: true };
  if (s.includes("financial") || s.includes("insurance") || s.includes("capital")) return { people: "customers, KYC records, staff, beneficiaries, transaction data, CCTV and visitor data", dpia: "credit scoring, fraud monitoring, biometrics, mobile and online banking and large-scale profiling", vendors: "core banking and payment processors, credit bureaux, KYC providers, cloud and hosting providers", children: false };
  return { people: `${subjects.length ? subjects.join(", ").toLowerCase() : "customers, staff"}, CCTV and visitor data`, dpia: "biometrics, CCTV, profiling, new systems and large-scale processing", vendors: "IT and payment platforms, cloud and hosting providers and other service providers", children: subjects.some((x) => /child|student|pupil/i.test(x)) };
}

export async function loadReadinessLetter(id: string) {
  const l = await one("select * from readiness_letters where id = $1", [id]);
  if (!l) return null;
  const firm = (await one("select * from firms where id = $1", [l.firm_id]))!;
  const c = (await one("select name from clients where id = $1", [l.client_id]))!;
  return { l, firm, clientName: c.name as string, ans: await answersOf(l.client_id) };
}

export function readinessLetterHtml({ l, firm, clientName, ans }: NonNullable<Awaited<ReturnType<typeof loadReadinessLetter>>>) {
  const s = (k: string) => (typeof ans[k] === "string" && (ans[k] as string).trim() ? (ans[k] as string).trim() : "");
  const org = s("org_legal_name") || clientName, start = l.commencement_on ? fmtDate(l.commencement_on) : "[commencement date]";
  const ex = sectorExamples(s("org_sector"), list(ans.subjects)), depts = list(ans.org_departments);
  const rows: [string, string][] = [
    ["Governance and accountability", "Appointment letter and job description of the Data Protection Officer (DPO); organogram showing data protection reporting lines; approved data protection policy and related policies; evidence of DPO training; records of management oversight."],
    ["Data inventory and records of processing", `Inventory or register of personal data processed (${ex.people}); data flow maps; documented lawful basis for each processing activity.`],
    ["Privacy notices and consent", `Privacy notices on the website, portals and forms; consent forms and consent records;${ex.children ? " safeguards for data of children and persons under 18;" : ""} consent withdrawal procedure.`],
    ["Data subject rights", "Procedure for access, rectification, erasure, objection and portability requests; request log; evidence of response timelines; complaints handling process."],
    ["Third parties and cross-border transfers", `List of vendors and processors (${ex.vendors}); data processing agreements; records of any transfer of personal data outside Nigeria and the safeguards applied.`],
    ["Data Protection Impact Assessments", `DPIAs for high-risk processing such as ${ex.dpia}.`],
    ["Security of personal data", "Information security policy; access control and user management records; backup and recovery arrangements; network, device and physical security of records; staff confidentiality undertakings."],
    ["Breach management", "Incident response and breach management plan; register of past incidents; procedure for notifying the Nigeria Data Protection Commission (NDPC) within 72 hours and informing affected data subjects."],
    ["Retention and disposal", "Records retention schedule; records of secure disposal or anonymisation of personal data."],
    ["Training and awareness", "Staff training plans, attendance records and awareness materials on data protection."],
    ["Regulatory history", "Evidence of registration with the NDPC where applicable; previous audits, Compliance Audit Returns filed and any correspondence with the NDPC."],
  ];
  const logo = firm.logo && firm.logo_w && firm.logo_h ? `<img src="${firm.logo}" width="${Math.round((firm.logo_w * 56) / firm.logo_h)}" height="56" alt="${esc(firm.name)}" style="height:56px;width:auto">` : `<b>${esc(firm.name)}</b>`;
  const body = `
<table><tr><td style="width:24%">${logo}</td>
  <td><p style="margin:0"><b>${esc(firm.name)}</b></p><p style="margin:0;font-size:8.5pt">${[firm.address, firm.email, firm.website, firm.phone, firm.rc_number ? `RC: ${firm.rc_number}` : null].filter(Boolean).map(esc).join("<br>")}</p></td>
  <td style="width:18%;text-align:right"><p style="margin:0;font-size:8pt"><b>DPCO</b>${firm.ndpc_licence_no ? `<br>${esc(firm.ndpc_licence_no)}` : ""}</p></td></tr></table>
<p>Our Ref: ${esc(l.our_ref)}${l.your_ref ? `<br>Your Ref: ${esc(l.your_ref)}` : ""}<br>Date: ${fmtDate(String(l.letter_date ?? todayWAT()))}</p>
<p>${esc(l.addressee).replace(/\n/g, "<br>")}<br>${esc(org)}${s("org_address") ? `<br>${esc(s("org_address")).replace(/,\s*/g, ",<br>")}` : ""}</p>
<p>${esc(l.salutation)}</p>
<p><b><u>RE: DATA PROTECTION AUDIT READINESS REQUIREMENTS – ${esc(l.audit_year)} DATA PROTECTION AUDIT AND COMPLIANCE EXERCISE</u></b></p>
<p>Further to ${l.your_ref ? "your letter" : "our engagement"} confirming ${start} as the commencement date for ${esc(org)}'s ${esc(l.audit_year)} Data Protection Audit and Compliance Exercise, we write to set out what ${esc(org)} should have in place to ensure a smooth and productive audit.</p>
<h3>1. Basis of the Exercise</h3>
<p>The audit will be conducted under the Nigeria Data Protection Act, 2023 (NDPA) and assessed against the General Application and Implementation Directive (GAID) issued by the Nigeria Data Protection Commission, including its requirements on governance, lawful processing, data subject rights, security, breach management and the filing of Compliance Audit Returns.</p>
<h3>2. Readiness Requirements</h3>
<p>We kindly request that ${esc(org)} make the following available, in soft or hard copy, before or on ${start}. Where a document does not exist, please indicate this; a documented gap is itself a useful audit finding and will be treated constructively.</p>
<table><tr><th style="width:7%">S/N</th><th style="width:26%">Compliance area</th><th>Documents and evidence to be made available</th></tr>
${rows.map(([a, b], i) => `<tr><td>${i + 1}</td><td><b>${a}</b></td><td>${esc(b)}</td></tr>`).join("")}</table>
<h3>3. Administrative Arrangements</h3>
<ul>
  <li>Designate a liaison officer (preferably the DPO or an equivalent senior officer) as our single point of contact, and notify the relevant departments, units and stakeholders.</li>
  <li>Provide a suitable workspace, supervised access to relevant records, systems and premises, and availability of key officers for short interviews.${depts.length ? ` Priority areas include ${esc(depts.slice(0, 10).join(", "))}.` : ""}</li>
  <li>Share a list of key contacts in each department and unit, with a suggested interview schedule for the first week.</li>
  <li>Confirm that all personal data provided to us will be accessed strictly for audit purposes and handled in confidence, under the confidentiality terms agreed for this engagement.</li>
</ul>
<h3>4. Indicative Timeline</h3>
<ul>
  <li><b>Pre-audit (before ${start}):</b> Kick-off meeting and submission of documents.</li>
  <li><b>Fieldwork (from ${start}):</b> Document review, interviews, walkthroughs and technical and physical security checks.</li>
  <li><b>Reporting:</b> Draft findings and a remediation plan to ${esc(org)} for review, followed by the final report and support for the Compliance Audit Return, in line with the agreed deliverables.</li>
</ul>
<p>We would be glad to hold a short readiness meeting, in person or virtually, at ${esc(org)}'s convenience before the commencement date. Please accept the assurances of our highest regards.</p>
<p>Yours faithfully,</p>
<p style="margin-top:32px"><b>${esc(firm.signatory_name ?? "")}</b>${firm.signatory_credentials ? `, ${esc(firm.signatory_credentials)}` : ""}<br>${esc(firm.signatory_title ?? "")}</p>
${l.copy_to ? `<p>Copy: ${esc(l.copy_to)}</p>` : ""}`;
  return { title: `${org} Data Protection Audit Readiness Letter ${l.audit_year}`, css: CSS(`${firm.name} · ${l.our_ref}`), body };
}

export const lettersFor = (clientId: string) => q("select r.*, i.number as invoice_number from readiness_letters r left join invoices i on i.id = r.invoice_id where r.client_id = $1 order by r.created_at desc", [clientId]);
