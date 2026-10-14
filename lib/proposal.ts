// Premium data protection compliance proposal in the DPCO's programme format (blog/UNIBEN-Data-Protection-Compliance-Proposal.pdf),
// for any prospective client: NDPA 2023 and GAID 2025, sector regulation, a costed model with three options, and a cover letter.
// Styled in the prospect's colours with both the DPCO's and the prospect's logos.
import { CSS } from "./car-report";
import { fmtDate, todayWAT } from "./rules";
import { SERVICES, type Line } from "./invoice";
import { COUNTRY } from "./country";

export const PROPOSAL_SECTORS = ["Financial services", "Insurance", "Capital markets", "Health", "Education", "Telecoms", "Government or public sector", "Retail or e-commerce", "Technology", "Oil and gas / energy", "Other"];
export const TIERS: Record<string, string> = { UHL: "Ultra-High Level (UHL)", EHL: "Extra-High Level (EHL)", OHL: "Ordinary-High Level (OHL)", TBC: "To be confirmed with the Commission" };

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

// ---- Pricing: the service list (same services as invoices), each with a fee ---------------------------------------
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

/** The six training tiers (the same six as the Capacity Building plan). */
export const TRAINING_TIERS: [key: string, name: string, audience: string, format: string, outcome: string][] = [
  ["t1", "Management Training", "Board, executive and senior management", "Half-day executive briefing", "Governance-level understanding of liability under s.48, approval of the policy suite and the Board's oversight duty; attendance register filed as CAR evidence"],
  ["t2", "DPO Certification Training", "Data Protection Officer", "Certification course, examination, mentored practicum", "NDPC-recognised DPO certification; entry on the Commission's certified DPO database; Annual Credential Assessment preparation"],
  ["t3", "Continuous Professional Development (CPD)", "DPO and DPO Office", "Quarterly updates and annual refresher", "Current knowledge of NDPC guidance and enforcement; certification kept current for every CAR filing"],
  ["t4", "Data Protection Champion Training", "Data Protection Champions", "5-day intensive, examination, quarterly clinics", "Certificate of competence in unit-level administration: maintain a RoPA section, run the compliance checklist, triage a breach and screen a DPIA"],
  ["t5", "General Staff Training", "All staff", "Blended e-learning and in-person cohort sessions", "Baseline awareness: lawful handling, email and messaging discipline, sharing rules, disposal, incident reporting; completion tracked per unit"],
  ["t6", "Role Based Data Protection Training", "ICT, HR, finance, customer-facing and marketing staff", "3-day technical and role workshops plus a live breach simulation", "Security of processing, access control, logging, encryption, backup and disposal; tested 72-hour incident response with after-action report"],
];

/** Programme settings kept with the proposal: number of DPIAs (honorarium only on older proposals). */
export type Fin = { dpias?: number; honorarium?: number };

/** The fees: service lines, subtotal, VAT and total. */
export function money(p: Record<string, any>) {
  const lines: Line[] = p.lines ?? [], vat = Number(p.vat_rate) / 100;
  const subtotal = lines.reduce((a, l) => a + l.amount, 0), vatAmt = Math.round(subtotal * vat * 100) / 100;
  return { lines, subtotal, vat, vatAmt, total: subtotal + vatAmt };
}
export const units = (departments?: string | null) => (departments ?? "").split("\n").map((s) => s.trim()).filter(Boolean);

// ---- Helpers --------------------------------------------------------------------------------------------------------
const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const N = (n: number) => n.toLocaleString(COUNTRY.locale, { maximumFractionDigits: 2 });
const NGN = (n: number) => COUNTRY.currency.symbol + N(n);
const millions = (n: number) => (n >= 1_000_000 ? `${COUNTRY.currency.symbol}${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}m` : NGN(n));
/** Black or white, whichever reads better on the colour. */
export const ink = (hex: string) => { const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255; return 0.299 * r + 0.587 * g + 0.114 * b > 160 ? "#1B2433" : "#FFFFFF"; };
const addDays = (d: string, n: number) => new Date(Date.parse(d + "T00:00:00Z") + n * 86400000).toISOString().slice(0, 10);
const MONTH = (d: string) => new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(d + "T00:00:00Z"));

/** What a unit typically holds, from its name (for the champion allocation table). */
function unitData(name: string) {
  const m: [RegExp, string][] = [[/human|hr\b|personnel|establish|people/i, "Staff files, recruitment, promotion, discipline, pensions"], [/financ|account|bursar|treasury|payroll/i, "Payroll, bank mandates, vendor principals, payment data"], [/ict|i\.t\b|technolog|information|digital|systems/i, "Portals, identity management, logs, backups, hosting, vendor systems"],
    [/customer|client|service|contact|call/i, "Customer records, complaints, call recordings, correspondence"], [/market|brand|communicat|advancement|alumni|sales/i, "Contact lists, campaigns, consent records, events"], [/legal|compliance|secretar|risk|audit/i, "Contracts, litigation files, regulatory correspondence, investigations"],
    [/security|admin|facilit|works|estate/i, "CCTV, access control, gate and visitor logs, incident reports"], [/procure|supply|purchas/i, "Vendor principals, contractor personnel, site access records"], [/health|medical|clinic/i, "Clinical records, immunisation, referrals"],
    [/registry|admission|exam|record|student|academic|faculty|school|college/i, "Applicant and student records, results, transcripts"], [/operation|branch|retail|store/i, "Transaction records, customer identity, branch registers"], [/research|institute|centre|center/i, "Research participant data, collaboration datasets, cross-border transfers"]];
  return m.find(([re]) => re.test(name))?.[1] ?? "Unit registers, shared drives, correspondence and system records";
}

/** The data landscape table: common domains plus those of the sector. */
function landscape(sector: string | null) {
  const people = sector === "Education" ? "Students & applicants" : sector === "Health" ? "Patients" : sector === "Financial services" || sector === "Insurance" || sector === "Capital markets" ? "Customers & KYC" : sector === "Telecoms" ? "Subscribers" : sector === "Government or public sector" ? "Citizens & service users" : "Customers & clients";
  const rows: [string, string, string, string, string][] = [
    [people, "Operations, customer service, front office", "Identity documents, contact details, dates of birth, NIN/BVN, transaction and service history, photographs", "Core", "HIGH"],
    ["Staff & payroll", "Human Resources, Finance", "Employment files, bank details, payroll and pension data, medical leave, disciplinary files", "Sensitive", "HIGH"],
    ["Portals & digital systems", "ICT, vendors", "Account credentials, access logs, device and location data, cookies", "Technical", "HIGH"],
    ["Payments & fees", "Finance, payment gateways, banks", "Transaction records, payer identity, mandates", "Financial", "MEDIUM"],
    ["Surveillance & access control", "Security, Administration", "CCTV footage, gate logs, biometric access, visitor registers", "Sensitive", "HIGH"],
    ["Marketing & communications", "Marketing, Corporate Communications", "Contact data, preferences, campaign lists, consent records", "Marketing", "MEDIUM"],
    ["Procurement & contracts", "Procurement, Finance, Legal", "Vendor principals, bank details, staff of contractors", "Commercial", "LOWER"],
    ["Cloud & cross-border services", "ICT, vendors, partners", "Personal data hosted or transferred outside Nigeria", "Cross-border", "HIGH"],
  ];
  const extra: Record<string, [string, string, string, string, string][]> = {
    Health: [["Clinical records", "Clinical units, laboratory, pharmacy", "Medical history, diagnoses, prescriptions, test results", "Sensitive", "HIGH"]],
    Education: [["Results & academic records", "Faculties, examinations and records", "Transcripts, grades, disciplinary records, biometrics", "Core", "HIGH"], ["Research involving human subjects", "Research units, ethics committee", "Survey responses, clinical and genetic data, community datasets", "Sensitive", "HIGH"]],
    "Financial services": [["KYC, AML & credit", "Compliance, credit, operations", "KYC files, BVN, credit bureau reports, suspicious transaction records", "Financial", "HIGH"]],
    Insurance: [["Policies & claims", "Underwriting, claims", "Policyholder data, beneficiaries, medical information in claims", "Sensitive", "HIGH"]],
    Telecoms: [["SIM registration & usage", "Operations, regulatory affairs", "NIN-linked registration data, call detail records, location data", "Sensitive", "HIGH"]],
  };
  return [...rows.slice(0, 1), ...(extra[sector ?? ""] ?? []), ...rows.slice(1)];
}

export type Proposal = Record<string, any>;

