// Cross-Border Data Transfer Risk Assessment (Transfer risk): the assessment model. Pure functions only, so the page
// recalculates live in the browser with the same code the server and the report use.
// Framework: NDPA 2023 Part VIII (ss.41–43), GAID 2025 Art. 45, Schedule 2 (CAR) and Schedule 5 (cross-border guidance).
// Each transfer is rated Low / Medium / High / Critical on eight risk categories, before (inherent) and after (residual)
// mitigation; the destination is tested on the ten Schedule 5 factors. Ratings are organisational risk ratings, not
// legal determinations or official NDPC country ratings.
import { RATINGS, RATING_COLOR, type Rating } from "./tpra-model";
export { RATINGS, RATING_COLOR, type Rating };

/** The eight risk categories every transfer is assessed on. */
export const CATEGORIES: { key: string; label: string; assesses: string; risks: string; example: string }[] = [
  { key: "legal", label: "Regulatory and legal", assesses: "Whether the destination has adequate laws and institutions", risks: "No comprehensive data protection law; weak enforcement; no independent authority; limited data subject rights; hard to enforce rights in foreign courts; conflicting local laws", example: "Customer data sent to a country with no effective data protection framework" },
  { key: "gov", label: "Government and law enforcement access", assesses: "Whether foreign authorities can access data without safeguards", risks: "Excessive surveillance; broad request powers; no judicial oversight; little transparency on requests; no notice to data subjects", example: "A foreign authority can demand cloud-hosted customer records without independent oversight" },
  { key: "cyber", label: "Cybersecurity", assesses: "Security at the destination and at the recipient", risks: "Weak encryption; poor access controls; weak authentication; frequent incidents; poor vulnerability management; unsecured cloud storage; no monitoring", example: "A foreign payroll provider stores Nigerian staff salary records in an unsecured cloud environment" },
  { key: "onward", label: "Third-party and onward transfer", assesses: "Whether the recipient shares data with others", risks: "Undisclosed sub-processors; unauthorised onward transfers; no DPAs; weak vendor due diligence; no deletion evidence after contract end", example: "A foreign HR platform passes employee data to an analytics provider without safeguards" },
  { key: "rights", label: "Data subject rights and redress", assesses: "Whether Nigerian data subjects can still exercise their rights abroad", risks: "Hard to access or correct records; no effective deletion; no complaints channel; no legal remedies; discrimination against non-citizens", example: "A Nigerian customer cannot get a foreign provider to correct or delete their data" },
  { key: "political", label: "Political, human rights and stability", assesses: "The wider environment where data is processed", risks: "Political instability; weak rule of law; systemic discrimination; human rights violations; unlawful surveillance; political interference in regulators", example: "Data hosted in a country where regulators are not independent of government" },
  { key: "continuity", label: "Availability and operational continuity", assesses: "Whether the organisation keeps access to its data if things go wrong", risks: "Unrest; internet or infrastructure outages; provider shutdown; sudden regulatory change; loss of hosted data; weak disaster recovery", example: "A provider exits the market and the organisation loses access to hosted records" },
  { key: "reputation", label: "Reputational and financial", assesses: "The consequences of an unsafe transfer", risks: "Regulatory penalties; litigation; compensation claims; lost customer trust; reputational damage; business interruption; contract disputes", example: "A breach at a foreign vendor triggers an NDPC investigation and customer claims" },
];

