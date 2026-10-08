// Premium data protection compliance proposal and contract, plus cover letter, for a prospective client of the DPCO.
// Grounded in the NDPA 2023 and the GAID 2025, with sector regulation where it applies; styled in the prospect's colours.
import { CSS } from "./car-report";
import { fmtDate, todayWAT } from "./rules";
import { SERVICES, naira, totals, type Line } from "./invoice";

export const PROPOSAL_SECTORS = ["Financial services", "Insurance", "Capital markets", "Health", "Education", "Telecoms", "Government or public sector", "Retail or e-commerce", "Technology", "Oil and gas / energy", "Other"];

/** Sector regulation that sits alongside the NDPA for each sector (for scoping; confirm currency before issue). */
export const SECTOR_REGS: Record<string, [string, string][]> = {
  "Financial services": [["CBN Consumer Protection Framework and Consumer Protection Regulations", "Confidentiality of customer information, consent for disclosure, and complaint handling for banks and other financial institutions."], ["CBN Risk-Based Cybersecurity Framework and Guidelines", "Information security governance, incident reporting and third-party risk for deposit money banks and payment service providers."], ["Money Laundering (Prevention and Prohibition) Act, 2022", "Customer due diligence and record retention (at least five years), to be reconciled with NDPA storage limitation."]],
  Insurance: [["NAICOM regulations and market conduct guidelines", "Policyholder data, KYC records and claims information held by insurers and brokers."], ["Money Laundering (Prevention and Prohibition) Act, 2022", "KYC and record retention obligations alongside the NDPA."]],
  "Capital markets": [["SEC Nigeria Rules and Regulations (including the Investments and Securities Act, 2025)", "Investor records, KYC and disclosure obligations of capital market operators."], ["Money Laundering (Prevention and Prohibition) Act, 2022", "Record retention and due diligence alongside the NDPA."]],
  Health: [["National Health Act, 2014", "Confidentiality of patient records (s.26) and access to health records; health data is sensitive personal data under NDPA s.30."], ["Code of Medical Ethics (MDCN) and state health facility regulators", "Professional confidentiality of patient information and record keeping by facilities."]],
  Education: [["Child's Rights Act, 2003 and NDPA s.31", "Processing children's personal data requires parental or guardian consent and age verification."], ["NUC / regulator directives and the Freedom of Information Act, 2011 (public institutions)", "Student records, disclosure obligations and records management."]],
  Telecoms: [["NCC Consumer Code of Practice Regulations", "Protection of subscriber information and consumer complaints."], ["NCC Registration of Telephone Subscribers Regulations and the Lawful Interception framework", "SIM registration data (including NIN linkage) and lawful access requests."]],
  "Government or public sector": [["Freedom of Information Act, 2011", "Proactive disclosure and records management, balanced against the exemption for personal information (s.14)."], ["National Identity Management Commission Act, 2007 and NIMC regulations", "Use and protection of NIN and identity data."]],
  "Retail or e-commerce": [["Federal Competition and Consumer Protection Act, 2018", "Consumer rights, fair marketing and protection of consumer information."], ["FCCPC guidance on digital lending and consumer data (where applicable)", "Restrictions on use of contacts and personal data for recovery and marketing."]],
  Technology: [["Cybercrimes (Prohibition, Prevention, etc.) Act, 2015 (as amended 2024)", "Data retention by service providers, critical information infrastructure and incident reporting."], ["NITDA Act, 2007 and NITDA guidelines", "IT standards, cloud and hosting guidance for public and private institutions."]],
  "Oil and gas / energy": [["Petroleum Industry Act, 2021 and NUPRC / NMDPRA regulations", "Employee, contractor and host community data held in operations and licensing."], ["NERC regulations (power sector)", "Customer metering and billing data held by distribution companies."]],
  Other: [],
};

