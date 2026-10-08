// Legitimate interest assessments (LIA) and cross-border transfer risk assessments (TIA): fixed question sets, pre-filled
// from the linked RoPA activity and onboarding answers, rendered for PDF/Word export (lib/docx.ts).
import { LAWFUL_BASIS, type Ropa } from "./templates";
import { riskLevel, fmtDate } from "./rules";

export type Kind = "lia" | "tia";
type Q = { key: string; label: string; help?: string; type?: "choice"; options?: string[] };
type Section = { title: string; questions: Q[] };
type Pre = { org: string; ropa: Ropa | null; countries: string[] };

/** Safeguards in the LIA report (section 8): key, name, standard implementation. */
export const LIA_SAFEGUARDS: [string, string, string][] = [
  ["transparency", "Transparency", "Name the legitimate interest in the privacy notice; give notice at or before collection."],
  ["objection", "Right to object", "Simple opt-out or objection route; objections assessed and recorded; processing stopped unless compelling grounds are shown."],
  ["minimisation", "Data minimisation", "Collect only the data identified in Section 6; pseudonymise where possible."],
  ["retention", "Retention", "Defined retention schedule with automatic deletion or review."],
  ["security", "Security", "Access controls, encryption, logging and staff training appropriate to the risk."],
  ["processors", "Processor oversight", "Written data processing agreements in place with all processors."],
  ["breach", "Breach readiness", "Breach response procedure aligned to NDPC notification timelines."],
  ["monitoring", "Monitoring", "Periodic checks that processing remains within the assessed scope."],
];
/** Potential impacts in the LIA report (section 7.3). */
export const LIA_IMPACTS: [string, string][] = [["privacy", "Loss of privacy or intrusion"], ["unfair", "Unfair or discriminatory outcome"], ["financial", "Financial harm or loss of opportunity"], ["distress", "Distress or loss of control over personal data"]];