/** GAID Schedule 5 factors the destination is tested on. */
export const SCHEDULE5: { key: string; label: string; question: string }[] = [
  { key: "law", label: "Legal framework", question: "Does the country have effective data protection legislation?" },
  { key: "authority", label: "Data protection authority", question: "Is there an independent supervisory authority?" },
  { key: "rights", label: "Data subject rights", question: "Can individuals enforce their rights?" },
  { key: "redress", label: "Judicial redress", question: "Can affected individuals obtain effective remedies?" },
  { key: "access", label: "Government access", question: "Can authorities access personal data, and under what safeguards?" },
  { key: "human", label: "Human rights", question: "Are fundamental rights protected?" },
  { key: "commitments", label: "International commitments", question: "Which relevant conventions and commitments apply?" },
  { key: "security", label: "Data security", question: "What breach risks exist from state and non-state actors?" },
  { key: "discrimination", label: "Discrimination", question: "Are there documented cases of systemic discrimination against vulnerable groups? (Cross-check GAID Schedule 6, Data Subject's Vulnerability Indexes.)" },
  { key: "sovereignty", label: "Data sovereignty", question: "Could the transfer harm Nigeria's economy, society or security?" },
];
export const CONCERN = ["Low", "Medium", "High"] as const;

/** Documents requested from the organisation, in four groups. `when` marks items needed only in some cases. */
export type Doc = { name: string; group: "A" | "B" | "C" | "D"; when?: "consent" | "adequacy" | "cbdti" | "sccs" | "dpia" };
export const DOC_GROUPS: Record<Doc["group"], string> = { A: "Transfer identification", B: "Legal and contractual", C: "Security and technical", D: "Risk and assessment" };
export const DOCS: Doc[] = [
  { group: "A", name: "Record of Processing Activities (RoPA)" },
  { group: "A", name: "Cross-Border Data Transfer Register" },
  { group: "A", name: "List of countries where personal data is transferred or accessed" },
  { group: "A", name: "List of foreign processors, vendors and service providers" },
  { group: "A", name: "Data flow diagrams showing how data moves from Nigeria to other countries" },
  { group: "A", name: "Categories of personal data transferred" },
  { group: "A", name: "Purpose of each transfer" },
  { group: "A", name: "Systems, applications and cloud platforms involved" },
  { group: "B", name: "Data Processing Agreements (DPAs)" },
  { group: "B", name: "Data Sharing Agreements" },
  { group: "B", name: "International service provider agreements" },
  { group: "B", name: "Standard Contractual Clauses (SCCs) or Binding Corporate Rules (BCRs), where used", when: "sccs" },
  { group: "B", name: "Data subject consent records, where consent is relied on", when: "consent" },
  { group: "B", name: "Evidence of the transfer mechanism relied on" },
  { group: "B", name: "NDPC adequacy decision, where applicable", when: "adequacy" },
  { group: "B", name: "Cross-Border Data Transfer Instrument (CBDTI) and NDPC approval, where applicable", when: "cbdti" },
  { group: "B", name: "Contract clauses on confidentiality, security, breach notification, onward transfers and data deletion" },
  { group: "C", name: "Information Security Policy" },
  { group: "C", name: "Encryption Policy" },
  { group: "C", name: "Access Control Policy" },
  { group: "C", name: "Vendor Security Assessment" },
  { group: "C", name: "Vulnerability Assessment and Penetration Testing (VAPT) reports, where applicable" },
  { group: "C", name: "Cloud security configuration documentation" },
  { group: "C", name: "Data Backup and Recovery Policy" },
  { group: "C", name: "Incident and Breach Management Procedure" },
  { group: "C", name: "Data Retention and Disposal Policy" },
  { group: "C", name: "Evidence of access monitoring and audit logs" },
  { group: "D", name: "Cross-Border Data Transfer Risk Assessment Report" },
  { group: "D", name: "Transfer Impact Assessment (TIA), where conducted" },
  { group: "D", name: "Data Protection Impact Assessment (DPIA), where required", when: "dpia" },
  { group: "D", name: "Country-level data protection assessment" },
  { group: "D", name: "Foreign government access assessment" },
  { group: "D", name: "Third-party/vendor risk assessment" },
  { group: "D", name: "Risk Register" },
  { group: "D", name: "Risk Mitigation and Treatment Plan" },
  { group: "D", name: "Management approval of residual risks" },
];

