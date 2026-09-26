// Onboarding questionnaire definition (FR3.1). Versioned in code, not Secretary-editable (schema §11.2).
export const QUESTIONNAIRE_VERSION = "2026.1";

export type Question = {
  key: string;
  label: string;
  help?: string;
  type: "text" | "textarea" | "number" | "yesno" | "multi" | "list" | "select";
  options?: { value: string; label: string; sensitive?: boolean }[];
  required?: boolean;
};
export type Section = { key: string; title: string; questions: Question[] };

const opts = (...xs: string[]) => xs.map((x) => ({ value: x, label: x }));

export const SECTIONS: Section[] = [
  { key: "organisation", title: "Organisation details", questions: [
    { key: "org_legal_name", label: "Registered name of the organisation", type: "text", required: true },
    { key: "org_address", label: "Head office address", type: "text" },
    { key: "org_sector", label: "Sector", type: "select", required: true, options: opts("Financial services", "Health", "Education", "Telecoms", "Government or public sector", "Retail or e-commerce", "Technology", "Other") },
    { key: "org_staff_count", label: "Number of staff", type: "number" },
  ]},
  { key: "subjects", title: "People whose data you hold", questions: [
    { key: "subjects", label: "Whose personal data do you collect?", type: "multi", required: true, options: opts("Employees", "Job applicants", "Customers", "Prospective customers", "Patients", "Students", "Website visitors", "Suppliers' staff", "Children") },
    { key: "subjects_other", label: "Anyone else? One per line", type: "list" },
  ]},
  { key: "categories", title: "Types of personal data", questions: [
    { key: "categories", label: "What types of personal data do you collect?", help: "Items marked sensitive are sensitive personal data under the NDPA.", type: "multi", required: true, options: [
      ...opts("Name and date of birth", "Contact details", "Bank or payment details", "NIN, BVN or other ID numbers", "Location data", "Online identifiers (IP address, cookies)", "Employment records"),
      ...["Health information", "Biometric data (fingerprints, face)", "Genetic data", "Religious or philosophical beliefs", "Political opinions or affiliations", "Racial or ethnic origin", "Sex life or sexual orientation", "Trade union membership"].map((x) => ({ value: x, label: `${x} (sensitive)`, sensitive: true })),
    ]},
  ]},
  { key: "purposes", title: "Why you use the data", questions: [
    { key: "purposes", label: "List each purpose you use personal data for. One per line", help: "For example: Payroll, Customer onboarding, Marketing emails, CCTV security.", type: "list", required: true },
  ]},
  { key: "systems", title: "Systems and storage", questions: [
    { key: "systems", label: "Where is the data kept? One system per line", help: "For example: HR software (cloud), Paper files in head office, Google Workspace.", type: "list" },
  ]},
  { key: "recipients", title: "Who you share data with", questions: [
    { key: "recipients", label: "Third parties who receive personal data. One per line", help: "For example: payroll provider, auditors, cloud host, regulators.", type: "list" },
  ]},
  { key: "transfers", title: "Transfers outside Nigeria", questions: [
    { key: "transfers_yes", label: "Is any personal data sent to or stored outside Nigeria?", type: "yesno", required: true },
    { key: "transfer_countries", label: "Which countries or services? One per line", type: "list" },
    { key: "transfer_safeguard", label: "What protects the data when it leaves Nigeria?", help: "For example: contract clauses, the recipient country's laws, consent.", type: "textarea" },
  ]},
  { key: "retention", title: "How long you keep data", questions: [
    { key: "retention_default", label: "Usual retention period", help: "For example: 6 years after employment ends.", type: "text" },
    { key: "retention_notes", label: "Any exceptions", type: "textarea" },
  ]},
  { key: "security", title: "Security measures", questions: [
    { key: "security", label: "Which measures are in place?", type: "multi", options: opts("Encryption of stored data", "Encryption in transit (HTTPS/TLS)", "Access controls by role", "Multi-factor sign-in", "Regular backups", "Staff data protection training", "Security incident logging") },
    { key: "security_other", label: "Anything else", type: "textarea" },
  ]},
  { key: "major_importance", title: "Scale of processing", questions: [
    { key: "subjects_6mo", label: "Roughly how many people's personal data did you process in the last six months?", type: "number", required: true },
    { key: "mi_significance", label: "Is the data of particular value or significance to Nigeria's economy, society or security?", help: "For example: banking, telecoms, health or critical infrastructure.", type: "yesno", required: true },
  ]},
];

export const ALL_QUESTIONS = SECTIONS.flatMap((s) => s.questions);

export type Answers = Record<string, unknown>;

const list = (v: unknown): string[] =>
  Array.isArray(v) ? v.map(String) : typeof v === "string" ? v.split("\n").map((s) => s.trim()).filter(Boolean) : [];

export function missingRequired(a: Answers) {
  return ALL_QUESTIONS.filter((q) => q.required && (a[q.key] === undefined || a[q.key] === "" || (Array.isArray(a[q.key]) && !(a[q.key] as unknown[]).length)));
}

export function progress(a: Answers) {
  const answered = ALL_QUESTIONS.filter((q) => a[q.key] !== undefined && a[q.key] !== "").length;
  return Math.round((answered / ALL_QUESTIONS.length) * 100);
}

const SENSITIVE = new Set(SECTIONS[2].questions[0].options!.filter((o) => o.sensitive).map((o) => o.value));

/** FR3.4 + FR4.1: completed answers → inventory items and one proposed RoPA entry per purpose. */
export function buildInventory(a: Answers) {
  const subjects = [...list(a.subjects), ...list(a.subjects_other)];
  const categories = list(a.categories);
  const recipients = list(a.recipients);
  const systems = list(a.systems);
  const transfers = a.transfers_yes === "yes" ? list(a.transfer_countries) : [];
  const sensitive = categories.some((c) => SENSITIVE.has(c));

  const items = [
    ...subjects.map((name) => ({ item_type: "data_subject", name, is_sensitive: false })),
    ...categories.map((name) => ({ item_type: "data_category", name, is_sensitive: SENSITIVE.has(name) })),
    ...list(a.purposes).map((name) => ({ item_type: "purpose", name, is_sensitive: false })),
    ...systems.map((name) => ({ item_type: "system", name, is_sensitive: false })),
    ...recipients.map((name) => ({ item_type: "recipient", name, is_sensitive: false })),
    ...transfers.map((name) => ({ item_type: "transfer", name, is_sensitive: false })),
  ];

  const ropa = list(a.purposes).map((purpose) => ({
    purpose,
    data_subjects: subjects.join(", ") || null,
    data_categories: categories.join(", ") || null,
    involves_sensitive: sensitive,
    recipients: recipients.join(", ") || null,
    has_transfer: transfers.length > 0,
    transfer_safeguard: transfers.length ? (String(a.transfer_safeguard ?? "").trim() || null) : null,
    retention_period: String(a.retention_default ?? "").trim() || null,
    security_measures: [...list(a.security), String(a.security_other ?? "").trim()].filter(Boolean).join(", ") || null,
    system_owner: systems.join(", ") || null,
    is_high_risk: sensitive,
  }));

  return { items, ropa };
}
