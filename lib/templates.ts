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

export type Ropa = { id: string; purpose: string; department?: string | null; is_high_risk?: boolean; lawful_basis: string | null; data_subjects: string | null; data_categories: string | null; recipients: string | null; has_transfer: boolean; transfer_safeguard: string | null; retention_period: string | null; security_measures: string | null; system_owner: string | null; involves_sensitive: boolean };
export type Ctx = { orgName: string; address?: string; ropa: Ropa[]; sector?: string; dpoName?: string; departments?: string[]; transferCountries?: string[]; subjects6mo?: string };

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
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

// ---------- DPIA (FR5.2): the 12-point NDPC DPIA guide, plus outcome and sign-off ----------

export const DPIA_STEPS = [
  { key: "screening", title: "Need for a DPIA", guide: "Identify the need for a DPIA: screen the data processing activities and determine whether they are likely to result in a high risk to data subjects." },
  { key: "purpose", title: "Organisation and purpose", guide: "Highlight the central work of the organisation, the purpose or aim pursued in the processing of personal data, and the major reasons for carrying out a DPIA." },
  { key: "method", title: "Method of processing", guide: "State the method (automated or otherwise) the organisation intends to employ for the processing." },
  { key: "lawful_basis", title: "Legal grounds", guide: "State the legal grounds for processing personal data, such as consent, contract, legal obligation, vital interest, public interest or legitimate interest." },
  { key: "necessity", title: "Necessity of the means", guide: "Highlight the pivotal essence or compelling importance of the means employed for processing to the realisation of the lawful purpose." },
  { key: "stakeholders", title: "Stakeholders", guide: "Identify the stakeholders: the data subjects, the Nigeria Data Protection Commission and the internal managers of the processing (management decision makers, Chief Information Security Officer, Data Protection Officer and users of the processing medium)." },
  { key: "risks_cia", title: "Risks to confidentiality, integrity and availability", guide: "Account for every possible risk, including possible inadvertence on the part of data subjects. State the risks to data confidentiality, integrity and availability." },
  { key: "harms", title: "Potential harm to data subjects", guide: "State the potential risks or harm that may happen to data subjects, even if the lawful purpose has no obvious risk." },
  { key: "transfers", title: "Transfers outside Nigeria", guide: "State whether the data will be transferred outside Nigeria, to where, and on what basis and safeguards." },
  { key: "principles_rights", title: "Principles and data subjects' rights", guide: "Itemise the principles of data protection and the data subjects' rights, and how each is upheld for this processing." },
  { key: "scoring", title: "Risks identified", guide: "Mention all the risks identified during the DPIA, and score each by likelihood and impact." },
  { key: "measures", title: "Measures for each risk", guide: "State the technical and organisational measures necessary to mitigate each risk to the barest minimum, and the risk that remains." },
  { key: "conclusion", title: "Outcome and review", guide: "Record the outcome of the assessment, the residual risk, the DPO's advice, approval and the review date." },
] as const;

export type Risk = {
  description: string; likelihood: number; impact: number; detail?: string; harm?: string;
  mitigation?: string; residual_likelihood?: number; residual_impact?: number; owner?: string; target_date?: string; accepted?: "yes" | "no";
};

/** Standard DPIA risks from the DPIA report format (R1–R9, illustrative starting scores) plus the guide's data-subject
 *  inadvertence risk, each with its usual controls and owner. Scores must be validated with the DPO and process owners. */