/** Transfer mechanisms (NDPA s.41 adequacy routes, GAID Art. 45, and the s.43 bases where protection is not adequate). */
export const MECHANISMS: { key: string; label: string; kind: "adequacy" | "instrument" | "contract" | "derogation" | "none" }[] = [
  { key: "adequacy", label: "NDPC adequacy decision for the destination", kind: "adequacy" },
  { key: "cbdti", label: "Cross-Border Data Transfer Instrument (CBDTI) approved by the NDPC", kind: "instrument" },
  { key: "bcr", label: "Binding Corporate Rules (BCRs)", kind: "contract" },
  { key: "scc", label: "Standard Contractual Clauses (SCCs)", kind: "contract" },
  { key: "code", label: "Code of conduct or certification", kind: "contract" },
  { key: "consent", label: "Explicit consent after being told of the risks (s.43)", kind: "derogation" },
  { key: "contract", label: "Necessary for a contract with the data subject (s.43)", kind: "derogation" },
  { key: "public", label: "Important reasons of public interest (s.43)", kind: "derogation" },
  { key: "claims", label: "Establishing, exercising or defending legal claims (s.43)", kind: "derogation" },
  { key: "vital", label: "Vital interests of the data subject (s.43)", kind: "derogation" },
  { key: "none", label: "None identified / unknown", kind: "none" },
];
export const mechanismLabel = (k: string | undefined) => MECHANISMS.find((m) => m.key === k)?.label ?? "";

export const ACTION: Record<Rating, string> = {
  Low: "Maintain existing controls",
  Medium: "Improve controls and monitor",
  High: "Implement corrective measures before proceeding",
  Critical: "Escalate and consider suspending the transfer",
};
export const MEANING: Record<Rating, string> = {
  Low: "Adequate safeguards, limited exposure",
  Medium: "Some gaps, but risks are manageable",
  High: "Significant gaps or potential harm",
  Critical: "Severe exposure to data subjects' rights and freedoms",
};
/** Months to the next review, by residual rating. */
export const REVIEW_MONTHS: Record<Rating, number> = { Low: 24, Medium: 12, High: 6, Critical: 3 };

const rank = (r: string | undefined) => RATINGS.indexOf(r as Rating);
const max = (rs: (string | undefined)[]): Rating | null => { const n = Math.max(-1, ...rs.map(rank)); return n < 0 ? null : RATINGS[n]; };

export type TiaResult = {
  inherent: (Rating | null)[]; residual: (Rating | null)[]; concerns: (string | null)[];
  inherentOverall: Rating | null; residualOverall: Rating | null; rating: Rating | null; residualRating: Rating | null;
  overridden: boolean; complete: boolean; knockout: string | null; action: string | null; reviewMonths: number | null;
  mechanism: (typeof MECHANISMS)[number] | null; sensitive: boolean; flags: string[]; dpiaPrompt: boolean; s5High: number;
};