/** What each service covers and delivers, for the scope section. */
export const SERVICE_SCOPE: Record<string, { scope: string; deliverables: string }> = {
  "NDPC DCMI/DPMI Registration": { scope: "Classify the organisation as a Data Controller/Processor of Major Importance and its tier under the GAID, and complete registration with the NDPC.", deliverables: "Classification memo; NDPC registration completed; registration certificate on file." },
  "Compliance Audit Assessment (CAR)": { scope: "Audit compliance against the NDPA, the GAID and the NDPC Schedule 2 audit questionnaire across governance, lawful basis, rights, security, processors and transfers.", deliverables: "Compliance audit report with risk ratings, findings and recommendations; remediation plan and tracker." },
  "CAR Filing": { scope: "Prepare and file the annual Compliance Audit Return with the NDPC through a licensed DPCO, and manage any regulator queries.", deliverables: "Filed CAR; NDPC filing acknowledgement; audit verification statement." },
  "Data Protection Impact Assessment (DPIA)": { scope: "Assess high-risk processing under NDPA s.28 following the NDPC DPIA guide: necessity, proportionality, risks and measures.", deliverables: "DPIA report(s) with risk register, treatment plan and sign-off." },
  "Legitimate Interest Assessment (LIA)": { scope: "Document the purpose, necessity and balancing tests where legitimate interest is relied on (NDPA s.25, GAID).", deliverables: "LIA report(s) with decision and safeguards." },
  "Cross-Border Risk Assessment (CBRA)": { scope: "Assess transfers of personal data outside Nigeria under NDPA ss.41–43: adequacy, transfer basis, destination risks and supplementary measures.", deliverables: "Transfer risk assessment(s); transfer register; recommended contractual clauses." },
  "Record of Processing Activity (RoPA) Documentation": { scope: "Map personal data across departments and systems and document each processing activity, lawful basis, recipients, transfers and retention.", deliverables: "Data inventory and Record of Processing Activities." },
  "Policy Development": { scope: "Develop the Data Protection Framework and linked policies tailored to the organisation's structure.", deliverables: "Data protection policy, data classification, privacy notice, DPIA, incident response, retention and disposal, and consent policies." },
  "Data Protection Officer (DPO) Training and Certification": { scope: "Prepare the designated DPO for the role under NDPA s.32 and recognised certification.", deliverables: "DPO training; certification support; CPD plan." },
  "Employee Data Protection Training": { scope: "Awareness and role-based training for management, champions and staff.", deliverables: "Training sessions; materials; attendance records and certificates; capacity building plan." },
};

export type Proposal = {
  number: string; client_name: string; address: string; email: string; contact_name: string | null; contact_title: string | null; sector: string | null;
  primary_color: string; secondary_color: string; logo: string | null; logo_w: number | null; logo_h: number | null;
  lines: Line[]; vat_rate: number | string; payment_terms: string | null; validity_days: number; start_on: string | null; duration_weeks: number | null; notes: string | null; created_at: string;
};

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
/** Black or white, whichever reads better on the colour. */
export const ink = (hex: string) => { const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255; return 0.299 * r + 0.587 * g + 0.114 * b > 160 ? "#1B2433" : "#FFFFFF"; };
const addWeeks = (d: string, w: number) => new Date(Date.parse(d + "T00:00:00Z") + w * 7 * 86400000).toISOString().slice(0, 10);

function theme(p: Proposal) {
  const P = p.primary_color, S = p.secondary_color, on = ink(P);
  const css = `\nh1, h2, h3 { color: ${P}; } th { background: ${P}; color: ${on}; } .cover { border-left-color: ${P}; } .sub td { background: ${S}22; }`;
  const th = (t: string, w?: string) => `<th style="background:${P};color:${on}${w ? `;width:${w}` : ""}">${t}</th>`;
  const h = (n: 1 | 2 | 3, t: string, cls = "") => `<h${n}${cls ? ` class="${cls}"` : ""} style="color:${P}">${t}</h${n}>`;
  const logo = p.logo && p.logo_w && p.logo_h ? `<img src="${p.logo}" width="${Math.round((p.logo_w * 70) / p.logo_h)}" height="70" alt="${esc(p.client_name)}" style="height:70px;width:auto">` : "";
  return { P, S, on, css, th, h, logo };
}

/** Phases with week ranges spread across the engagement duration. */
function phases(p: Proposal) {
  const w = Math.max(4, p.duration_weeks ?? 12), cut = (f: number) => Math.max(1, Math.round(w * f));
  const a = cut(0.15), b = cut(0.45), c = cut(0.8);
  return [["1. Mobilisation and discovery", `Weeks 1–${a}`, "Kick-off, document request, stakeholder interviews, data mapping."],
    ["2. Assessment", `Weeks ${a + 1}–${b}`, "Audit, gap analysis, DPIAs, LIAs and transfer assessments as scoped."],
    ["3. Remediation and documentation", `Weeks ${b + 1}–${c}`, "Policies, RoPA, contracts, notices and remediation support."],
    ["4. Training, filing and handover", `Weeks ${c + 1}–${w}`, "Training delivery, CAR filing and registration, close-out report."]];
}

