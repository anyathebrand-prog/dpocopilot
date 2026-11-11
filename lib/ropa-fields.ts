/** Free-text RoPA fields: [column, label, help]. */
export const ROPA_TEXT: [string, string, string?][] = [
  ["data_subjects", "Whose data", "e.g. customers, staff. Separate with commas."],
  ["data_categories", "What data", "e.g. name, phone, bank details. Separate with commas."],
  ["recipients", "Shared with", "Who receives the data."],
  ["retention_period", "Kept for", "How long it is kept."],
  ["security_measures", "How it is protected"],
  ["system_owner", "System and owner", "Where it is kept and who is responsible."],
];