export const KINDS: Record<Kind, { name: string; short: string; intro: string; outcomes: string[]; sections: Section[] }> = {
  lia: {
    name: "Legitimate Interest Assessment", short: "LIAs",
    intro: "The three-part test (purpose, necessity, balancing) the GAID requires where legitimate interest is relied on as the lawful basis (NDPA s.25). Follows the LIA report format.",
    outcomes: ["Proceed", "Proceed with safeguards", "Do not proceed"],
    sections: [
      { title: "Context and processing activity", questions: [
        { key: "role", label: "Role under the NDPA", type: "choice", options: ["Data Controller", "Data Processor", "Joint Controller"] },
        { key: "third_parties", label: "Third parties pursuing the interest (or None)" },
        { key: "business_owner", label: "Business owner of the activity (name, department)" },
        { key: "description", label: "Description of the activity, step by step" },
        { key: "function", label: "Business function" },
        { key: "systems", label: "Systems and tools used (applications, processors, hosting location)" },
        { key: "frequency", label: "Start date / frequency" },
        { key: "scale", label: "Scale of processing (number of data subjects and records)" },
        { key: "source", label: "Source of the data (collected directly / from a third party)" },
        { key: "retention", label: "Retention period and justification" },
        { key: "residual", label: "Residual risk to data subjects", type: "choice", options: ["Low", "Medium", "High"] },
        { key: "dpia", label: "DPIA required?", type: "choice", options: ["Yes", "No", "To be determined"] },
      ] },
      { title: "1. Purpose test", questions: [
        { key: "interest", label: "What is the specific interest being pursued?" },
        { key: "whose", label: "Whose interest is it?" },
        { key: "benefit", label: "What benefit does the interest bring, and to whom?" },
        { key: "if_not", label: "What would be the impact if the processing did not go ahead?" },
        { key: "lawful", label: "Is the interest lawful and clearly articulated?" },
        { key: "support", label: "Does any law, code or sector guidance support the interest?" },
        { key: "real", label: "Is the interest real and present rather than speculative?" },
        { key: "purpose_result", label: "Purpose test outcome", type: "choice", options: ["Met", "Partly met", "Not met"] },
        { key: "purpose_reason", label: "Reasoning (two or three sentences)" },
      ] },
      { title: "2. Necessity test", questions: [
        { key: "achieves", label: "Does the processing actually help achieve the interest?" },
        { key: "alternatives", label: "Is there a less intrusive way to achieve the same result?" },
        { key: "anonymised", label: "Can the purpose be met with anonymised or pseudonymised data?" },
        { key: "minimisation", label: "Is each data element necessary (data minimisation)?" },
        { key: "retention_ok", label: "Is the retention period no longer than needed?" },
        { key: "access", label: "Is access limited to those who need it?" },
        { key: "other_basis", label: "Would another lawful basis be more appropriate?" },
        { key: "necessity_result", label: "Necessity test outcome", type: "choice", options: ["Met", "Partly met", "Not met"] },
        { key: "necessity_reason", label: "Reasoning (two or three sentences)" },
      ] },
      { title: "3. Balancing test", questions: [
        { key: "relationship", label: "Relationship with data subjects" },
        { key: "nature", label: "Is the data private, financial, location or behavioural in nature?" },
        { key: "vulnerable", label: "Are vulnerable individuals or children affected?" },
        { key: "expected", label: "Would data subjects reasonably expect this processing at the time of collection?" },
        { key: "notice", label: "Has the activity been explained in the privacy notice?" },
        { key: "consistent", label: "Is the use consistent with the original purpose of collection?" },
        ...LIA_IMPACTS.flatMap(([k, l]) => [
          { key: `imp_${k}_l`, label: `${l}: likelihood`, type: "choice" as const, options: ["Low", "Med", "High"] },
          { key: `imp_${k}_s`, label: `${l}: severity`, type: "choice" as const, options: ["Low", "Med", "High"] },
        ]),
        { key: "balance", label: "Balance: how the interest compares with the impact, taking the safeguards into account" },
        { key: "balancing_result", label: "Balancing test outcome", type: "choice", options: ["Met", "Met with safeguards", "Not met"] },
        { key: "balancing_reason", label: "Reasoning (two or three sentences)" },
      ] },
      { title: "4. Safeguards: owner / due date", questions: LIA_SAFEGUARDS.map(([k, l]) => ({ key: `sg_${k}`, label: `${l}: owner / due date` })) },
      { title: "5. Review", questions: [{ key: "next_review", label: "Next full review (not later than 12 months from approval)" }] },
    ],
  },
  tia: {
    name: "Cross-Border Transfer Risk Assessment", short: "Transfer risk",
    intro: "Assesses a transfer of personal data outside Nigeria under NDPA ss.41–43: adequacy of protection, the basis relied on, risks in the destination and supplementary measures.",
    outcomes: ["Transfer may proceed", "Transfer may proceed with the supplementary measures recorded", "Transfer must not proceed or must be suspended"],
    sections: [
      { title: "1. Transfer details", questions: [
        { key: "destination", label: "Destination country or countries" },
        { key: "recipient", label: "Recipient and its role (processor, controller, group company)" },
        { key: "data", label: "Personal data transferred, and whose" },
        { key: "purpose", label: "Purpose of the transfer" },
        { key: "volume", label: "Frequency and volume (one-off, continuous, number of records)" },
      ] },
      { title: "2. Adequacy of protection (NDPA ss.41–42)", questions: [
        { key: "adequacy", label: "Is the recipient subject to a law, binding corporate rules, contractual clauses, code of conduct or certification giving adequate protection?" },
        { key: "evidence", label: "What evidence supports this (contract clauses, certifications, NDPC adequacy decisions)?" },
      ] },
      { title: "3. Basis where protection is not adequate (NDPA s.43)", questions: [
        { key: "derogation", label: "Which basis applies, if any (informed consent to the risks, contract with the data subject, public interest, legal claims, vital interests)?" },
      ] },
      { title: "4. Risks in the destination", questions: [
        { key: "gov_access", label: "Can public authorities access the data, and are there remedies for data subjects?" },
        { key: "enforcement", label: "Is data protection law in the destination enforced in practice?" },
        { key: "onward", label: "Will the recipient transfer the data onward, and to whom?" },
        { key: "sensitivity", label: "How sensitive is the data, and what harm could follow from misuse?" },
      ] },
      { title: "5. Supplementary measures", questions: [
        { key: "technical", label: "Technical measures (encryption with keys held in Nigeria, pseudonymisation, access controls)" },
        { key: "contractual", label: "Contractual and organisational measures (audit rights, breach notification, onward-transfer limits)" },
      ] },
    ],
  },
};

const TBC = "[To be completed]";
const VULNERABLE = /child|minor|student|pupil|patient|elderly|vulnerable/i;
const or = (v: string | null | undefined) => (v && v.trim() ? v.trim() : TBC);