export function proposalHtml(p: Proposal, firm: any) {
  const T = theme(p), t = totals(p.lines, Number(p.vat_rate)), date = fmtDate(p.created_at.slice(0, 10)), valid = fmtDate(addWeeks(p.created_at.slice(0, 10), p.validity_days / 7));
  const regs = SECTOR_REGS[p.sector ?? ""] ?? [], services = p.lines.map((l) => l.service);
  const prov = [firm.name, firm.ndpc_licence_no ? `NDPC-licensed DPCO (Licence ${firm.ndpc_licence_no})` : "NDPC-licensed Data Protection Compliance Organisation"];
  const body = `
<section class="cover" style="border-left-color:${T.P}">
  ${T.logo ? `<p>${T.logo}</p>` : ""}
  <table><tr><td style="background:${T.P};color:${T.on};padding:22px">
    <p style="margin:0;color:${T.on};font-size:11pt"><b>PROPOSAL AND SERVICE AGREEMENT</b></p>
    <p style="margin:8px 0;color:${T.on};font-size:24pt"><b>Data Protection Compliance Services</b></p>
    <p style="margin:0;color:${T.on}">Nigeria Data Protection Act, 2023 · GAID 2025${regs.length ? ` · ${esc(p.sector)} sector regulation` : ""}</p></td></tr>
  <tr><td style="background:${T.S};color:${ink(T.S)};padding:10px"><p style="margin:0;color:${ink(T.S)}"><b>Prepared for ${esc(p.client_name)}</b></p></td></tr></table>
  <table>
    <tr><td class="k">Prepared for</td><td><b>${esc(p.client_name)}</b><br>${esc(p.address)}<br>${esc(p.email)}</td></tr>
    <tr><td class="k">Prepared by</td><td><b>${esc(firm.name)}</b>${firm.address ? `<br>${esc(firm.address)}` : ""}${firm.email || firm.phone ? `<br>${esc([firm.email, firm.phone].filter(Boolean).join(" · "))}` : ""}</td></tr>
    <tr><td class="k">Reference</td><td>${esc(p.number)}</td></tr>
    <tr><td class="k">Date</td><td>${date}</td></tr>
    <tr><td class="k">Valid until</td><td>${valid}</td></tr>
    <tr><td class="k">Classification</td><td>Confidential – for ${esc(p.client_name)} only</td></tr>
  </table>
</section>

<section class="break">
  ${T.h(1, "1. Executive Summary")}
  <p>The Nigeria Data Protection Act, 2023 (NDPA) places clear, enforceable obligations on every organisation that processes the personal data of people in Nigeria, and the NDPA General Application and Implementation Directive (GAID), 2025 sets out how the Nigeria Data Protection Commission (NDPC) expects them to be met. Non-compliance can attract remedial orders and fines of up to the higher of ₦10,000,000 or 2% of annual gross revenue for a data controller or processor of major importance (NDPA s.48), as well as reputational harm and loss of customer trust.</p>
  <p>${esc(firm.name)} proposes to support ${esc(p.client_name)} to achieve, demonstrate and sustain compliance through ${services.length} service${services.length === 1 ? "" : "s"}: ${services.map(esc).join(", ")}. The engagement is designed to deliver regulator-ready documentation, a defensible compliance position and practical capability within ${esc(p.client_name)}.</p>
  <table>${[["Engagement", "Data protection compliance under the NDPA 2023 and the GAID 2025"], ["Services", `${services.length}`], ["Proposed start", p.start_on ? fmtDate(p.start_on) : "On acceptance"], ["Duration", `${p.duration_weeks ?? 12} weeks`], ["Investment", `<b>${naira(t.total)}</b>${Number(p.vat_rate) ? ` (including VAT of ${naira(t.vat)})` : ""}`]].map(([k, v]) => `<tr><td class="k">${k}</td><td>${v}</td></tr>`).join("")}</table>

  ${T.h(1, "2. Understanding of Your Obligations")}
  ${T.h(2, "2.1 The NDPA and the GAID")}
  <table><tr>${T.th("Obligation", "34%")}${T.th("What it requires")}</tr>
  ${[["Principles (s.24)", "Lawful, fair and transparent processing; purpose limitation; minimisation; accuracy; storage limitation; security; accountability."], ["Lawful basis (s.25) and consent (s.26)", "A documented lawful basis for every processing activity; valid, provable consent where relied on; LIAs for legitimate interest."], ["Registration and DCPMI (s.44, GAID)", "Registration with the NDPC where the organisation is a data controller or processor of major importance, by tier."], ["Data Protection Officer (s.32)", "Designation of a competent DPO with access to management."], ["Compliance audit (GAID)", "Annual Compliance Audit Return filed with the NDPC through a licensed DPCO."], ["DPIA (s.28)", "Impact assessment before high-risk processing, with prior consultation where risk remains high."], ["Data subject rights (ss.34–38)", "Access, rectification, erasure, restriction, objection, portability and safeguards on automated decisions, within set timelines."], ["Security and breach (ss.39–40)", "Appropriate technical and organisational measures; breach notification to the NDPC within 72 hours and to data subjects where high risk."], ["Processors (s.29) and transfers (ss.41–43)", "Written processor contracts; lawful basis and safeguards for transfers outside Nigeria."]].map(([a, b]) => `<tr><td><b>${a}</b></td><td>${b}</td></tr>`).join("")}</table>
  ${regs.length ? `${T.h(2, `2.2 ${esc(p.sector)} Sector Regulation`)}<p>In addition to the NDPA, the following sector instruments shape how ${esc(p.client_name)} must handle personal data. The engagement will reconcile them with the NDPA, which prevails where there is inconsistency (s.63).</p>
  <table><tr>${T.th("Instrument", "38%")}${T.th("Relevance")}</tr>${regs.map(([a, b]) => `<tr><td><b>${esc(a)}</b></td><td>${esc(b)}</td></tr>`).join("")}</table>` : ""}

  ${T.h(1, "3. Scope of Services", "break")}
  <table><tr>${T.th("Service", "26%")}${T.th("Scope")}${T.th("Deliverables", "30%")}</tr>
  ${p.lines.map((l) => { const s = SERVICE_SCOPE[l.service]; return `<tr><td><b>${esc(l.service)}</b>${l.description ? `<br>${esc(l.description)}` : ""}</td><td>${s ? s.scope : ""}</td><td>${s ? s.deliverables : ""}</td></tr>`; }).join("")}</table>
  ${services.length < SERVICES.length ? `<p class="note">Services not included above (${SERVICES.filter((s) => !services.includes(s)).map(esc).join(", ")}) can be added by agreement.</p>` : ""}

  ${T.h(1, "4. Approach and Methodology")}
  <p>Our methodology follows the NDPC's expectations under the GAID and the NDPC audit questionnaire, combining document review, stakeholder interviews, data mapping and technical walkthroughs. Every finding is risk-rated and paired with a practical recommendation, owner and timeline, so that ${esc(p.client_name)} can show the regulator not only what it has done but how it will sustain compliance.</p>
  ${T.h(2, "4.1 Work Plan")}
  <table><tr>${T.th("Phase", "30%")}${T.th("Timing", "16%")}${T.th("Activities")}</tr>${phases(p).map(([a, b, c]) => `<tr><td><b>${a}</b></td><td>${b}</td><td>${c}</td></tr>`).join("")}</table>
  ${p.start_on ? `<p>Proposed start ${fmtDate(p.start_on)}; target completion ${fmtDate(addWeeks(p.start_on, p.duration_weeks ?? 12))}.</p>` : ""}

  ${T.h(1, "5. Why " + esc(firm.name))}
  <ul><li>${prov.map(esc).join(", ")}.</li><li>Engagement led by ${esc([firm.signatory_name, firm.signatory_credentials].filter(Boolean).join(", ")) || "a certified data protection professional"}${firm.signatory_title ? `, ${esc(firm.signatory_title)}` : ""}.</li>
  <li>Regulator-ready outputs aligned to NDPC formats: audit reports, remediation trackers, DPIA and LIA reports, policies and training records.</li><li>A digital compliance workspace giving ${esc(p.client_name)} visibility of progress, deadlines and evidence throughout the engagement.</li></ul>

  ${T.h(1, "6. Financial Proposal", "break")}
  <table><tr>${T.th("S/N", "6%")}${T.th("Service")}${T.th("Fee (₦)", "22%")}</tr>
  ${p.lines.map((l, i) => `<tr><td>${i + 1}</td><td>${esc(l.service)}${l.description ? ` – ${esc(l.description)}` : ""}</td><td style="text-align:right">${naira(l.amount)}</td></tr>`).join("")}
  <tr class="sub"><td></td><td>Subtotal</td><td style="text-align:right">${naira(t.subtotal)}</td></tr>
  ${Number(p.vat_rate) ? `<tr class="sub"><td></td><td>VAT (${Number(p.vat_rate)}%)</td><td style="text-align:right">${naira(t.vat)}</td></tr>` : ""}
  <tr><td style="background:${T.P}"></td><td style="background:${T.P};color:${T.on}"><b>Total investment</b></td><td style="background:${T.P};color:${T.on};text-align:right"><b>${naira(t.total)}</b></td></tr></table>
  ${T.h(2, "6.1 Payment Terms")}
  <p>${esc(p.payment_terms || "50% mobilisation on acceptance; 50% on delivery of the final reports.")}</p>
  ${T.h(2, "6.2 Exclusions")}
  <ul><li>Statutory fees payable to the NDPC (registration and filing fees) are not included and are payable by ${esc(p.client_name)} directly or reimbursed at cost.</li><li>Travel outside the client's city, third-party tools and penetration testing are excluded unless listed above.</li><li>Prices are valid until ${valid}.</li></ul>
  ${p.notes ? `${T.h(2, "6.3 Notes")}<p>${esc(p.notes).replace(/\n/g, "<br>")}</p>` : ""}

  ${T.h(1, "7. Terms of Engagement", "break")}
  <ol>
    <li><b>Parties and acceptance.</b> This proposal, when signed by both parties, forms a binding agreement between ${esc(firm.name)} ("the Consultant") and ${esc(p.client_name)} ("the Client") for the services in Section 3.</li>
    <li><b>Client responsibilities.</b> The Client will nominate a project sponsor and coordinator, provide timely access to people, documents and systems, and review deliverables within ten (10) working days.</li>
    <li><b>Confidentiality.</b> Each party will keep the other's confidential information confidential and use it only for this engagement, during and for three (3) years after it.</li>
    <li><b>Data processing.</b> Where the Consultant processes personal data on the Client's behalf, it acts as a data processor under NDPA s.29: only on documented instructions, with appropriate security, using sub-processors only with consent, assisting with rights and breach obligations, and deleting or returning data at the end of the engagement. Data will be hosted in Nigeria unless agreed otherwise.</li>
    <li><b>Breach notification.</b> The Consultant will notify the Client without undue delay, and in any event within 24 hours, of any personal data breach affecting Client data, to support the Client's 72-hour notification to the NDPC.</li>
    <li><b>Fees and invoicing.</b> Fees are as set out in Section 6 and payable within fourteen (14) days of invoice. Changes in scope will be agreed in writing before work proceeds.</li>
    <li><b>Intellectual property.</b> On full payment, the Client owns the deliverables prepared for it. The Consultant retains its methodologies, templates and tools.</li>
    <li><b>Liability.</b> The Consultant will perform the services with reasonable skill and care. Its total liability is limited to the fees paid under this agreement, except for breach of confidentiality, data protection obligations, fraud or wilful misconduct. Regulatory outcomes remain the Client's responsibility as data controller.</li>
    <li><b>Term and termination.</b> This agreement runs until the services are complete. Either party may terminate on thirty (30) days' written notice, or immediately for material breach not remedied within fourteen (14) days. Fees for work done to termination remain payable.</li>
    <li><b>Dispute resolution and governing law.</b> Disputes will first be resolved amicably, then by mediation, and failing that by arbitration in Lagos under the Arbitration and Mediation Act, 2023. This agreement is governed by the laws of the Federal Republic of Nigeria.</li>
  </ol>

  ${T.h(1, "8. Acceptance")}
  <p>Signed for and on behalf of the parties, who confirm acceptance of this proposal and its terms.</p>
  <table><tr>${T.th("", "22%")}${T.th(esc(firm.name))}${T.th(esc(p.client_name))}</tr>
  ${["Name", "Designation", "Signature", "Date"].map((k, i) => `<tr><td class="k">${k}</td><td>${i === 0 ? esc(firm.signatory_name ?? "") : i === 1 ? esc(firm.signatory_title ?? "") : ""}</td><td>${i === 0 ? esc(p.contact_name ?? "") : i === 1 ? esc(p.contact_title ?? "") : ""}</td></tr>`).join("")}</table>
</section>`;
  return { title: `Proposal ${p.number} - ${p.client_name}`, css: CSS(`${firm.name} · Proposal ${p.number} · ${p.client_name} · Confidential`) + T.css, body };
}

