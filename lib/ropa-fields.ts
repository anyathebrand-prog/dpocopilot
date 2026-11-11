/** Free-text RoPA fields: [column, label, help]. */
export const ROPA_TEXT: [string, string, string?][] = [
  ["data_subjects", "Whose data", "e.g. customers, staff. Separate with commas."],
  ["data_categories", "What data", "e.g. name, phone, bank details. Separate with commas."],
  ["recipients", "Shared with", "Who receives the data."],
  ["retention_period", "Kept for", "How long it is kept."],
  ["security_measures", "How it is protected"],
  ["system_owner", "System and owner", "Where it is kept and who is responsible."],
];

/** Departments offered when picking one for a RoPA entry; any other name can be typed. */
export const COMMON_DEPARTMENTS = ["Administration", "Compliance", "Customer Service", "Finance", "Human Resources", "ICT", "Legal", "Marketing", "Operations", "Procurement", "Risk Management", "Sales", "Security", "Support"];
/** The client's onboarding departments, those already used in its RoPA, then the common ones; de-duplicated, case ignored. */
export function departmentOptions(...lists: (string | null | undefined)[][]) {
  const seen = new Map<string, string>();
  for (const l of [...lists, COMMON_DEPARTMENTS]) for (const d of l) { const t = (d ?? "").trim(); if (t && !seen.has(t.toLowerCase())) seen.set(t.toLowerCase(), t); }
  return [...seen.values()];
}
