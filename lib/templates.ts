import { fmtWAT, fmtDate } from "./rules";

// Deterministic pre-fill from the client's structured data (FR6.2). The AI gateway builds on these drafts.
// ponytail: templates live in code; Secretary-editable templates (R06) come when content churns.
// Body format: plain text, "# " / "## " headings, "- " bullets. Rendered by components/Doc.tsx.

export const TODO = "[To be completed]";
const or = (v: unknown) => (v == null || String(v).trim() === "" ? TODO : String(v));

export const LAWFUL_BASIS: Record<string, string> = {
  consent: "Consent", contract: "Performance of a contract", legal_obligation: "Legal obligation",
  vital_interest: "Vital interests", public_interest: "Public interest or official authority", legitimate_interest: "Legitimate interests",
};

export type Ropa = { id: string; purpose: string; lawful_basis: string | null; data_subjects: string | null; data_categories: string | null; recipients: string | null; has_transfer: boolean; transfer_safeguard: string | null; retention_period: string | null; security_measures: string | null; system_owner: string | null; involves_sensitive: boolean };
export type Ctx = { orgName: string; address?: string; ropa: Ropa[] };

const uniq = (xs: (string | null)[]) => [...new Set(xs.flatMap((x) => (x ?? "").split(",").map((s) => s.trim())).filter(Boolean))];
const bullets = (xs: string[]) => (xs.length ? xs.map((x) => `- ${x}`).join("\n") : `- ${TODO}`);

export const NDPA_REFS: Record<string, string> = {
  privacy_notice: "s.24, s.25, s.27, s.34",
  data_retention_policy: "s.24(1)(d), s.39",
  consent_form: "s.25(1)(a), s.26",
};

export const TEMPLATE_TITLES: Record<string, string> = {
  privacy_notice: "Privacy Notice",
  data_retention_policy: "Data Retention Policy",
  consent_form: "Consent Form",
};

export function policy(key: string, c: Ctx): string {
  const org = or(c.orgName);
  if (key === "privacy_notice") return `# Privacy Notice

${org} ("we", "us") respects your privacy. This notice explains what personal data we collect, why we use it, and your rights under the Nigeria Data Protection Act 2023.

## Who we are
${org}, ${or(c.address)}.

## Whose personal data we collect
${bullets(uniq(c.ropa.map((r) => r.data_subjects)))}

## What personal data we collect
${bullets(uniq(c.ropa.map((r) => r.data_categories)))}

## Why we use it and our lawful basis
${bullets(c.ropa.map((r) => `${r.purpose}: ${r.lawful_basis ? LAWFUL_BASIS[r.lawful_basis] : TODO}`))}

## Who we share it with
${bullets(uniq(c.ropa.map((r) => r.recipients)))}

## Transfers outside Nigeria
${c.ropa.some((r) => r.has_transfer) ? `Some personal data is transferred outside Nigeria. We protect it by: ${or(c.ropa.find((r) => r.has_transfer)?.transfer_safeguard)}.` : "We do not transfer personal data outside Nigeria."}

## How long we keep it
${bullets(c.ropa.map((r) => `${r.purpose}: ${or(r.retention_period)}`))}

## How we protect it
${bullets(uniq(c.ropa.map((r) => r.security_measures)))}

## Your rights
You may ask for a copy of your personal data, ask us to correct or delete it, object to or restrict how we use it, ask for it in a portable format, and withdraw consent at any time where we rely on consent. You may also complain to the Nigeria Data Protection Commission.

## Contact us
Data Protection Officer: ${TODO}`;

  if (key === "data_retention_policy") return `# Data Retention Policy

## Purpose
This policy sets how long ${org} keeps personal data and how it is disposed of, so that data is not kept longer than necessary (NDPA 2023 s.24).

## Scope
All personal data processed by ${org}, in every system and format.

## Retention schedule
${bullets(c.ropa.map((r) => `${r.purpose} (${or(r.data_categories)}): kept for ${or(r.retention_period)}. Held in: ${or(r.system_owner)}`))}

## Disposal
At the end of the retention period, personal data is securely deleted or anonymised. Paper records are shredded. Disposal is recorded in the retention log.

## Exceptions
Data may be kept longer where required by law, for legal claims, or where a regulator requires it. Exceptions are approved by the Data Protection Officer.

## Review
This policy is reviewed every year, or sooner if processing changes.`;

  const consent = c.ropa.filter((r) => r.lawful_basis === "consent");
  return `# Consent Form

${org} asks for your consent to use your personal data for the purposes below. You do not have to agree, and you can withdraw your consent at any time without affecting anything we did before you withdrew.

## What we will use your data for
${bullets((consent.length ? consent : c.ropa).map((r) => `${r.purpose} (data used: ${or(r.data_categories)})`))}

## Who will see it
${bullets(uniq((consent.length ? consent : c.ropa).map((r) => r.recipients)))}

## How long we keep it
${bullets((consent.length ? consent : c.ropa).map((r) => `${r.purpose}: ${or(r.retention_period)}`))}

## Your choice
- [ ] I agree to ${org} using my personal data for the purposes above.

Name: ______________________  Signature: ______________________  Date: __________

To withdraw consent, contact: ${TODO}`;
}

// ---------- DPIA (FR5.2) ----------

export const DPIA_STEPS = [
  { key: "description", title: "Description of processing" },
  { key: "necessity", title: "Necessity and proportionality" },
  { key: "risks", title: "Risk identification" },
  { key: "scoring", title: "Risk scoring" },
  { key: "mitigations", title: "Mitigations" },
  { key: "residual", title: "Residual risk" },
  { key: "conclusion", title: "Conclusion" },
] as const;