export function coverLetterHtml(p: Proposal, firm: any) {
  const T = theme(p), t = totals(p.lines, Number(p.vat_rate)), date = fmtDate(todayWAT());
  const services = p.lines.map((l) => l.service), salutation = p.contact_name ? `Dear ${esc(p.contact_name)},` : "Dear Sir/Madam,";
  const body = `
<table><tr><td style="background:${T.P};color:${T.on};padding:14px"><p style="margin:0;color:${T.on};font-size:16pt"><b>${esc(firm.name)}</b></p>
  <p style="margin:2px 0 0;color:${T.on}">${esc([firm.address, [firm.phone, firm.email].filter(Boolean).join(" · "), firm.website].filter(Boolean).join(" | "))}</p></td></tr></table>
<p>${date}</p>
<p>Our ref: ${esc(p.number)}</p>
<p>${p.contact_name ? `${esc(p.contact_name)}${p.contact_title ? `<br>${esc(p.contact_title)}` : ""}<br>` : ""}<b>${esc(p.client_name)}</b><br>${esc(p.address).replace(/\n/g, "<br>")}<br>${esc(p.email)}</p>
<p>${salutation}</p>
${T.h(3, "PROPOSAL FOR DATA PROTECTION COMPLIANCE SERVICES UNDER THE NIGERIA DATA PROTECTION ACT, 2023")}
<p>We are pleased to submit our proposal to support ${esc(p.client_name)} in meeting its obligations under the Nigeria Data Protection Act, 2023 (NDPA) and the NDPA General Application and Implementation Directive (GAID), 2025${SECTOR_REGS[p.sector ?? ""]?.length ? `, together with the regulation that applies to the ${esc((p.sector ?? "").toLowerCase())} sector` : ""}.</p>
<p>The Nigeria Data Protection Commission has stepped up enforcement, and organisations are now expected to demonstrate compliance through registration, annual compliance audit returns, documented assessments, and trained staff. Our proposal sets out how we will help ${esc(p.client_name)} meet these expectations through ${services.length === 1 ? esc(services[0]) : `${services.slice(0, -1).map(esc).join(", ")} and ${esc(services.at(-1))}`}, over ${p.duration_weeks ?? 12} weeks${p.start_on ? ` from ${fmtDate(p.start_on)}` : ""}.</p>
<p>The total investment is <b>${naira(t.total)}</b>${Number(p.vat_rate) ? " inclusive of VAT" : ""}. The enclosed document also contains our terms of engagement, so that on signature it serves as the service agreement between us.</p>
<p>${esc(firm.name)} is a Data Protection Compliance Organisation licensed by the NDPC${firm.ndpc_licence_no ? ` (Licence ${esc(firm.ndpc_licence_no)})` : ""}. We would welcome the opportunity to present this proposal and answer any questions. This proposal is valid for ${p.validity_days} days.</p>
<p>Yours faithfully,</p>
<p style="margin-top:36px"><b>${esc(firm.signatory_name ?? "")}</b>${firm.signatory_credentials ? `, ${esc(firm.signatory_credentials)}` : ""}<br>${esc(firm.signatory_title ?? "")}<br>For: ${esc(firm.name)}</p>
<p class="note">Enclosure: Proposal and Service Agreement ${esc(p.number)}</p>`;
  return { title: `Cover Letter ${p.number} - ${p.client_name}`, css: CSS(`${firm.name} · ${p.number}`) + T.css, body };
}