/** Rate a transfer from its answers. Keys: c_<cat> (inherent), cr_<cat> (residual), s5_<factor>, mechanism, override_rating. */
export function assess(a: Record<string, unknown>): TiaResult {
  const g = (k: string) => (typeof a[k] === "string" ? (a[k] as string) : "");
  const inherent = CATEGORIES.map((c) => (RATINGS.includes(g(`c_${c.key}`) as Rating) ? (g(`c_${c.key}`) as Rating) : null));
  const residual = CATEGORIES.map((c) => (RATINGS.includes(g(`cr_${c.key}`) as Rating) ? (g(`cr_${c.key}`) as Rating) : null));
  const concerns = SCHEDULE5.map((f) => (CONCERN.includes(g(`s5_${f.key}`) as never) ? g(`s5_${f.key}`) : null));
  const mechanism = MECHANISMS.find((m) => m.key === g("mechanism")) ?? null;
  const sensitive = /^yes/i.test(g("sensitive"));
  // Knock-out: personal data leaves Nigeria with no lawful transfer basis (NDPA ss.41–43).
  const knockout = mechanism?.kind === "none" ? "No lawful transfer mechanism identified (NDPA ss.41–43)" : null;
  const inherentOverall = knockout ? "Critical" : inherent.every(Boolean) ? max(inherent as string[]) : null;
  const residualOverall = residual.every(Boolean) ? max(residual as string[]) : null;
  const override = RATINGS.includes(g("override_rating") as Rating) ? (g("override_rating") as Rating) : null;
  const rating = override ?? inherentOverall;
  // Residual can't be lower than Critical while the knock-out stands.
  const residualRating = knockout ? "Critical" : residualOverall;
  const flags: string[] = [];
  if (mechanism?.key === "scc" || mechanism?.key === "bcr") flags.push("The NDPC has not yet issued a regulatory CBDTI, so SCCs or BCRs are not automatically an approved transfer mechanism. Record why they give adequate protection under GAID Schedule 5.");
  if (mechanism && mechanism.kind !== "adequacy" && !/^yes/i.test(g("consent_obtained")) && g("adequacy_decision") !== "Yes")
    flags.push("The destination has no NDPC adequacy decision recorded. One reading of the GAID requires explicit data subject consent for such transfers: confirm whether consent has been obtained (check against GAID Art. 45).");
  if (mechanism?.kind === "derogation") flags.push("A section 43 basis is an exception for specific transfers; it should not be relied on for regular or large-scale transfers.");
  if (knockout) flags.push(`${knockout}. The transfer must not continue until a basis is in place.`);
  const s5High = concerns.filter((c) => c === "High").length;
  return {
    inherent, residual, concerns, inherentOverall, residualOverall, rating, residualRating, overridden: !!override && override !== inherentOverall,
    complete: inherent.every(Boolean) && residual.every(Boolean), knockout, action: rating ? ACTION[rating] : null,
    reviewMonths: residualRating ? REVIEW_MONTHS[residualRating] : rating ? REVIEW_MONTHS[rating] : null,
    mechanism, sensitive, flags, s5High,
    dpiaPrompt: (rating === "High" || rating === "Critical") && (sensitive || /^yes/i.test(g("high_risk"))),
  };
}

/** Which documents apply to this transfer (the rest are shown as "where applicable"). */
export function docList(a: Record<string, unknown>) {
  const m = MECHANISMS.find((x) => x.key === a.mechanism);
  const r = assess(a);
  return DOCS.map((d, i) => ({ ...d, i, needed:
    d.when === "consent" ? m?.key === "consent" || /^yes/i.test(String(a.consent_obtained ?? "")) :
    d.when === "adequacy" ? m?.kind === "adequacy" || a.adequacy_decision === "Yes" :
    d.when === "cbdti" ? m?.key === "cbdti" :
    d.when === "sccs" ? m?.key === "scc" || m?.key === "bcr" :
    d.when === "dpia" ? r.dpiaPrompt || r.sensitive : true }));
}

/** The CAR (GAID Schedule 2) disclosure for a set of transfers. */
export function carDisclosure(ts: { answers: Record<string, string>; status: string }[]) {
  const live = ts.filter((t) => t.answers.destination?.trim());
  const countries = [...new Set(live.flatMap((t) => t.answers.destination.split(/[,;\n]+/).map((x) => x.trim()).filter(Boolean)))].sort();
  const grounds = [...new Set(live.map((t) => mechanismLabel(t.answers.mechanism)).filter(Boolean))];
  const sensitive = live.some((t) => /^yes/i.test(t.answers.sensitive ?? ""));
  const categories = [...new Set(live.flatMap((t) => (t.answers.data ?? "").split(/[,;\n]+/).map((x) => x.trim()).filter(Boolean)))];
  return {
    transfers: live.length > 0, n: live.length, countries, grounds, sensitive, categories,
    documented: live.filter((t) => t.status === "approved").length,
  };
}

/** Add months to an ISO date (yyyy-mm-dd). */
export function addMonths(iso: string, months: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
}