export const STANDARD_RISKS: Required<Pick<Risk, "description" | "detail" | "harm" | "likelihood" | "impact" | "mitigation" | "owner">>[] = [
  { description: "Unauthorised access / data breach", detail: "Hacking, weak authentication or misconfiguration exposes personal data", harm: "Identity theft, fraud, distress", likelihood: 4, impact: 5, mitigation: "MFA, encryption at rest and in transit, network segmentation, vulnerability scanning and annual penetration test; tested breach response plan with 72-hour NDPC notification", owner: "CISO / IT" },
  { description: "Excessive collection", detail: "More data collected than needed for the purpose", harm: "Loss of control, privacy intrusion", likelihood: 3, impact: 3, mitigation: "Data minimisation review of all forms and APIs; remove non-essential fields", owner: "Product owner" },
  { description: "Weak consent and transparency", detail: "Unclear notices; bundled or non-withdrawable consent", harm: "Unfair processing, loss of autonomy", likelihood: 4, impact: 4, mitigation: "Layered privacy notice; granular, recorded and withdrawable consent; consent log", owner: "DPO / Legal" },
  { description: "Cross-border transfer without safeguards", detail: "Data hosted or accessed abroad without adequate protection", harm: "Reduced legal remedies", likelihood: 3, impact: 4, mitigation: "Transfer impact assessment; contractual safeguards; prefer in-country hosting", owner: "DPO / Legal" },
  { description: "Excessive retention", detail: "Data kept beyond purpose or legal need", harm: "Increased breach exposure", likelihood: 4, impact: 3, mitigation: "Approved retention schedule; automated deletion and anonymisation", owner: "IT / Records" },
  { description: "Processor non-compliance", detail: "Vendors process data outside instructions or lack security", harm: "Unauthorised use or disclosure", likelihood: 3, impact: 4, mitigation: "NDPA/GAID-compliant DPAs; vendor due diligence and annual review; audit rights", owner: "Procurement / DPO" },
  { description: "Failure to honour data subject rights", detail: "Requests missed, delayed or not authenticated", harm: "Breach of rights; complaints to NDPC", likelihood: 3, impact: 4, mitigation: "DSAR procedure, identity verification, request tracker and 30-day SLA", owner: "DPO" },
  { description: "Inaccurate data / automated decisions", detail: "Wrong data or unreviewed algorithmic outcomes", harm: "Unfair denial of services", likelihood: 3, impact: 3, mitigation: "Data quality checks; human review of automated decisions; right to contest", owner: "Product owner" },
  { description: "Insider misuse", detail: "Staff access data without business need", harm: "Privacy intrusion, reputational harm", likelihood: 3, impact: 4, mitigation: "Least-privilege access, access logging and review, confidentiality agreements, staff training", owner: "HR / IT" },
  { description: "Inadvertent disclosure by data subjects", detail: "Data subjects share passwords or one-time codes, respond to phishing, or give more data than needed", harm: "Account takeover, fraud, loss of control", likelihood: 3, impact: 3, mitigation: "Clear guidance at collection points, anti-phishing notices, never asking for full credentials, step-up verification for sensitive actions", owner: "DPO / IT" },
];
export const standardRisk = (description: string) => STANDARD_RISKS.find((r) => r.description.toLowerCase() === description.trim().toLowerCase());
export type DpiaBody = Partial<Record<(typeof DPIA_STEPS)[number]["key"], string>> & { risks_list?: Risk[] };

/** DPIAs written before the 12-point structure: their sections move to the matching new step, so nothing is lost. */
const LEGACY: Record<string, string> = { description: "purpose", risks: "risks_cia", mitigations: "measures" };
export function normalizeDpia(raw: string | object | null | undefined): DpiaBody {
  const b = (typeof raw === "string" ? JSON.parse(raw || "{}") : raw ?? {}) as Record<string, unknown>;
  const out: Record<string, unknown> = { ...b };
  for (const [old, now] of Object.entries(LEGACY)) {
    if (typeof b[old] !== "string" || !b[old]) { delete out[old]; continue; }
    out[now] = out[now] ? `${out[now]}\n\n${b[old]}` : b[old];
    delete out[old];
  }
  if (typeof b.residual === "string" && b.residual) out.conclusion = `## Residual risk\n${b.residual}${out.conclusion ? `\n\n${out.conclusion}` : ""}`;
  delete out.residual;
  return out as DpiaBody;
}

const FINANCIAL = /bank|payment|card|bvn|nin|\bid\b|identity|salary|payroll/i;
const VULNERABLE = /child|minor|student|pupil|patient|elderly|vulnerable/i;

/** High-risk indicators for one processing activity (NDPA s.28 screening). */
function triggers(e: Ropa, c: Ctx) {
  const t: string[] = [];
  if (e.involves_sensitive) t.push("it involves sensitive personal data");
  if (e.is_high_risk) t.push("it is recorded as high-risk processing");
  if (e.has_transfer) t.push("personal data is transferred outside Nigeria");
  if (VULNERABLE.test(e.data_subjects ?? "")) t.push("data subjects include vulnerable people");
  if (FINANCIAL.test(e.data_categories ?? "")) t.push("it involves financial or identity data");
  if (Number(c.subjects6mo) >= 1000) t.push(`it is large-scale (at least ${c.subjects6mo} data subjects in six months)`);
  return t;
}
const yn = (b: boolean | undefined) => (b ? "Yes" : "No");