export type Risk = { description: string; likelihood: number; impact: number; mitigation?: string; residual_likelihood?: number; residual_impact?: number };
export type DpiaBody = Partial<Record<(typeof DPIA_STEPS)[number]["key"], string>> & { risks_list?: Risk[] };

export function dpiaStep(step: string, c: Ctx): string {
  const r = c.ropa;
  switch (step) {
    case "description":
      return r.map((e) => `## ${e.purpose}\n- People: ${or(e.data_subjects)}\n- Data: ${or(e.data_categories)}\n- Systems: ${or(e.system_owner)}\n- Shared with: ${or(e.recipients)}\n- Transfers outside Nigeria: ${e.has_transfer ? "Yes" : "No"}`).join("\n\n");
    case "necessity":
      return r.map((e) => `## ${e.purpose}\n- Lawful basis: ${e.lawful_basis ? LAWFUL_BASIS[e.lawful_basis] : TODO}\n- Retention: ${or(e.retention_period)}\n- Is all of this data needed for the purpose? ${TODO}\n- Could the purpose be met with less data? ${TODO}`).join("\n\n");
    case "risks":
      return bullets(suggestedRisks(c).map((x) => x.description));
    case "mitigations":
      return bullets(uniq(r.map((e) => e.security_measures)));
    case "residual":
      return `After the mitigations above, the remaining risk is: ${TODO}`;
    case "conclusion":
      return `The processing ${TODO} proceed. Review date: ${TODO}.`;
    default:
      return "";
  }
}

/** DPIA JSON body → the plain document format, for export and signing. */
export function dpiaText(title: string, body: string, level: (n: number) => string): string {
  const b: DpiaBody = JSON.parse(body || "{}");
  return [`# Data Privacy Impact Assessment: ${title}`, ...DPIA_STEPS.map((s) => {
    if (s.key === "scoring") return `## ${s.title}\n${(b.risks_list ?? []).map((r) => `- ${r.description}: likelihood ${r.likelihood} × impact ${r.impact} = ${r.likelihood * r.impact} (${level(r.likelihood * r.impact)})`).join("\n") || `- ${TODO}`}`;
    return `## ${s.title}\n${b[s.key] || TODO}`;
  })].join("\n\n");
}

export function suggestedRisks(c: Ctx): Risk[] {
  const out: Risk[] = [{ description: "Unauthorised access to personal data", likelihood: 3, impact: 4 }];
  if (c.ropa.some((e) => e.involves_sensitive)) out.push({ description: "Disclosure of sensitive personal data causing discrimination or distress", likelihood: 2, impact: 5 });
  if (c.ropa.some((e) => e.has_transfer)) out.push({ description: "Loss of protection when data is transferred outside Nigeria", likelihood: 3, impact: 3 });
  if (c.ropa.some((e) => !e.retention_period)) out.push({ description: "Data kept longer than necessary", likelihood: 4, impact: 2 });
  return out;
}

// ---------- Breach notifications (FR7.4) ----------

export type Breach = { aware_at: Date; description: string; data_affected: string | null; subjects_affected: string | null; est_count: number | null; containment: string | null; remediation: string | null };

export function breachNotice(audience: string, org: string, b: Breach): string {
  if (audience === "regulator") return `# Personal data breach notification

To: Nigeria Data Protection Commission
From: ${org} (data controller)

## When we became aware
${fmtWAT(b.aware_at)}

## What happened
${b.description}

## Personal data and people affected
- Data: ${or(b.data_affected)}
- People: ${or(b.subjects_affected)}
- Approximate number affected: ${b.est_count ?? TODO}

## Likely consequences
${TODO}

## Measures taken or proposed
- Containment: ${or(b.containment)}
- Remediation: ${or(b.remediation)}

## Contact point
Data Protection Officer: ${TODO}`;

  return `# Important: a problem affecting your personal data

${org} is writing to let you know about an incident that affected some of your personal data.

## What happened
${b.description}

## What information was involved
${or(b.data_affected)}

## What we are doing
${or(b.containment)} ${b.remediation ?? ""}

## What you can do
${TODO}

## Contact us
If you have questions, contact our Data Protection Officer: ${TODO}`;
}

// ---------- DSAR response (FR16.5) ----------

const DSAR_LINES: Record<string, string> = {
  access: "Enclosed is a copy of the personal data we hold about you, with the purposes, recipients and retention periods that apply.",
  rectification: "We have corrected the personal data you told us was inaccurate. The corrected details are set out below.",
  erasure: "We have deleted the personal data you asked us to erase, except where we must keep it by law, as explained below.",
  objection: "We have stopped processing your personal data for the purposes you objected to, as set out below.",
  portability: "Enclosed is your personal data in a structured, commonly used, machine-readable format.",
};
export const DSAR_TYPES: Record<string, string> = {
  access: "Access (a copy of their data)", rectification: "Rectification (correct their data)", erasure: "Erasure (delete their data)",
  objection: "Objection (stop a use of their data)", portability: "Portability (data in a reusable format)",
};

export function dsarResponse(org: string, d: { requester_name: string; request_type: string; received_on: string }, ropa: Ropa[]): string {
  return `# Response to your data protection request

Dear ${d.requester_name},

Thank you for your ${d.request_type} request, which ${org} received on ${fmtDate(d.received_on)}.

${DSAR_LINES[d.request_type] ?? ""}

## Processing activities that involve your data
${bullets(ropa.map((r) => `${r.purpose} (${r.lawful_basis ? LAWFUL_BASIS[r.lawful_basis] : "lawful basis to be confirmed"})`))}

## Details
${TODO}

If you are not satisfied with this response, you may complain to the Nigeria Data Protection Commission.

Yours sincerely,
${org}`;
}
