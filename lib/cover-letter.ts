// Cover letter on the first page of every client report export: the DPCO's letterhead, addressed to the client's DPO,
// saying what the report is, its basis in the NDPA 2023 / GAID 2025, and what the client should do next.
import { one } from "./db";
import { answersOf } from "./data";
import { fmtDate, todayWAT } from "./rules";

type Kind = "car-report" | "car-plan" | "car" | "dpia-report" | "lia" | "tia" | "tpra" | "framework" | "training-plan" | "project-plan" | "ropa" | "version";

/** What each report is, why it matters, and the client's next steps. */
const ABOUT: Record<Kind, { code: string; what: (org: string) => string; next: string[] }> = {
  "car-report": { code: "CAR", what: (o) => `sets out the results of our data protection compliance audit of ${o} against the Nigeria Data Protection Act, 2023 (NDPA), the General Application and Implementation Directive, 2025 (GAID) and the NDPC audit questionnaire. Each finding is risk-rated and paired with a recommendation, and the report forms the basis of the Compliance Audit Return (CAR) to be filed with the Nigeria Data Protection Commission (NDPC) by 31 March`, next: ["review the findings and confirm any factual corrections within ten working days", "assign an owner and target date to each recommendation in the remediation plan", "provide any outstanding evidence so that the Compliance Audit Return can be finalised and filed on time"] },
  "car-plan": { code: "RMP", what: (o) => `translates the findings of the compliance audit into a prioritised remediation plan for ${o}, with owners, target dates and status for each action, as the NDPC expects to see at the next audit`, next: ["confirm the owner and target date for each action", "track progress monthly and update the status of each item", "keep evidence of completed actions for the next Compliance Audit Return"] },
  car: { code: "CRC", what: (o) => `records ${o}'s readiness against each item of the Compliance Audit Return checklist under the NDPA and the GAID, with the evidence held and the items still outstanding`, next: ["prioritise the items marked incomplete", "upload the outstanding evidence through the client portal", "agree a date for the readiness review ahead of filing"] },
  "dpia-report": { code: "DPIA", what: (o) => `documents the Data Protection Impact Assessment carried out for ${o} under section 28 of the NDPA and the GAID, assessing the necessity and proportionality of the processing, the risks to data subjects and the measures to address them`, next: ["review the risks and the measures proposed", "obtain sign-off by the Data Protection Officer and management", "where residual risk remains high, allow us to arrange prior consultation with the NDPC before processing begins"] },
  lia: { code: "LIA", what: (o) => `records the Legitimate Interest Assessment for ${o}, applying the purpose, necessity and balancing tests the GAID requires where legitimate interest is relied on as the lawful basis under section 25 of the NDPA`, next: ["review the conclusion and the safeguards in Section 8", "approve and sign the decision in Section 10", "update the privacy notice and the Record of Processing Activities to reflect the lawful basis"] },
  tia: { code: "TIA", what: (o) => `assesses the transfer of personal data outside Nigeria by ${o} under sections 41 to 43 of the NDPA: the adequacy of protection, the basis relied on, the risks in the destination and the supplementary measures required`, next: ["confirm the transfer details and the safeguard relied on", "put the recommended contractual and technical measures in place", "record the transfer and its basis in the Record of Processing Activities"] },
  tpra: { code: "TPRA", what: (o) => `sets out our due diligence on a data processor engaged by ${o}, under sections 29, 39 and 40 of the NDPA: what it processes, its security controls, its contract and the residual risk`, next: ["address the gaps and conditions recorded with the processor", "ensure a data processing agreement meeting section 29 is signed", "diarise the next review of the processor"] },
  framework: { code: "DPF", what: (o) => `is ${o}'s Data Protection Framework: the overarching data protection policy and the linked policies on data classification, website privacy, DPIA, incident response, retention and disposal, and consent, tailored to ${o}'s structure and aligned with the NDPA and the GAID`, next: ["review the framework with the heads of department named in it", "present it to the Board or Governing Council for approval", "communicate it to all staff once approved"] },
  "training-plan": { code: "CBP", what: (o) => `sets out ${o}'s data protection capacity building plan: the six training programmes, their schedule, participants and evidence, as the GAID requires regular scheduled staff training`, next: ["confirm the dates and participants for each session", "release staff to attend", "keep attendance registers and certificates as evidence for the Compliance Audit Return"] },
  "project-plan": { code: "PP", what: (o) => `sets out the project plan for our engagement with ${o}: each task, its owner, start and due dates, status and timeline`, next: ["confirm the dates and owners on your side", "nominate a project coordinator", "raise any scheduling constraints so that the plan can be adjusted"] },
  ropa: { code: "ROPA", what: (o) => `is ${o}'s Record of Processing Activities, documenting each processing activity, its lawful basis, the personal data and data subjects involved, recipients, transfers and retention, as required under the NDPA and the GAID`, next: ["confirm that each activity is complete and accurate", "tell us of any processing not yet recorded", "review the record at least every six months and on any change in processing"] },
  version: { code: "DOC", what: (o) => `has been prepared for ${o} under the NDPA and the GAID`, next: ["review the document and send us any comments", "approve it through your internal process", "communicate it to the staff and data subjects it concerns"] },
};

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** The cover letter HTML for a client report. `title` is the report's own name. */
export async function reportCover(clientId: string, kind: Kind, title: string) {
  const c = (await one("select f.*, c.name as client_name from clients c join firms f on f.id = c.firm_id where c.id = $1", [clientId]))!;
  const ans = await answersOf(clientId), s = (k: string) => (typeof ans[k] === "string" && (ans[k] as string).trim() ? (ans[k] as string).trim() : null);
  const org = s("org_legal_name") ?? c.client_name, dpo = s("dpo_name"), a = ABOUT[kind], today = todayWAT();
  const initials = (n: string) => n.split(/\s+/).filter((w) => /^[A-Za-z]/.test(w) && !/^(ltd|limited|plc|of|and|the)\.?$/i.test(w)).map((w) => w[0].toUpperCase()).join("").slice(0, 6);
  const ref = `${initials(c.name ?? "") || "DPCO"}/${initials(org)}/${a.code}/${today.slice(0, 4)}`;
  const logo = c.logo && c.logo_w && c.logo_h ? `<img src="${c.logo}" width="${Math.round((c.logo_w * 56) / c.logo_h)}" height="56" alt="${esc(c.name)}" style="height:56px;width:auto">` : "";
  const what = kind === "version" ? `The attached ${esc(title)} ${a.what(esc(org))}` : `The attached report ${a.what(esc(org))}`;
  return `<section>
<table><tr><td style="width:22%">${logo || `<b>${esc(c.name)}</b>`}</td>
  <td><p style="margin:0"><b>${esc(c.name)}</b></p><p style="margin:0;font-size:8.5pt">${[c.address, c.email, c.website, c.phone, c.rc_number ? `RC: ${c.rc_number}` : null].filter(Boolean).map(esc).join("<br>")}</p></td>
  <td style="width:22%;text-align:right"><p style="margin:0;font-size:8pt"><b>DPCO</b>${c.ndpc_licence_no ? `<br>${esc(c.ndpc_licence_no)}` : ""}</p></td></tr></table>
<p>Ref: ${esc(ref)}<br>${fmtDate(today)}</p>
<p>${dpo ? `${esc(dpo)}<br>` : ""}The Data Protection Officer<br><b>${esc(org)}</b>${s("org_address") ? `<br>${esc(s("org_address"))}` : ""}${s("dpo_email") ?? s("org_email") ? `<br>${esc(s("dpo_email") ?? s("org_email"))}` : ""}</p>
<p>Dear ${dpo ? esc(dpo) : "Sir/Madam"},</p>
<p><b><u>RE: SUBMISSION OF ${esc(title).toUpperCase()} — ${esc(org).toUpperCase()}</u></b></p>
<p>Further to our engagement as ${esc(org)}'s Data Protection Compliance Organisation, we are pleased to submit the attached <b>${esc(title)}</b>.</p>
<p>${what}.</p>
<p>To take this forward, we recommend that ${esc(org)}:</p>
<ol>${a.next.map((n) => `<li>${n};</li>`).join("").replace(/;<\/li>$/, ".</li>")}</ol>
<p>We remain available to walk your team through the ${kind === "version" ? "document" : "report"} and to support the next steps. Please do not hesitate to contact us with any questions.</p>
<p>Yours faithfully,</p>
<p><b>For: ${esc(c.name).toUpperCase()}</b></p>
<p style="margin-top:32px"><b>${esc(c.signatory_name ?? "")}</b>${c.signatory_credentials ? `, ${esc(c.signatory_credentials)}` : ""}<br>${esc(c.signatory_title ?? "")}</p>
<p class="note">Enclosure: ${esc(title)}</p>
</section><section class="break"></section>`;
}
