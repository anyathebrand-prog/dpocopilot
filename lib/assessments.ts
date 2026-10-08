// Legitimate interest assessments (LIA) and cross-border transfer risk assessments (TIA): fixed question sets, pre-filled
// from the linked RoPA activity and onboarding answers, rendered for PDF/Word export (lib/docx.ts).
import { LAWFUL_BASIS, type Ropa } from "./templates";
import { riskLevel, fmtDate } from "./rules";

export type Kind = "lia" | "tia";
type Q = { key: string; label: string; help?: string };
type Section = { title: string; questions: Q[] };
type Pre = { org: string; ropa: Ropa | null; countries: string[] };

export const KINDS: Record<Kind, { name: string; short: string; intro: string; outcomes: string[]; sections: Section[] }> = {
  lia: {
    name: "Legitimate Interest Assessment", short: "LIAs",
    intro: "Records the three-part test for relying on legitimate interests as the lawful basis (NDPA s.25): purpose, necessity and balancing.",
    outcomes: ["Legitimate interest can be relied on", "Can be relied on with the safeguards recorded", "Cannot be relied on: choose another lawful basis"],
    sections: [
      { title: "1. Purpose test", questions: [
        { key: "interest", label: "What is the legitimate interest being pursued?" },
        { key: "benefit", label: "Who benefits from the processing, and how?", help: "The organisation, third parties, the data subjects, society." },
        { key: "lawful_ethical", label: "Is the interest lawful and ethical, and would anyone be harmed if it were not pursued?" },
      ] },
      { title: "2. Necessity test", questions: [
        { key: "achieves", label: "Does the processing actually help achieve the purpose?" },
        { key: "alternatives", label: "Is there a less intrusive way to achieve the same result?" },
        { key: "minimisation", label: "Is only the minimum personal data used?" },
      ] },
      { title: "3. Balancing test", questions: [
        { key: "nature", label: "What is the nature of the data? Is any of it sensitive, or about children or vulnerable people?" },
        { key: "expectations", label: "Would data subjects reasonably expect this processing, given their relationship with the organisation?" },
        { key: "impact", label: "What is the likely impact on data subjects, including any harm or distress?" },
        { key: "safeguards", label: "What safeguards reduce the impact (transparency, opt-out, retention limits, security)?" },
        { key: "objection", label: "How can data subjects object (NDPA s.36), and how are objections handled?" },
      ] },
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
const or = (v: string | null | undefined) => (v && v.trim() ? v.trim() : TBC);

/** Starting answers from the linked RoPA activity and onboarding. */
export function prefill(kind: Kind, p: Pre): Record<string, string> {
  const r = p.ropa;
  if (kind === "lia") return {
    interest: r ? `${p.org}'s interest in ${r.purpose.toLowerCase()}. ${TBC}` : TBC,
    nature: r ? `${or(r.data_categories)} about ${or(r.data_subjects)}.${r.involves_sensitive ? " Includes sensitive personal data, which cannot rely on legitimate interests alone (NDPA s.30)." : ""}` : TBC,
    safeguards: r?.security_measures ? `${r.security_measures}. Retention: ${or(r.retention_period)}.` : TBC,
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