function theme(p: Proposal, firm: any) {
  const P = p.primary_color, S = p.secondary_color, on = ink(P), sOn = ink(S);
  const css = `\nh1, h2, h3 { color: ${P}; } th { background: ${P}; color: ${on}; } .cover { border-left-color: ${P}; } .sub td { background: ${S}22; } .kicker { letter-spacing: 3px; font-size: 8pt; color: ${S}; font-weight: 700; }`;
  const th = (t: string, w?: string) => `<th style="background:${P};color:${on}${w ? `;width:${w}` : ""}">${t}</th>`;
  const head = (cells: [string, string?][]) => `<tr>${cells.map(([t, w]) => th(t, w)).join("")}</tr>`;
  const h = (n: 1 | 2 | 3, t: string, cls = "") => `<h${n}${cls ? ` class="${cls}"` : ""} style="color:${P}">${t}</h${n}>`;
  const img = (src: string | null, w: number | null, h0: number | null, alt: string) => (src && w && h0 ? `<img src="${src}" width="${Math.round((w * 64) / h0)}" height="64" alt="${esc(alt)}" style="height:64px;width:auto">` : "");
  const clientLogo = img(p.logo, p.logo_w, p.logo_h, p.client_name), firmLogo = img(firm.logo, firm.logo_w, firm.logo_h, firm.name);
  const section = (n: string, title: string, lead: string) => `<p class="kicker" style="color:${S}"><b>SECTION ${n}</b></p>${h(1, title)}<p style="font-size:11.5pt"><i>${lead}</i></p>`;
  const callout = (title: string, inner: string) => `<table><tr><td style="background:${S}22;border-left:4px solid ${P}"><p style="margin:0 0 4px;color:${P}"><b>${title}</b></p>${inner}</td></tr></table>`;
  return { P, S, on, sOn, css, th, head, h, clientLogo, firmLogo, section, callout };
}