export function dpiaStep(step: string, c: Ctx): string {
  const r = c.ropa;
  const per = (f: (e: Ropa) => string) => (r.length ? r.map((e) => `## ${e.purpose}\n${f(e)}`).join("\n\n") : `- ${TODO}`);
  switch (step) {
    case "screening": {
      const why = uniq(r.flatMap((e) => triggers(e, c)));
      return `${per((e) => [
        `- Sensitive personal data: ${yn(e.involves_sensitive)}`,
        `- Recorded as high-risk processing: ${yn(e.is_high_risk)}`,
        `- Personal data transferred outside Nigeria: ${yn(e.has_transfer)}`,
        `- Vulnerable data subjects: ${VULNERABLE.test(e.data_subjects ?? "") ? "Yes" : `${TODO}`}`,
        `- Systematic or large-scale processing: ${c.subjects6mo ? `At least ${c.subjects6mo} data subjects processed in six months` : TODO}`,
        `- New technology or innovative processing: ${TODO}`,
      ].join("\n"))}\n\n## Screening outcome\n${why.length
        ? `A DPIA is required under section 28 of the NDPA 2023 because ${why.join("; ")}.`
        : `No high-risk indicator was found in the records. State why this DPIA is being carried out: ${TODO}`}`;
    }
    case "purpose":
      return `## The organisation\n${c.orgName}${c.sector ? ` operates in the ${c.sector.toLowerCase()} sector` : ""}${c.address ? `, with its head office at ${c.address}` : ""}.${c.departments?.length ? ` Its departments include ${c.departments.join(", ")}.` : ""}\nCentral work of the organisation: ${TODO}\n\n## Purpose of the processing\n${bullets(r.map((e) => `${e.purpose}: ${or(e.data_categories)} about ${or(e.data_subjects)}`))}\n\n## Reasons for carrying out this DPIA\n${bullets([...uniq(r.flatMap((e) => triggers(e, c))).map((t) => cap(t)), "To identify and reduce risks to data subjects before and during processing, as section 28 of the NDPA 2023 requires"])}`;
    case "method":
      return per((e) => `- Automated or manual processing: ${TODO}\n- Systems and tools used: ${or(e.system_owner)}\n- How the data is collected: ${TODO}\n- Automated decision-making or profiling: ${TODO}`);
    case "lawful_basis":
      return per((e) => [
        `- Lawful basis (NDPA s.25): ${e.lawful_basis ? LAWFUL_BASIS[e.lawful_basis] : TODO}`,
        `- Why this basis applies: ${TODO}`,
        ...(e.lawful_basis === "consent" ? [`- How consent is obtained, recorded and withdrawn (NDPA s.26): ${TODO}`] : []),
        ...(e.lawful_basis === "legitimate_interest" ? [`- Legitimate interest assessment: ${TODO}`] : []),
        ...(e.involves_sensitive ? [`- Condition for processing sensitive personal data (NDPA s.30): ${TODO}`] : []),
      ].join("\n"));
    case "necessity":
      return per((e) => `- Data used: ${or(e.data_categories)}\n- Why this processing is essential to achieving the lawful purpose: ${TODO}\n- Is all of this data needed? Could the purpose be met with less data, or without identifying people? ${TODO}\n- Retention: ${or(e.retention_period)}`);
    case "stakeholders":
      return `## Data subjects\n${bullets(uniq(r.map((e) => e.data_subjects)))}\n\n## Regulator\n- Nigeria Data Protection Commission (NDPC)\n\n## Internal managers of the processing\n- Management decision makers: ${TODO}\n- Chief Information Security Officer: ${TODO}\n- Data Protection Officer: ${c.dpoName ?? TODO}\n- Users of the processing medium: ${uniq(r.map((e) => e.department ?? null)).join(", ") || TODO}\n\n## Others who receive the data\n${bullets(uniq(r.map((e) => e.recipients)))}`;
    case "risks_cia":
      return `## Confidentiality\n- Unauthorised access to personal data by staff, contractors or outsiders\n- Accidental disclosure, for example misdirected emails, open file boards or shared screens\n${uniq(r.map((e) => e.recipients)).length ? `- Disclosure through third parties who receive the data (${uniq(r.map((e) => e.recipients)).join(", ")})\n` : ""}\n## Integrity\n- Inaccurate or outdated records leading to wrong decisions about people\n- Unauthorised or accidental alteration of records\n\n## Availability\n- Loss of data through system failure, ransomware, theft or damage to paper records without a tested backup\n- Records unavailable when data subjects exercise their rights\n\n## Inadvertence by data subjects\n- Data subjects sharing passwords or one-time codes, or responding to phishing\n- Data subjects giving more information than needed, or not understanding how their data is used`;
    case "harms": {
      const fin = r.some((e) => FINANCIAL.test(e.data_categories ?? "")), sens = r.some((e) => e.involves_sensitive), vul = r.some((e) => VULNERABLE.test(e.data_subjects ?? ""));
      return `Even where the purpose itself carries no obvious risk, these harms can follow from a breach, misuse or error:\n${bullets([
        "Loss of control over their personal data",
        "Distress, embarrassment or damage to reputation",
        `Identity theft or fraud${fin ? " (financial or identity data is processed)" : ""}`,
        "Financial loss",
        ...(sens ? ["Discrimination or exclusion arising from sensitive personal data"] : []),
        ...(vul ? ["Harm to children, students, patients or other vulnerable people"] : []),
        "Loss of confidentiality of communications or professional secrecy",
        "Inability to exercise their rights, for example to access or correct their data",
      ])}`;
    }
    case "transfers": {
      const t = r.filter((e) => e.has_transfer);
      return t.length
        ? `Personal data is transferred outside Nigeria (NDPA ss.41–43):\n${bullets(t.map((e) => `${e.purpose}: safeguard ${or(e.transfer_safeguard)}`))}\n\n## Destination countries or services\n${bullets(c.transferCountries ?? [])}`
        : `- No transfer of personal data outside Nigeria is recorded for these activities.\n- Confirm this, including cloud, email and support providers hosted abroad: ${TODO}`;
    }
    case "principles_rights":
      return `## Principles of data protection (NDPA s.24)\n${bullets(["Lawfulness, fairness and transparency", "Purpose limitation", "Data minimisation", "Accuracy", "Storage limitation", "Integrity and confidentiality (security)", "Accountability"].map((p) => `${p}: ${TODO}`))}\n\n## Rights of data subjects (NDPA ss.34–38)\n${bullets(["Right to information and access", "Right to rectification", "Right to erasure", "Right to restrict processing", "Right to withdraw consent (s.35)", "Right to object (s.36)", "Rights relating to automated decision-making (s.37)", "Right to data portability (s.38)"])}\n\nHow requests are received and answered within the response period: ${TODO}`;
    case "measures":
      return `## Technical measures\n${bullets([...uniq(r.map((e) => e.security_measures)), "Role-based access control and multi-factor sign-in", "Encryption of personal data at rest and in transit", "Tested backups and a disaster recovery plan", "Logging and monitoring of access to personal data"])}\n\n## Organisational measures\n${bullets(["Data protection training and confidentiality undertakings for staff", "Data processing agreements with every processor", "A retention schedule with secure disposal", "A breach response procedure, including notifying the NDPC within 72 hours"])}`;
    case "conclusion":
      return `## Outcome\nThe processing may proceed / may proceed with the measures above / must not proceed: ${TODO}\n\n## DPO advice\n${TODO}\n\n## Approval\nApproved by: ${TODO}\nDate: ${TODO}\n\n## Review\nReview date: ${TODO}. Review again whenever the processing changes.`;
    default:
      return "";
  }
}