/** Starting answers from the linked RoPA activity and onboarding. */
export function prefill(kind: Kind, p: Pre): Record<string, string> {
  const r = p.ropa;
  if (kind === "lia") return {
    role: "Data Controller",
    interest: r ? `${p.org}'s interest in ${r.purpose.toLowerCase()}. ${TBC}` : TBC,
    whose: p.org,
    business_owner: or(r?.department),
    description: r?.purpose ?? TBC,
    function: or(r?.department),
    systems: or(r?.system_owner),
    retention: or(r?.retention_period),
    nature: r ? `${or(r.data_categories)} about ${or(r.data_subjects)}.${r.involves_sensitive ? " Includes sensitive personal data: legitimate interest is not an appropriate basis (NDPA s.30); stop and reassess." : ""}` : TBC,
    vulnerable: r && VULNERABLE.test(r.data_subjects ?? "") ? `Yes: ${r.data_subjects}. Enhanced assessment needed.` : TBC,
    dpia: "To be determined",
  };
  return {
    destination: p.countries.length ? p.countries.join(", ") : TBC,
    recipient: or(r?.recipients),
    data: r ? `${or(r.data_categories)} about ${or(r.data_subjects)}` : TBC,
    purpose: r?.purpose ?? TBC,
    adequacy: r?.transfer_safeguard ? `Safeguard recorded in the RoPA: ${r.transfer_safeguard}. ${TBC}` : TBC,
    sensitivity: r ? (r.involves_sensitive ? "Includes sensitive personal data: higher impact if misused." : "No sensitive personal data recorded.") : TBC,
  };
}

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export function assessmentHtml(a: { kind: Kind; title: string; assessment_year: number; answers: Record<string, string>; likelihood: number | null; impact: number | null; outcome: string | null; status: string; approved_at: Date | null; approver: string | null },
  o: { org: string; firm: string; ropa: Ropa | null }) {
  const k = KINDS[a.kind], score = a.likelihood && a.impact ? a.likelihood * a.impact : null;
  const body = `
  <h1>${k.name}</h1>
  <table><tr><td class="k">Organisation</td><td>${esc(o.org)}</td></tr><tr><td class="k">Assessment</td><td>${esc(a.title)}</td></tr>
    <tr><td class="k">Processing activity</td><td>${esc(o.ropa?.purpose ?? "Not linked")}${o.ropa?.lawful_basis ? ` (lawful basis: ${esc(LAWFUL_BASIS[o.ropa.lawful_basis])})` : ""}</td></tr>
    <tr><td class="k">Year</td><td>${a.assessment_year}</td></tr><tr><td class="k">Prepared by</td><td>${esc(o.firm)}</td></tr>
    <tr><td class="k">Status</td><td>${a.status === "approved" ? `Approved${a.approver ? ` by ${esc(a.approver)}` : ""}${a.approved_at ? ` on ${fmtDate(new Date(a.approved_at).toISOString().slice(0, 10))}` : ""}` : "Draft"}</td></tr></table>
  <p class="note">${esc(k.intro)}</p>
  ${k.sections.map((s) => `<h2>${esc(s.title)}</h2><table>${s.questions.map((q) => `<tr><td class="k">${esc(q.label)}</td><td>${esc(a.answers[q.key] || TBC)}</td></tr>`).join("")}</table>`).join("")}
  ${a.kind === "tia" ? `<h2>6. Risk rating</h2><table><tr><td class="k">Likelihood × impact</td><td>${score ? `${a.likelihood} × ${a.impact} = <b>${score} (${riskLevel(score)})</b>` : TBC}</td></tr></table>` : ""}
  <h2>${a.kind === "tia" ? "7" : "4"}. Outcome</h2><p><b>${esc(a.outcome || TBC)}</b></p>
  ${a.answers.outcome_notes ? `<p>${esc(a.answers.outcome_notes)}</p>` : ""}
  <table><tr><th>Role</th><th>Name</th><th style="width:25%">Signature</th><th style="width:15%">Date</th></tr><tr><td>DPO</td><td></td><td></td><td></td></tr><tr><td>Approver</td><td>${esc(a.approver ?? "")}</td><td></td><td></td></tr></table>`;
  return { title: `${o.org} ${k.name} - ${a.title}`, body };
}