export function proposalHtml(p: Proposal, firm: any) {
  const T = theme(p, firm), m = money(p), f: Fin = p.fin ?? {}, org = esc(p.client_name);
  const issued = String(p.created_at).slice(0, 10), months = p.duration_months ?? 12, accountable = esc(p.accountable_title || "Chief Executive Officer");
  const board = p.sector === "Education" || p.sector === "Government or public sector" ? "Governing Council" : "Board of Directors";
  const us = units(p.departments), champions = us.length, regs = SECTOR_REGS[p.sector ?? ""] ?? [];
  const tier = p.tier && p.tier !== "TBC" ? TIERS[p.tier] : null, staff = p.staff_count ?? null, subjects = p.subjects_count ?? null;
  const consultant = esc(firm.name), lic = firm.ndpc_licence_no ? `Licence No. ${esc(firm.ndpc_licence_no)}` : "Licence No. ______";
  const footer = `${org} · Data Protection Compliance Programme · NDPA 2023 / GAID 2025`;
  const d1 = Math.max(2, Math.round(months / 3)), r1 = Math.max(d1 + 1, Math.round((months * 2) / 3)), a1 = Math.max(r1, Math.round(months * 0.75));
  const dpias = f.dpias ?? 5;
  const services = m.lines.map((l) => l.service);

  const body = `
<section class="cover" style="border-left-color:${T.P}">
  <table><tr><td style="width:50%">${T.firmLogo || `<b>${consultant}</b>`}</td><td style="text-align:right">${T.clientLogo}</td></tr></table>
  <p class="kicker" style="color:${T.S}"><b>CONFIDENTIAL PROPOSAL · PREPARED FOR ${esc((p.contact_title || p.accountable_title || "MANAGEMENT").toUpperCase())}</b></p>
  <table><tr><td style="background:${T.P};color:${T.on};padding:24px">
    <p style="margin:0;color:${T.on};font-size:26pt"><b>Data Protection Compliance Programme</b></p>
    <p style="margin:10px 0 0;color:${T.on};font-size:16pt">${org}</p>
    <p style="margin:12px 0 0;color:${T.on}">Organisation-wide implementation of the Nigeria Data Protection Act 2023 and the General Application and Implementation Directive 2025 — governance, a certified Data Protection Officer, a Data Protection Champion network${champions ? ` across ${champions} units` : ""}, certification training and a costed ${months}-month delivery plan.</p></td></tr>
  <tr><td style="background:${T.S};color:${T.sOn};padding:8px"><p style="margin:0;color:${T.sOn}"><b>${org}${p.sector ? ` · ${esc(p.sector)}` : ""}</b></p></td></tr></table>
  <table>
    <tr><td class="k">Submitted to</td><td>${esc([p.contact_name, p.contact_title].filter(Boolean).join(", ") || `The ${p.accountable_title || "Chief Executive Officer"}`)}, ${org}<br>${esc(p.address).replace(/\n/g, "<br>")}<br>${esc(p.email)}</td></tr>
    <tr><td class="k">Subject</td><td>NDPA 2023 &amp; GAID 2025 compliance implementation and capacity building</td></tr>
    <tr><td class="k">Prepared by</td><td>${consultant} — Data Protection Compliance<br>NDPC-Licensed Data Protection Compliance Organisation (${lic})</td></tr>
    <tr><td class="k">Reference</td><td>${esc(p.number)}</td></tr>
    <tr><td class="k">Date</td><td>${MONTH(issued)}</td></tr>
    <tr><td class="k">Validity</td><td>${p.validity_days} days from date of issue (until ${fmtDate(addDays(issued, p.validity_days))})</td></tr>
  </table>
  <p class="note">CONFIDENTIAL — PREPARED SOLELY FOR ${org.toUpperCase()}. NOT FOR CIRCULATION WITHOUT WRITTEN CONSENT.</p>
</section>

<section class="break">
  <p class="kicker" style="color:${T.S}"><b>LETTER OF TRANSMITTAL</b></p>
  ${T.h(1, "A programme, not a paper exercise")}
  <p>${org} processes personal data every day${subjects ? ` — an estimated ${N(subjects)} ${p.sector === "Education" ? "students and applicants" : p.sector === "Health" ? "patients" : "customers and service users"}` : ""}${staff ? `${subjects ? "," : " —"} ${N(staff)} staff` : ""}${subjects || staff ? "," : ""} together with applicant files, supplier and partner records, CCTV and access logs, and payment data${us.length ? ` across ${us.length} departments and units` : ""}.</p>
  <p>Since 19 September 2025, that processing has been governed by a directive with teeth. The General Application and Implementation Directive 2025 (GAID) replaced the NDPR 2019 and its 2020 Implementation Framework, and now operates alongside the Nigeria Data Protection Act 2023 as the working law of Nigerian data protection. It requires registration with the Commission, a designated and certified Data Protection Officer, a documented compliance audit, and an annual Compliance Audit Return filed through a licensed Data Protection Compliance Organisation.</p>
  <p>Organisations are structurally difficult to bring into compliance. Personal data is not held centrally; it is held in ${us.length ? us.slice(0, 6).map(esc).join(", ") + (us.length > 6 ? " and other units" : "") : "every department and unit"} — each with its own registers, spreadsheets, systems and long-standing local practice. A single officer in a central office cannot see into those units, and a policy circulated from the top does not change what happens at the desk where the data is handled.</p>
  <p>This proposal therefore does two things at once. It puts in place the statutory office the law requires — one certified Data Protection Officer with genuine independence and a direct line to the ${accountable} — and it builds the layer that makes that office effective: a trained, formally appointed Data Protection Champion in every unit that holds personal data, accountable to the DPO for compliance in their own unit.</p>
  <p>What follows sets out the regulatory position, the proposed governance architecture, the champion network, a full training and certification curriculum, a ${months}-month delivery roadmap, and a costed financial proposal by service. We would welcome the opportunity to present it to Management.</p>
  <table><tr><td style="width:50%"><p style="margin-top:28px"><b>${esc(firm.signatory_name ?? "")}</b>${firm.signatory_credentials ? `, ${esc(firm.signatory_credentials)}` : ""}<br>LEAD CONSULTANT &amp; ENGAGEMENT PARTNER</p></td><td><p style="margin-top:28px">DATE</p></td></tr></table>

  ${T.h(1, "Contents", "break")}
  <table>${[["01", "Executive Summary"], ["02", "Regulatory Context — NDPA 2023 and GAID 2025"], ["03", "Compliance Position and Risk Exposure"], ["04", "Proposed Governance Architecture"], ["05", "The Data Protection Champion Network"], ["06", "Capacity Building, Training and Certification"], ["07", `Implementation Roadmap — ${months} Months`], ["08", "Deliverables"], ["09", "Financial Proposal"], ["10", "Value, Risk Avoided and Return"], ["11", "Assumptions, Exclusions and Terms"], ["12", "Acceptance"], ["A", "Appendix A — Obligation-to-Action Matrix"], ["B", "Appendix B — Champion Appointment Brief"]].map(([n, t]) => `<tr><td style="width:10%;color:${T.P}"><b>${n}</b></td><td>${t}</td></tr>`).join("")}</table>
</section>

<section class="break">
  ${T.section("01", "Executive Summary", `A ${months}-month programme to bring ${org} into demonstrable compliance with the NDPA 2023 and GAID 2025, built around one certified Data Protection Officer and a network of ${champions || "trained"} Data Protection Champions across every department and unit.`)}
  <table><tr>${[["1", "Certified DPO, reporting to the " + accountable], [String(champions || "—"), "Data Protection Champions across departments and units"], [String(months), "Months to registration, audit and first CAR filing"], [millions(m.subtotal), "Programme investment (excl. VAT)"]].map(([n, l]) => `<td style="background:${T.P};color:${T.on};text-align:center;width:25%"><p style="margin:0;color:${T.on};font-size:20pt"><b>${n}</b></p><p style="margin:0;color:${T.on};font-size:8pt">${l.toUpperCase()}</p></td>`).join("")}</tr></table>
  ${T.h(2, "The position today")}
  <p>GAID took effect on 19 September 2025. From that date the NDPR 2019 and the NDPR Implementation Framework 2020 ceased to apply, and the NDPA together with GAID became the operative framework. ${tier ? `On its sector and processing volumes, ${org} is expected to fall within the ${tier} band of data controllers and processors of major importance.` : `${org}'s classification as a data controller or processor of major importance will be confirmed during mobilisation.`} Registration with the Nigeria Data Protection Commission, designation of a certified DPO, a documented compliance audit and an annual Compliance Audit Return are not optional: GAID confirms that even processing that attracts an exemption remains bound by the processing principles, lawful basis, DPO designation, breach notification and the data subject rights in Part VI of the Act.</p>
  ${T.h(2, "What we propose")}
  <ul>
    <li><b>A governance spine.</b> A Data Protection Steering Committee at Management level, one certified DPO with functional independence and unimpeded access to processing activities, and a small DPO Office to carry the administrative load.</li>
    <li><b>A champion network with reach.</b> ${champions || "Formally appointed"} Data Protection Champions — one per department or unit — each committing roughly one day a week to the role, on written appointment${f.honorarium ? " and honorarium" : ""}.</li>
    <li><b>Discovery before policy.</b> A complete data inventory and Record of Processing Activities built unit by unit, a gap assessment against every obligation in the Act and the Directive, and a prioritised risk register — before a single policy is drafted.</li>
    <li><b>Remediation that holds.</b> A full policy, notice and procedure suite adopted by Management and the ${board}; Data Protection Impact Assessments on the ${dpias} highest-risk systems; data processing agreements with every vendor; a tested breach response capability with a 72-hour notification clock.</li>
    <li><b>Certification, not sensitisation.</b> Formal certification for the DPO and the champions, an executive briefing for the ${board} and senior management, technical training for ICT and high-risk roles, and blended awareness training for all staff.</li>
    <li><b>Filing through a licensed DPCO.</b> Registration, audit and the first Compliance Audit Return prepared and filed on ${org}'s behalf, with the filing calendar handed over to the DPO Office for subsequent years.</li>
  </ul>
  ${T.callout("INVESTMENT AT A GLANCE", `<p style="margin:0 0 4px"><b>${services.length} service${services.length === 1 ? "" : "s"}: ${NGN(m.subtotal)}</b>${m.vat ? ` excluding VAT (${NGN(m.total)} including VAT at ${Number(p.vat_rate)}%)` : ""}.</p><p style="margin:0;font-size:8.5pt">${services.map(esc).join(" · ")}. Full breakdown in Section 09.</p>`)}
  ${T.h(2, "Why the champion model")}
  <p>The record that creates the risk — a spreadsheet emailed to a personal account, a printed list left on a counter, a file shared without a lawful basis — sits several layers below any central office. GAID anticipates this: it requires that a data controller of major importance provide the DPO with additional support where processing is carried out or data subjects are engaged across multiple platforms and locations. The champion network is that support, made formal, trained, named in the Record of Processing Activities and answerable to the DPO.</p>
</section>

<section class="break">
  ${T.section("02", "Regulatory Context — NDPA 2023 and GAID 2025", "Two instruments now govern the processing of personal data in Nigeria: the Nigeria Data Protection Act 2023, assented on 12 June 2023, and the General Application and Implementation Directive 2025, issued by the Commission on 20 March 2025 and effective from 19 September 2025.")}
  ${T.h(2, "2.1 What changed on 19 September 2025")}
  <p>GAID replaced the Nigeria Data Protection Regulation 2019 and the NDPR Implementation Framework 2020, both of which ceased to operate as regulatory instruments on that date, although steps validly taken under them beforehand remain unaffected. GAID makes the Act operational: it sets out the articles, schedules and templates by which the Commission expects the Act to be applied, and it materially raises the evidentiary bar. Compliance is now something an organisation must be able to demonstrate on paper, on a schedule, in a prescribed format.</p>
  ${T.h(2, "2.2 Classification and registration")}
  <p>Section 65 of the Act defines a data controller or processor of major importance by reference to the scale of processing and its significance to the economy, society or security of Nigeria. Article 8 of GAID directs the Commission to classify such entities into three tiers, and Article 9 makes registration mandatory.</p>
  <table>${T.head([["Tier", "22%"], ["Indicative scope"], ["Registration", "16%"], ["Annual return", "22%"]])}
    <tr${p.tier === "UHL" ? ` style="font-weight:700"` : ""}><td><b>Ultra-High Level (UHL)</b></td><td>Banks, telecommunications operators, multinationals and entities processing personal data at the highest volumes</td><td>One-time registration</td><td>Compliance Audit Return every year, filed through a licensed DPCO</td></tr>
    <tr><td><b>Extra-High Level (EHL)</b></td><td>Government ministries, departments and agencies, tertiary and higher institutions, microfinance and mortgage banks, secondary and tertiary care hospitals</td><td>One-time registration</td><td>Compliance Audit Return every year, filed through a licensed DPCO</td></tr>
    <tr><td><b>Ordinary-High Level (OHL)</b></td><td>Primary and secondary schools, training providers, primary health centres, smaller commercial processors</td><td>Renewed annually</td><td>No separate CAR required</td></tr></table>
  ${T.callout(`WHERE ${org.toUpperCase()} SITS`, `<p style="margin:0">${tier ? `On its sector${subjects ? ` and a data-subject population of about ${N(subjects)}` : ""}, we expect ${org} to fall within the <b>${tier}</b> band.` : `${org}'s band will be assessed during mobilisation from its sector and processing volumes.`} We recommend budgeting at the applicable band and having the final designation confirmed with the Commission at the point of registration. The substantive obligations are the same in the two upper bands; only the fee differs.</p>`)}
  ${T.h(2, "2.3 The obligations that follow")}
  <table>${T.head([["Obligation", "22%"], ["Requirement"], ["Source", "18%"]])}
  ${[["Registration", "Register with the Commission as a data controller/processor of major importance; notify any material change to registered particulars within 60 days", "NDPA s.44; GAID Art. 9"],
    ["Designation of a DPO", "Designate a Data Protection Officer with expert knowledge of data protection law and practice; publish contact details and communicate them to the Commission", "NDPA s.32; GAID Art. 11"],
    ["DPO certification and assessment", "The DPO must be certified and entered on the Commission's database of certified DPOs, and undergoes an Annual Credential Assessment; certification is verified at CAR filing", "GAID Art. 14 & Sch. 3"],
    ["DPO independence and support", "Involve the DPO in all matters relating to processing; provide resources, access and continuous training; the DPO must not be penalised for performing statutory duties; provide additional support where processing spans multiple platforms and locations", "NDPA s.32; GAID Art. 11–13"],
    ["Compliance audit", "Conduct a data protection compliance audit within 15 months of registration or commencement, and annually thereafter", "GAID Art. 9–10"],
    ["Compliance Audit Return", "File the CAR no later than 31 March each year, using the prescribed audit template and through a licensed DPCO; late filing attracts an administrative penalty of 50% of the applicable filing fee", "GAID Art. 10; Sch. 10"],
    ["Semi-annual reporting", "The DPO compiles a semi-annual data protection report to Management, included in the RoPA and verified by a DPCO at audit", "GAID Art. 12"],
    ["Record of Processing Activities", "Maintain a complete, current RoPA covering every processing activity, purpose, lawful basis, category, recipient, retention period and safeguard", "NDPA s.24, s.39; GAID"],
    ["Data Protection Impact Assessment", "Mandatory for high-risk processing; must follow the GAID template and be signed by a certified DPO; the outcome forms part of the CAR", "NDPA s.28; GAID Art. 25 & Sch. 4"],
    ["Privacy policies and notices", "Publish privacy policies and transparent privacy and cookie notices meeting GAID's prescribed disclosure content", "NDPA s.27; GAID"],
    ["Consent", "Required for direct marketing, sensitive personal data and other specified processing; freely given, specific, informed and withdrawable", "NDPA s.26; GAID"],
    ["Breach notification", "Notify the Commission within 72 hours of becoming aware of a breach; notify affected data subjects where the risk to their rights is high", "NDPA s.40"],
    ["Third parties and processors", "Written data processing agreements identifying parties, purpose, scope and lawful basis; due diligence on every processor", "NDPA s.29; GAID"],
    ["Cross-border transfer", "Adequate safeguards or prior approval before any transfer of personal data outside Nigeria, using GAID's prescribed instruments", "NDPA s.41–43; GAID"],
    ["Data subject rights", "Facilitate access, rectification, erasure, restriction, portability and objection within statutory timelines", "NDPA Part VI"],
    ["Grievance handling", "Receive and address a Standard Notice to Address Grievance (SNAG) from a data subject before escalation to the Commission", "GAID Art. 40"],
    ["Training", "Conduct regular scheduled staff training and internal sensitisation on data protection", "GAID"]].map(([a, b, c]) => `<tr><td><b>${a}</b></td><td>${b}</td><td>${c}</td></tr>`).join("")}</table>
  ${regs.length ? `${T.h(2, `2.4 ${esc(p.sector)} sector regulation`)}<p>Alongside the NDPA and GAID, the following sector instruments shape how ${org} handles personal data. The programme reconciles them with the Act, which prevails where there is inconsistency (s.63).</p><table>${T.head([["Instrument", "38%"], ["Relevance"]])}${regs.map(([a, b]) => `<tr><td><b>${esc(a)}</b></td><td>${esc(b)}</td></tr>`).join("")}</table>` : ""}
  ${T.h(2, `2.${regs.length ? 5 : 4} Consequences of non-compliance`)}
  <p>Under section 48 of the Act, a data controller or processor of major importance found in breach is liable to a sanction of the greater of ₦10,000,000 or 2% of annual gross revenue in the preceding financial year; for others the figure is ₦2,000,000 or 2%. Late CAR filing carries an administrative penalty of 50% of the applicable filing fee. Beyond the Commission, the Act creates a private right of action, and Nigerian courts have begun to entertain suits by individuals enforcing their rights directly. The practical exposure is broader still: reputational damage, disruption to partnerships that require demonstrable data governance, and personal liability considerations for senior officers.</p>
  <p class="note">This section summarises the NDPA 2023 and GAID 2025 for planning purposes and does not constitute legal advice. Article and schedule references are to GAID 2025 as issued on 20 March 2025. Final classification, applicable fee band and filing particulars will be confirmed with the Commission during registration.</p>
</section>

<section class="break">
  ${T.section("03", "Compliance Position and Risk Exposure", `${org} processes personal data continuously and at scale${us.length ? ` across ${us.length} units` : ""} — much of it sensitive, much of it held in local registers that no central office currently sees.`)}
  ${T.h(2, "3.1 The data landscape")}
  <table>${T.head([["Domain", "17%"], ["Custodian units", "20%"], ["Personal data processed"], ["Sensitivity", "11%"], ["Risk", "9%"]])}
  ${landscape(p.sector).map(([a, b, c, d, e]) => `<tr><td><b>${a}</b></td><td>${b}</td><td>${c}</td><td>${d}</td><td><b style="color:${e === "HIGH" ? "#C62828" : e === "MEDIUM" ? "#B26A00" : "#2E7D32"}">${e}</b></td></tr>`).join("")}</table>
  ${T.h(2, "3.2 The exposures we expect to find")}
  <p>Based on comparable engagements${p.sector ? ` in the ${esc(p.sector.toLowerCase())} sector` : ""}, the following are the recurring findings. They are stated as anticipated, not established; the discovery phase in Section 07 exists to replace assumption with evidence.</p>
  <ul>${["<b>No Record of Processing Activities.</b> Processing is real and continuous but undocumented, which makes every downstream obligation — DPIA, retention, breach assessment, CAR — impossible to evidence.", "<b>Shadow registers.</b> Departmental spreadsheets, personal laptops, WhatsApp groups and private email accounts holding customer and staff data outside any institutional control.", "<b>Vendor arrangements without data processing agreements.</b> Developers, payment processors, hosting providers and other suppliers acting as processors on nothing more than an invoice.", "<b>Consent conflated with onboarding.</b> Treating sign-up or employment as blanket consent for all subsequent processing, including marketing and disclosure to third parties.", "<b>Cross-border transfer without instruments.</b> Cloud productivity suites, foreign partners and service providers receiving personal data with no transfer mechanism in place.", "<b>No breach detection or 72-hour capability.</b> No register, no severity assessment, no defined notification path to the Commission.", "<b>Indefinite retention.</b> No schedule, no disposal, no distinction between records with a statutory retention basis and those without.", "<b>No rights fulfilment route.</b> No published channel for access, rectification or erasure requests, and no capacity to respond within statutory timelines or to handle a SNAG.", "<b>Surveillance and biometrics without a DPIA.</b> Cameras and biometric attendance deployed on operational grounds, without assessment, notice or lawful basis analysis."].map((x) => `<li>${x}</li>`).join("")}</ul>
  ${T.callout("THE COUNTER-ARGUMENT, ADDRESSED", `<p style="margin:0">It is sometimes assumed that an exemption takes an organisation outside the Act. It does not. GAID confirms that even where an exemption applies, the processing principles in section 24, the lawful basis requirement in section 25, DPO designation under section 32, breach notification under section 40 and the data subject rights in Part VI continue to bind. Exemption is a narrow door, not a shelter.</p>`)}
</section>

<section class="break">
  ${T.section("04", "Proposed Governance Architecture", "One statutory office with real independence, one committee with real authority, and a champion in every unit where personal data actually sits.")}
  ${T.h(2, "4.1 The structure")}
  <table>${[[board, "Approves policy instruments · receives annual compliance report · owns residual risk"], [p.accountable_title || "Chief Executive Officer", "Accountable officer · chairs the Data Protection Steering Committee · direct reporting line from the DPO"], ["Data Protection Steering Committee", "Heads of HR, Finance, ICT, Legal, Operations and Risk, with the DPO as Secretary · meets quarterly"], ["Data Protection Officer", "Certified · registered with the NDPC · functionally independent · not penalised for statutory duties · attends Management as of right"], ["DPO Office — Compliance Analyst  |  Licensed DPCO (external)", "RoPA, rights and breach registers, training logistics, CAR evidence pack  |  independent audit, CAR filing, DPIA review, regulatory liaison"], [`Data Protection Champions${champions ? ` — ${champions} units` : ""}`, us.length ? us.map(esc).join(" · ") : "One per department or unit holding personal data"]].map(([a, b], i) => `<tr><td style="text-align:center;background:${i % 2 ? `${T.S}22` : T.P};color:${i % 2 ? "#1B2433" : T.on}"><p style="margin:0;color:${i % 2 ? T.P : T.on}"><b>${esc(a)}</b></p><p style="margin:2px 0 0;font-size:8.5pt;color:${i % 2 ? "#1B2433" : T.on}">${b}</p></td></tr>${i < 5 ? `<tr><td style="text-align:center;border:none;padding:0;color:${T.P}">▼</td></tr>` : ""}`).join("")}</table>
  ${T.h(2, "4.2 The Data Protection Officer")}
  <p>GAID permits the DPO to be a member of staff or to serve under a service contract. For an organisation of this scale we recommend a substantive internal appointment, supported for the first twelve months by the DPCO. The appointment instrument should record the following.</p>
  <table>${T.head([["Element", "22%"], ["Provision"]])}
  ${[["Reporting line", `Directly to the ${accountable}. Not subordinated to HR, Finance or ICT, each of which the DPO must be able to audit.`], ["Independence", "Written protection against dismissal or penalty for performing statutory duties, consistent with GAID. No instruction as to the outcome of an assessment."], ["Access", "Unimpeded access to all processing activities, systems, records and premises, and to any vendor acting as processor."], ["Conflict of interest", "May not simultaneously determine the purposes and means of processing — which excludes concurrent line responsibility for operations, payroll or ICT."], ["Certification", "Must hold current NDPC-recognised certification, be entered on the Commission's DPO database, and pass the Annual Credential Assessment."], ["Publication", "Contact details published on the website and communicated to the Commission."], ["Reporting duty", `Semi-annual data protection report to Management, incorporated into the RoPA and verified by the DPCO at audit; annual report to the ${board}.`], ["Resources", "Budget line, one Compliance Analyst, secretariat support, and provision for continuous professional development."]].map(([a, b]) => `<tr><td><b>${a}</b></td><td>${b}</td></tr>`).join("")}</table>
  ${T.h(2, "4.3 Responsibility matrix")}
  <table>${T.head([["Activity", "32%"], [`${board.split(" ")[0]} / ${esc(p.accountable_title || "CEO")}`], ["Steering Cttee"], ["DPO"], ["Champions"], ["DPCO"]])}
  ${[["NDPC registration", "A C R I S"], ["Data inventory & RoPA", "I C A R S"], ["Policy suite adoption", "A R R C S"], ["DPIAs on high-risk systems", "I C A/R C S"], ["Vendor DPAs & due diligence", "I C A C S"], ["Unit-level compliance checks", "I I A R —"], ["Data subject rights requests", "— I A R C"], ["Breach detection & escalation", "I I A R S"], ["72-hour notification to NDPC", "I I R I S"], ["Staff training & awareness", "I C A R R"], ["Semi-annual report to Management", "I A R C C"], ["Annual audit & CAR filing", "A C R C R"]].map(([a, r]) => `<tr><td>${a}</td>${r.split(" ").map((x) => `<td style="text-align:center"><b>${x}</b></td>`).join("")}</tr>`).join("")}</table>
  <p class="note">R — Responsible · A — Accountable · C — Consulted · I — Informed · S — Supports</p>
</section>

<section class="break">
  ${T.section("05", "The Data Protection Champion Network", `${champions ? `${champions} formally appointed officers` : "Formally appointed officers"} — one for every unit that holds personal data — trained, certified, named in the Record of Processing Activities and accountable to the DPO.`)}
  ${T.h(2, "5.1 Sizing the network")}
  <table>${T.head([["Unit", "30%"], ["Champions", "12%"], ["Principal processing in scope"]])}
  ${(us.length ? us : ["[Department / unit]"]).map((u) => `<tr><td><b>${esc(u)}</b></td><td style="text-align:center">1</td><td>${unitData(u)}</td></tr>`).join("")}
  <tr class="sub"><td><b>Total champion network</b></td><td style="text-align:center"><b>${champions || "—"}</b></td><td>Full organisational coverage</td></tr></table>
  ${T.h(2, "5.2 What a champion does")}
  <p>The champion is not a second DPO. The role is deliberately bounded: to be the eyes of the DPO inside the unit, the first responder when something goes wrong, and the person who keeps the unit's entry in the RoPA true.</p>
  <table>${T.head([["Duty", "24%"], ["Detail"], ["Cadence", "16%"]])}
  ${[["Maintain the unit inventory", "Keep the unit's section of the RoPA current — systems, registers, purposes, recipients, retention", "Reviewed quarterly"], ["First-line breach response", "Detect, contain and escalate incidents to the DPO immediately; the 72-hour clock starts at the organisation's awareness, not the DPO's", "Immediate"], ["Handle rights requests", "Receive access, rectification and erasure requests at unit level and route them to the DPO's register within 48 hours", "As they arise"], ["Local compliance checks", "Run the DPO's checklist over the unit — clean desk, access rights, shared drives, disposal, notices displayed", "Monthly self-check"], ["DPIA screening", "Flag any new system, survey, biometric deployment or project involving personal data before it goes live", "Before deployment"], ["Vendor flagging", "Report any third party receiving unit data so a DPA can be put in place", "As they arise"], ["Local sensitisation", "Deliver the DPO's briefing to unit staff and new appointees", "Quarterly"], ["Unit return to the DPO", "Submit a short standard return feeding the DPO's semi-annual report and the CAR evidence pack", "Semi-annual"], ["Champions' forum", "Attend the network clinic chaired by the DPO", "Quarterly"]].map(([a, b, c]) => `<tr><td><b>${a}</b></td><td>${b}</td><td>${c}</td></tr>`).join("")}</table>
  ${T.h(2, "5.3 Appointment, time and recognition")}
  <ul><li><b>Selection.</b> Nominated by the head of unit; confirmed by the DPO; appointed by instrument on the ${accountable}'s authority.</li><li><b>Grade.</b> A confirmed officer of sufficient standing to require change within the unit.</li><li><b>Tenure.</b> Two years, renewable, with a designated alternate in each unit.</li><li><b>Time commitment.</b> Approximately 15–20% of working time — one day a week — recognised in the officer's workload rather than added to it.</li><li><b>Recognition.</b> ${f.honorarium ? `A responsibility honorarium of ${NGN(f.honorarium)} a year (Section 09), certification` : "Certification"} at ${org}'s expense, and formal recording of the appointment in the officer's file.</li><li><b>Accountability.</b> Functionally accountable to the DPO for compliance matters; administratively to the head of unit. Non-performance is reported to the Steering Committee.</li></ul>
</section>

<section class="break">
  ${T.section("06", "Capacity Building, Training and Certification", "GAID requires regular scheduled staff training and internal sensitisation, and requires the DPO to hold current certification verified at every CAR filing. This programme treats training as a compliance control with evidence attached, not as an event.")}
  ${T.h(2, "6.1 The training architecture")}
  <table>${T.head([["Tier", "6%"], ["Programme", "20%"], ["Audience", "19%"], ["Format", "19%"], ["Outcome and evidence"]])}
  ${TRAINING_TIERS.map(([, n, a, fm, o], i) => `<tr><td>${i + 1}</td><td><b>${n}</b></td><td>${a}</td><td>${fm}</td><td>${o}</td></tr>`).join("")}</table>
  ${T.h(2, "6.2 Champion curriculum — five days")}
  <table>${T.head([["Day", "10%"], ["Module", "20%"], ["Content"]])}
  ${[["Day 1", "Legal foundation", "NDPA 2023 architecture; GAID 2025 and what changed on 19 September 2025; classification and registration; principles, lawful bases and consent; sensitive personal data; the organisation's own exposure"], ["Day 2", "Mapping and records", "Data inventory technique; building and maintaining a RoPA section; purpose, recipients, retention and disposal; practical workshop on the champion's own unit"], ["Day 3", "Risk and assessment", "DPIA screening and when to escalate; high-risk processing including biometrics and surveillance; third parties, processors and data processing agreements; cross-border transfer"], ["Day 4", "Rights and incidents", "Access, rectification, erasure and objection requests; timelines; the SNAG procedure; breach identification, containment, severity assessment and the 72-hour clock; tabletop exercise"], ["Day 5", "Operating the role", "The monthly checklist; the unit return; evidence for the CAR; delivering local sensitisation; assessment and certification examination"]].map(([a, b, c]) => `<tr><td>${a}</td><td><b>${b}</b></td><td>${c}</td></tr>`).join("")}</table>
  ${T.h(2, "6.3 Delivery and continuity")}
  <ul><li><b>On site.</b> Training delivered at ${org}'s premises, with additional cohorts for other locations as needed.</li><li><b>Cohorts.</b> Champions trained in two cohorts so that units are never left uncovered.</li><li><b>Train-the-trainer.</b> Selected champions and the DPO receive facilitation training so ${org} can deliver staff induction internally from Year 2 — the single largest recurring saving in the model.</li><li><b>Refreshers.</b> Quarterly champion clinics in Year 1; annual recertification thereafter.</li><li><b>Evidence.</b> Attendance registers, assessment results, completion rates by unit and the training calendar compiled into the CAR evidence pack.</li></ul>
</section>

<section class="break">
  ${T.section("07", `Implementation Roadmap — ${months} Months`, "Sequenced so that registration happens early, evidence-gathering runs through the middle of the programme, and the Compliance Audit Return is ready well ahead of the 31 March filing deadline.")}
  <table>${T.head([["Phase", "12%"], ["Months", "9%"], ["Activities"], ["Outputs and gate", "32%"]])}
  ${[["0 Mobilise", "M1", "Engagement kick-off with Management; constitute the Steering Committee; appoint and instrument the DPO; nominate and appoint the champions; confirm classification and complete NDPC registration; programme charter and reporting rhythm", "Steering Committee constituted · DPO appointment instrument · NDPC registration certificate · champion appointment letters · programme charter", "Gate 1 — Management sign-off"],
    ["1 Discover", `M2–M${d1}`, "Unit-by-unit data discovery; interviews and system walkthroughs; build the RoPA; map data flows including cross-border; inventory every processor and vendor; gap assessment against each obligation; risk register", "Data inventory · complete RoPA · data flow maps · vendor and processor register · gap assessment report · prioritised risk register", "Gate 2 — Findings accepted by Steering Committee"],
    ["2 Remediate", `M${d1}–M${r1}`, `Draft the policy, notice and procedure suite; route through Management and the ${board}; conduct DPIAs on the ${dpias} highest-risk systems; execute data processing agreements; transfer instruments; breach response and rights procedures; privacy notices; retention and disposal schedule`, `Adopted policy suite · ${dpias} signed DPIAs · executed DPAs · transfer instruments · breach and rights procedures live · notices published · retention schedule`, `Gate 3 — ${board} adoption of the policy suite`],
    ["3 Build capacity", `M${Math.min(3, d1)}–M${Math.max(r1, a1 - 1)}`, "DPO certification and practicum; champion training in two cohorts with examination; executive briefing; technical workshop and live breach simulation; blended staff awareness rollout; train-the-trainer", "DPO certified and on the NDPC database · champions certified · executive briefing delivered · breach simulation after-action report · staff completion tracked by unit", "Gate 4 — Certification and completion evidence filed"],
    ["4 Assure & file", `M${a1}–M${months}`, "Independent compliance audit against the GAID audit template; assemble the CAR evidence pack; prepare and file the Compliance Audit Return through the licensed DPCO ahead of 31 March; DPO semi-annual report; handover to the DPO Office", "Audit report · CAR filed and acknowledged · semi-annual report · Year 2 compliance calendar · handover pack", "Gate 5 — Filing acknowledgement received"],
    ["5 Sustain", `M${months}+`, "Quarterly champion clinics; annual DPO credential assessment; refresh of the RoPA and risk register; annual audit and CAR cycle; DPIA support for new systems; breach response on call", "Delivered under the Years 2–3 retainer in Section 09", ""]].map(([a, b, c, d, g]) => `<tr><td><b>${a}</b></td><td>${b}</td><td>${c}</td><td>${d}${g ? `<br><b style="color:${T.P}">${g}</b>` : ""}</td></tr>`).join("")}</table>
  ${T.callout("TIMING NOTE", `<p style="margin:0">The Compliance Audit Return falls due on 31 March each year, and late filing attracts an administrative penalty of 50% of the applicable filing fee.${p.start_on ? ` A start on ${fmtDate(p.start_on)} places Gate 5 around ${MONTH(addDays(p.start_on, months * 30))}.` : ""} A later start compresses Phase 4 and we would recommend a staged first filing.</p>`)}

  ${T.section("08", "Deliverables", "Every item below is a tangible artefact handed to the organisation, and every one of them is evidence the Commission may ask to see.")}
  <table>${T.head([["Workstream", "18%"], ["Deliverables"]])}
  ${[["Governance", `Steering Committee terms of reference · DPO appointment instrument and job description · ${champions || ""} champion appointment letters and role briefs · RACI matrix · programme charter · compliance reporting calendar`], ["Registration", "Classification assessment · NDPC registration filing and certificate · DPO registration and publication of contact details · change-notification procedure"], ["Discovery", "Data inventory · Record of Processing Activities (all units) · data flow maps including cross-border flows · processor and vendor register · gap assessment report · risk register with owners and target dates"], ["Policy suite", "Data Protection Policy · Privacy Notices (customer, staff, applicant, visitor, website and cookies) · Consent Management Procedure · Data Subject Rights Procedure · SNAG Handling Procedure · Data Breach Response Plan · Retention and Disposal Schedule · Access Control and Acceptable Use Policy · CCTV and Biometric Surveillance Policy · Third-Party and Processor Management Policy · Cross-Border Transfer Procedure · Clear Desk and Records Handling Standard · Sanctions and Enforcement Procedure"], ["Assessments", `${dpias} completed DPIAs on priority systems, on the GAID template and signed by the certified DPO · DPIA screening tool · legitimate interest assessment templates`], ["Third parties", "Vendor due diligence questionnaire · template Data Processing Agreement · executed DPAs with in-scope vendors · cross-border transfer instruments"], ["Operations", "Breach register and severity matrix · 72-hour notification workflow and NDPC notification template · rights request register and response templates · monthly unit compliance checklist · standard unit return"], ["Training", "DPO certification · champion certifications · executive briefing pack · technical workshop materials · breach simulation and after-action report · staff e-learning module and facilitator pack · attendance and completion registers"], ["Assurance", "Independent compliance audit report · CAR evidence pack · Compliance Audit Return filed through a licensed DPCO with filing acknowledgement · DPO semi-annual report template and first report · Year 2 compliance calendar and handover pack"]].map(([a, b]) => `<tr><td><b>${a}</b></td><td>${b}</td></tr>`).join("")}</table>
</section>

<section class="break">
  ${T.section("09", "Financial Proposal", `All amounts are in Nigerian Naira${m.vat ? `, with VAT at ${Number(p.vat_rate)}% shown separately` : ""}. Fees are fixed for the scope described in Section 08.`)}
  ${T.h(2, "9.1 Fees by service")}
  <table>${T.head([["S/N", "6%"], ["Service", "24%"], ["Scope and deliverables"], [`Fee (${COUNTRY.currency.symbol})`, "16%"]])}
  ${m.lines.map((l, i) => { const sc = SERVICE_SCOPE[l.service]; return `<tr><td>${i + 1}</td><td><b>${esc(l.service)}</b>${l.description ? `<br>${esc(l.description)}` : ""}</td><td>${sc ? `${sc.scope}<br><i>${sc.deliverables}</i>` : ""}</td><td style="text-align:right">${N(l.amount)}</td></tr>`; }).join("")}
  <tr class="sub"><td></td><td colspan="2"><b>Subtotal</b></td><td style="text-align:right"><b>${N(m.subtotal)}</b></td></tr>
  ${m.vat ? `<tr class="sub"><td></td><td colspan="2">VAT (${Number(p.vat_rate)}%)</td><td style="text-align:right">${N(m.vatAmt)}</td></tr>` : ""}
  <tr><td style="background:${T.P}"></td><td colspan="2" style="background:${T.P};color:${T.on}"><b>Total investment</b></td><td style="background:${T.P};color:${T.on};text-align:right"><b>${NGN(m.total)}</b></td></tr></table>
  ${services.length < SERVICES.length ? `<p class="note">Services not included above (${SERVICES.filter((x) => !services.includes(x)).map(esc).join(", ")}) can be added by agreement.</p>` : ""}
  ${T.h(2, "9.2 Payment terms")}
  <p>${esc(p.payment_terms || "50% mobilisation on acceptance; 50% on delivery of the final reports.")}</p>
  <p class="note">Withholding tax at the applicable rate will be deducted at source and remitted in the ordinary course; a credit note will be issued against each deduction. Statutory fees payable to the Commission are not included unless listed above, and are billed at cost with the receipt attached.${p.notes ? ` ${esc(p.notes)}` : ""}</p>
</section>

<section class="break">
  ${T.section("10", "Value, Risk Avoided and Return", "The case for this investment does not rest on penalty avoidance alone, but penalty avoidance is where it starts.")}
  <table>${T.head([["Exposure", "18%"], ["Consequence if unaddressed"], ["How the programme answers it", "34%"]])}
  ${[["Regulatory sanction", "For a controller of major importance, the greater of ₦10,000,000 or 2% of annual gross revenue in the preceding financial year", "Registration, documented audit, and a filed CAR that evidences compliance rather than asserting it"], ["Late or defective filing", "Administrative penalty of 50% of the applicable filing fee, and an adverse compliance record with the Commission", "Filing through a licensed DPCO, on a calendar handed to the DPO Office with the Year 2 cycle mapped"], ["Civil claims by data subjects", "The Act creates a private right of action; customers and staff can sue directly, and Nigerian courts are hearing such claims", "Published rights procedure, SNAG handling that resolves grievances internally, and defensible records of lawful basis"], ["Uncontrolled breach", "Missed 72-hour notification, no containment, no evidence of due diligence — the aggravating factors in any enforcement action", "Tested breach response, champion first-line detection in every unit, severity matrix and pre-drafted notification"], ["Partnership and contract risk", "Partners, investors and international counterparties increasingly require demonstrable data governance", "Cross-border transfer instruments, processor agreements, and DPIAs signed by a certified DPO"], ["Reputational risk", "A public breach involving customer or staff records is a news story and a commercial liability", "Awareness embedded at unit level, where breaches actually originate"], ["Key-person risk", "Compliance resting on one officer collapses when that officer is on leave or leaves", "Trained champions, documented procedures and train-the-trainer capability retained inside the organisation"]].map(([a, b, c]) => `<tr><td><b>${a}</b></td><td>${b}</td><td>${c}</td></tr>`).join("")}</table>
  ${T.h(2, "10.1 What the organisation owns at the end")}
  <p>At the close of Year 1, ${org} holds a certified DPO on the Commission's database, ${champions || "its"} certified champions, a complete Record of Processing Activities, an adopted policy suite, ${dpias} signed DPIAs, executed agreements with its processors, a tested breach capability, a filed Compliance Audit Return and the internal training capacity to induct new staff without external cost. The recurring obligation from Year 2 is an audit, a filing and a refresher — work the DPO Office can substantially carry itself.</p>

  ${T.section("11", "Assumptions, Exclusions and Terms", "")}
  ${T.h(2, "11.1 Assumptions")}
  <ul>${[`${org} will constitute the Steering Committee and appoint the DPO and champions within the first month, as these gate every subsequent phase.`, "Heads of unit will make staff, systems and records available for discovery interviews and walkthroughs.", `${org} will provide training venues, power and connectivity at no cost to us.`, "Existing system documentation, vendor contracts and organisational records will be made available.", `Policy instruments will be routed through Management and the ${board} on the normal cycle; delay to that cycle shifts Gate 3 correspondingly.`, ...(staff ? [`Staff headcount for training is taken at approximately ${N(staff)}; the fee will be adjusted pro rata against the confirmed staff list.`] : []), ...(champions ? [`Champion numbers are based on the current structure of ${champions} units; changes to that structure adjust the network size and cost.`] : [])].map((x) => `<li>${x}</li>`).join("")}</ul>
  ${T.h(2, "11.2 Exclusions")}
  <ul>${["Hardware, network infrastructure, servers and software licensing.", "Software development or modification of applications; we specify the required changes, the organisation's developers or vendors implement them.", "Legal representation in litigation or enforcement proceedings, which would be separately scoped.", "Penalties, fines or back-fees arising from periods before this engagement.", "Physical security works, records destruction equipment and archival storage.", "Travel and accommodation outside the organisation's principal city, should sessions be required elsewhere."].map((x) => `<li>${x}</li>`).join("")}</ul>
  ${T.h(2, "11.3 Terms")}
  <table>${T.head([["Term", "20%"], ["Provision"]])}
  ${[["Validity", `This proposal is valid for ${p.validity_days} days from the date of issue. Fees are held for that period.`], ["Duration", `${months} months from execution for Year 1, with the retainer renewable annually thereafter.`], ["Currency and tax", `All amounts in Nigerian Naira, exclusive of VAT${m.vat ? ` at ${Number(p.vat_rate)}%` : ""}. Withholding tax deducted at source and evidenced by credit note.`], ["Confidentiality", "Mutual confidentiality applies. We will execute the organisation's non-disclosure instrument, and a data processing agreement governing our own access to personal data during the engagement."], ["Our status", "In performing discovery and audit we act as a data processor to the organisation and will comply with the same standards we recommend, including the NDPC's DPCO Code of Conduct."], ["Intellectual property", "All deliverables prepared for the organisation vest in it on final payment. Our underlying methodologies, tools and templates remain ours."], ["Independence", "The compliance audit and CAR filing are performed under our DPCO licence and to the Commission's standards; no finding will be withheld or softened at the request of any officer."], ["Variation", "Any change to scope will be agreed in writing with a cost and schedule impact stated before work proceeds."], ["Procurement", "We will comply with the organisation's procurement process and provide all statutory documentation, including certificate of incorporation, tax clearance, pension and ITF compliance and DPCO licence."]].map(([a, b]) => `<tr><td><b>${a}</b></td><td>${b}</td></tr>`).join("")}</table>
  <p class="note">Statutory fee bands, classification tiers and filing deadlines cited in this proposal are drawn from the Nigeria Data Protection Act 2023 and the General Application and Implementation Directive 2025 as issued on 20 March 2025 and effective 19 September 2025. They will be confirmed with the Nigeria Data Protection Commission at registration. This document is a commercial proposal and does not constitute legal advice.</p>
</section>

<section class="break">
  ${T.section("12", "Acceptance", "To proceed, please confirm the services selected and return a signed copy of this page. We will issue the engagement contract, the data processing agreement and a mobilisation schedule within five working days.")}
  <table>${T.head([["Service"], ["Fee (excl. VAT)", "20%"], ["Fee (incl. VAT)", "20%"]])}
  ${m.lines.map((l) => `<tr><td>☐ ${esc(l.service)}</td><td style="text-align:right">${NGN(l.amount)}</td><td style="text-align:right">${NGN(Math.round(l.amount * (1 + m.vat) * 100) / 100)}</td></tr>`).join("")}
  <tr class="sub"><td><b>Total</b></td><td style="text-align:right"><b>${NGN(m.subtotal)}</b></td><td style="text-align:right"><b>${NGN(m.total)}</b></td></tr></table>
  ${T.h(3, `For ${org}`)}
  <table>${T.head([["Name and designation"], ["Signature and date"]])}<tr><td style="height:48px">${esc([p.contact_name, p.contact_title].filter(Boolean).join(", "))}</td><td></td></tr><tr><td>APPROVED — ${esc((p.accountable_title || "Chief Executive Officer").toUpperCase())}</td><td>OFFICIAL STAMP</td></tr></table>
  ${T.h(3, "For the Consultant")}
  <table>${T.head([["Engagement partner"], ["Signature and date"]])}<tr><td style="height:48px">${esc([firm.signatory_name, firm.signatory_title].filter(Boolean).join(", "))}</td><td></td></tr></table>
  ${T.callout("CONTACT", `<p style="margin:0"><b>${consultant}</b> — Data Protection Compliance<br>NDPC-Licensed Data Protection Compliance Organisation · ${lic}<br>Telephone ${esc(firm.phone ?? "______")} · Email ${esc(firm.email ?? "______")} · Address ${esc(firm.address ?? "______")}</p>`)}
</section>

<section class="break">
  <p class="kicker" style="color:${T.S}"><b>APPENDIX A</b></p>
  ${T.h(1, "Obligation-to-Action Matrix")}
  <p><i>Every obligation, the deliverable that discharges it, and the officer who owns it.</i></p>
  <table>${T.head([["Obligation", "22%"], ["Deliverable"], ["Owner", "16%"], ["Evidence at audit", "22%"]])}
  ${[["Registration as DCPMI", "Classification assessment and NDPC filing", "DPO", "Registration certificate"], ["DPO designation and certification", "Appointment instrument; certification; NDPC database entry", esc(p.accountable_title || "CEO"), "Instrument, certificate, published contact details"], ["DPO independence and resourcing", "Terms in Table 4.1; budget line; Compliance Analyst", board, "Instrument and approved budget"], ["Record of Processing Activities", `RoPA with ${champions || "all"} unit sections`, "DPO / Champions", "Current RoPA with review dates"], ["Lawful basis and consent", "Lawful basis register; consent management procedure", "DPO", "Basis mapped per processing activity"], ["Transparency", "Privacy notices for each data subject category; cookie notice", "DPO / ICT", "Published notices and version history"], ["DPIA on high-risk processing", `${dpias} DPIAs on the GAID template, signed by the certified DPO`, "DPO", "Signed DPIAs; screening log"], ["Security of processing", "Access control and acceptable use policy; technical workshop", "Head of ICT", "Policy, access reviews, training register"], ["Breach notification within 72 hours", "Breach response plan, register, severity matrix, simulation", "DPO", "Register, simulation after-action report"], ["Data subject rights (Part VI)", "Rights procedure, register, response templates", "DPO / Champions", "Register with timelines met"], ["Grievance handling (SNAG)", "SNAG handling procedure and log", "DPO", "Log with resolution outcomes"], ["Processor management", "Vendor register, due diligence, executed DPAs", "DPO / Procurement", "Signed DPAs per processor"], ["Cross-border transfer", "Transfer register and instruments", "DPO", "Instruments per transfer"], ["Retention and disposal", "Retention schedule; secure disposal standard", "Records owner / DPO", "Schedule and disposal certificates"], ["Staff training and sensitisation", "Six-tier training programme", "DPO", "Attendance and completion by unit"], ["Semi-annual reporting", "DPO report to Management, incorporated in the RoPA", "DPO", "Report verified by DPCO"], ["Annual audit and CAR", "Audit report; CAR filed through a licensed DPCO by 31 March", "DPO / DPCO", "Filing acknowledgement"]].map((r) => `<tr>${r.map((c, i) => `<td>${i ? c : `<b>${c}</b>`}</td>`).join("")}</tr>`).join("")}</table>
</section>

<section class="break">
  <p class="kicker" style="color:${T.S}"><b>APPENDIX B</b></p>
  ${T.h(1, "Champion Appointment Brief")}
  <p><i>A model instrument for issue on the ${accountable}'s authority. To be adapted to ${org}'s house style.</i></p>
  ${T.h(3, "Appointment as Data Protection Champion")}
  <p>On the authority of the ${accountable}, and pursuant to ${org}'s obligations under the Nigeria Data Protection Act 2023 and the General Application and Implementation Directive 2025, you are appointed Data Protection Champion for [unit] with effect from [date], for a renewable term of two years.</p>
  <p><b>Function.</b> You are the Data Protection Officer's designated point of responsibility for personal data within your unit. You are functionally accountable to the DPO in respect of this role and administratively to your head of unit.</p>
  <p><b>Duties.</b> To maintain your unit's section of the Record of Processing Activities; to detect, contain and immediately escalate any personal data breach to the DPO; to receive and route data subject requests within 48 hours; to complete the monthly compliance checklist; to screen and refer any new system, survey, biometric deployment or project involving personal data before it goes live; to report any third party receiving unit data; to deliver local sensitisation to staff and new appointees; to submit the semi-annual unit return; and to attend the quarterly champions' clinic.</p>
  <p><b>Authority.</b> You may require access to any register, system or record within your unit for compliance purposes, and may escalate non-cooperation to the DPO and thence to the Data Protection Steering Committee.</p>
  <p><b>Support.</b> You will be certified at ${org}'s expense, and the role is recognised at approximately one day per week within your workload.${f.honorarium ? " A responsibility honorarium is payable annually on submission of your unit returns." : ""} Your appointment will be recorded in your file.</p>
  <p><b>Confidentiality.</b> Information accessed in this role is to be used solely for compliance purposes and is subject to ${org}'s confidentiality obligations and to the Act.</p>
  <p><b>Alternate.</b> [Name] is designated your alternate and will act during any absence.</p>
  <table>${T.head([["Issued by"], ["Accepted — Champion, name and date"]])}<tr><td style="height:48px"></td><td></td></tr></table>
</section>`;
  return { title: `Proposal ${p.number} - ${p.client_name}`, css: CSS(footer) + T.css, body };
}

/** Cover letter in the DPCO's proposal delivery letter format (blog/Prosal_Delivery_Letter01.docx), with both logos. */
export function coverLetterHtml(p: Proposal, firm: any) {
  const T = theme(p, firm), m = money(p), org = esc(p.client_name), months = p.duration_months ?? 12;
  const us = units(p.departments), champions = us.length, board = p.sector === "Education" || p.sector === "Government or public sector" ? "Governing Council" : "Board of Directors";
  const accountable = esc(p.accountable_title || "Chief Executive Officer"), addressee = esc(p.contact_title || p.accountable_title || "Managing Director");
  const tier = p.tier && p.tier !== "TBC" ? TIERS[p.tier] : null, svc = (re: RegExp) => m.lines.some((l) => re.test(l.service));
  const words: string[] = p.client_name.split(/\s+/), caps = words.filter((w) => /^[A-Z]/.test(w) && !/^(Ltd|Limited|Plc|PLC)\.?$/.test(w));
  const short = esc(caps.length > 2 ? caps.map((w) => w[0]).join("") : p.client_name);
  const requests = [
    `establish the Office of the Data Protection Officer and appoint a suitably qualified DPO reporting to the ${accountable}, with direct escalation rights to the ${board};`,
    `issue an engagement letter to ${esc(firm.name)} as ${org}'s Data Protection Compliance Organisation (DPCO) to deliver the programme and provide guidance;`,
    ...(champions ? [`designate ${champions} Data Protection Champion${champions === 1 ? "" : "s"} across ${us.length > 4 ? "the departments and key directorates" : us.map(esc).join(", ")}, on the terms of reference in the proposal;`] : []),
    `approve the Year 1 budget of ${NGN(m.total)}${m.vat ? " (including VAT)" : ""};`,
    `mandate ${svc(/Registration/) ? `completion of ${org}'s DCPMI registration with the NDPC` : "confirmation of its registration status with the NDPC"}${svc(/CAR/) ? " and the filing of its first Compliance Audit Return" : ""}.`,
  ];
  const body = `
<table><tr>
  <td style="width:22%">${T.firmLogo || `<b style="color:${T.P}">${esc(firm.name)}</b>`}</td>
  <td><p style="margin:0;color:${T.P}"><b>${esc(firm.name)}</b></p>
    <p style="margin:0;font-size:8.5pt">${[firm.address, firm.email, firm.website, firm.phone, firm.rc_number ? `RC: ${firm.rc_number}` : null].filter(Boolean).map(esc).join("<br>")}</p></td>
  <td style="width:22%;text-align:right">${T.clientLogo}<p style="margin:4px 0 0;font-size:8pt;color:${T.P}"><b>DPCO</b>${firm.ndpc_licence_no ? ` · ${esc(firm.ndpc_licence_no)}` : ""}</p></td>
</tr></table>
<table><tr><td style="background:${T.P};padding:2px"></td></tr></table>
<p>Ref: ${esc(p.number)}<br>${fmtDate(todayWAT())}</p>
<p>${p.contact_name && p.contact_title ? `${esc(p.contact_name)}<br>${esc(p.contact_title)}` : `The ${addressee}`}<br>${org}<br>${esc(p.address).replace(/\n/g, "<br>")}</p>
<p>Dear ${addressee},</p>
<p><b><u>RE: DATA PROTECTION COMPLIANCE PROPOSAL FOR ${org.toUpperCase()} — TRANSMITTAL FOR MANAGEMENT ENDORSEMENT</u></b></p>
<p>I am pleased to transmit for your consideration the attached Data Protection Compliance Proposal for ${org} (Ref. ${esc(p.number)}), prepared in response to ${org}'s obligations under the Nigeria Data Protection Act, 2023 (NDPA) and the General Application and Implementation Directive, 2025 (GAID), issued by the Nigeria Data Protection Commission (NDPC).</p>
<p>The GAID took effect on 19 September 2025 and now replaces the NDPR 2019 in its entirety. Because ${org} processes the personal data of ${p.subjects_count ? `some ${N(p.subjects_count)} data subjects` : "well over 200 data subjects in any six-month period"}${p.sector && p.sector !== "Other" ? `, and operates in the ${esc(p.sector.toLowerCase())} sector` : ""}, ${short} should proceed on the working assumption that it is a Data Controller/Processor of Major Importance (DCPMI)${tier ? `, most likely in the ${tier} band` : ""}. That classification carries three immediate, non-discretionary duties: registration with the NDPC, appointment of a Data Protection Officer, and the annual filing of a Compliance Audit Return.</p>
<p>The proposal recommends a right-sized governance model rather than a large new bureaucracy: a single, appropriately empowered Data Protection Officer reporting administratively to the ${accountable}, with a direct escalation line to the ${board}${champions ? `, supported by ${champions} Data Protection Champion${champions === 1 ? "" : "s"} drawn from existing staff across ${us.length > 4 ? `${us.slice(0, 4).map(esc).join(", ")} and other units` : us.map(esc).join(", ")}` : ""}. Delivery is sequenced over ${months} month${months === 1 ? "" : "s"} in six phases, so that a defensible baseline of compliance is reached early while the fuller programme is built out alongside normal operations.</p>
${T.h(2, "Financial Summary")}
<p>The budget is set out in full at Section 09 of the proposal and summarised below. All figures are in Nigerian Naira and remain subject to final approval by Management${board === "Governing Council" ? " and the Council" : ""}.</p>
<table>${T.head([["Budget Line"], ["Year 1 (Set-Up)", "26%"]])}
${m.lines.map((l) => `<tr><td>${esc(l.service)}${l.description ? ` (${esc(l.description)})` : ""}</td><td style="text-align:right">${NGN(l.amount)}</td></tr>`).join("")}
${m.vat ? `<tr class="sub"><td>Subtotal</td><td style="text-align:right">${NGN(m.subtotal)}</td></tr><tr class="sub"><td>VAT (${Number(p.vat_rate)}%)</td><td style="text-align:right">${NGN(m.vatAmt)}</td></tr>` : ""}
<tr><td style="background:${T.P};color:${T.on}"><b>TOTAL</b></td><td style="background:${T.P};color:${T.on};text-align:right"><b>${NGN(m.total)}</b></td></tr></table>
<p>Set against this, Section 48 of the NDPA exposes ${org} to an administrative penalty of up to ₦10,000,000 or 2% of annual gross revenue — whichever is greater — for each instance of default, in addition to compensation payable to affected data subjects and orders to surrender any profit derived from a violation. For an organisation of ${short}'s scale, 2% of annual gross revenue is likely on its own to exceed the entire Year 1 budget proposed here. The investment is, on any reasonable view, materially cheaper than the exposure it removes.</p>
${T.h(2, "Request")}
<p>We respectfully request the ${addressee}'s endorsement of this proposal and its onward presentation to the ${board}, seeking approval to:</p>
<ol>${requests.map((r) => `<li>${r}</li>`).join("")}</ol>
<p>A detailed programme workplan will be shared upon approval as the next step.</p>
<p>We look forward to ${org}'s prompt attention to this request and to commencing this important engagement together.</p>
<p>Please accept the assurances of my highest regard.</p>
<p>Yours faithfully,</p>
<p><b>For: ${esc(firm.name).toUpperCase()}</b></p>
<p style="margin-top:36px"><b>${esc(firm.signatory_name ?? "")}</b>${firm.signatory_credentials ? `, ${esc(firm.signatory_credentials)}` : ""}<br>${esc(firm.signatory_title ?? "")}</p>
<p class="note">Enclosure: Data Protection Compliance Proposal ${esc(p.number)}</p>`;
  return { title: `Cover Letter ${p.number} - ${p.client_name}`, css: CSS(`${firm.name} · ${p.number}`) + T.css, body };
}