/** DPIA JSON body → the plain document format, for export and signing. */
export function dpiaText(title: string, body: string, level: (n: number) => string): string {
  const b = normalizeDpia(body);
  const risks = b.risks_list ?? [];
  return [`# Data Privacy Impact Assessment: ${title}`, ...DPIA_STEPS.map((s, i) => {
    const h = `## ${i + 1}. ${s.title}`;
    if (s.key === "scoring") return `${h}\n${risks.map((r) => `- ${r.description}: likelihood ${r.likelihood} × impact ${r.impact} = ${r.likelihood * r.impact} (${level(r.likelihood * r.impact)})`).join("\n") || `- ${TODO}`}`;
    if (s.key === "measures") {
      const per = risks.map((r) => `- ${r.description}: ${r.mitigation || TODO}${r.residual_likelihood && r.residual_impact ? ` Residual risk: ${r.residual_likelihood * r.residual_impact} (${level(r.residual_likelihood * r.residual_impact)}).` : ""}`).join("\n");
      return `${h}\n${per ? `## Measures for each risk\n${per}\n\n` : ""}${b.measures || TODO}`;
    }
    return `${h}\n${b[s.key] || TODO}`;
  })].join("\n\n");
}

export function suggestedRisks(c: Ctx): Risk[] {
  const out: Risk[] = STANDARD_RISKS.map((r) => ({ ...r }));
  if (c.ropa.some((e) => e.involves_sensitive))
    out.push({ description: "Disclosure of sensitive personal data", detail: "Health, biometric, religious or other sensitive data exposed or misused", harm: "Discrimination, exclusion, serious distress", likelihood: 2, impact: 5,
      mitigation: "Explicit consent or another s.30 condition; restricted access; encryption; additional logging", owner: "DPO / IT" });
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
