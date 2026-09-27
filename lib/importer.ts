// F17 import: CSV templates and row validation. Pure, so it is unit-tested.
// ponytail: CSV only. Excel (.xlsx) and bulk document/evidence files with an index come next; users can "Save as CSV" from Excel today.
import { parseCSV } from "./rules.ts";

const BASES: Record<string, string> = {
  consent: "consent", contract: "contract", "legal obligation": "legal_obligation", legal_obligation: "legal_obligation",
  "vital interests": "vital_interest", vital_interest: "vital_interest", "public interest": "public_interest", public_interest: "public_interest",
  "legitimate interests": "legitimate_interest", legitimate_interest: "legitimate_interest",
};

export const IMPORT_TYPES = {
  clients_contacts: { label: "Clients and contacts", columns: ["name", "sector", "size", "contact_name", "contact_email"] },
  ropa_entries: { label: "RoPA entries (for one client)", columns: ["purpose", "lawful_basis", "data_subjects", "data_categories", "recipients", "retention_period", "security_measures", "system_owner", "transfer_outside_nigeria", "transfer_safeguard", "sensitive_data"] },
} as const;
export type ImportType = keyof typeof IMPORT_TYPES;
export type Row = { n: number; data: Record<string, string | boolean | null>; errors: string[] };

const yes = (v: string) => /^(y|yes|true|1)$/i.test(v.trim());
const blank = (v: string) => v.trim() === "";

export function validateImport(type: ImportType, text: string, existingNames: string[] = []): { error?: string; rows: Row[] } {
  const all = parseCSV(text);
  if (!all.length) return { error: "The file is empty.", rows: [] };
  const header = all[0].map((h) => h.trim().toLowerCase());
  const cols = IMPORT_TYPES[type].columns;
  const missing = cols.filter((c) => !header.includes(c));
  if (missing.length) return { error: `The file is missing these columns: ${missing.join(", ")}. Download the template and copy your data into it.`, rows: [] };
  if (all.length - 1 > 5000) return { error: "Import up to 5,000 rows at a time.", rows: [] };
  const seen = new Set(existingNames.map((n) => n.toLowerCase()));
  const rows = all.slice(1).map((cells, i): Row => {
    const get = (c: string) => (cells[header.indexOf(c)] ?? "").trim();
    const errors: string[] = [];
    if (type === "clients_contacts") {
      const name = get("name"), email = get("contact_email");
      if (!name) errors.push("Client name is empty.");
      else if (seen.has(name.toLowerCase())) errors.push(`A client called "${name}" already exists.`);
      if (email && !/^\S+@\S+\.\S+$/.test(email)) errors.push(`"${email}" is not a valid email address.`);
      if (name) seen.add(name.toLowerCase());
      return { n: i + 2, errors, data: { name, sector: get("sector") || null, size: get("size") || null, contact_name: get("contact_name") || null, contact_email: email.toLowerCase() || null } };
    }
    const purpose = get("purpose"), lb = get("lawful_basis").toLowerCase();
    if (!purpose) errors.push("Purpose is empty.");
    if (lb && !BASES[lb]) errors.push(`Lawful basis "${get("lawful_basis")}" isn't recognised. Use consent, contract, legal obligation, vital interests, public interest or legitimate interests.`);
    const transfer = yes(get("transfer_outside_nigeria"));
    const data: Row["data"] = { purpose, lawful_basis: BASES[lb] ?? null, has_transfer: transfer, involves_sensitive: yes(get("sensitive_data")) };
    for (const c of ["data_subjects", "data_categories", "recipients", "retention_period", "security_measures", "system_owner", "transfer_safeguard"]) data[c] = blank(get(c)) ? null : get(c);
    return { n: i + 2, errors, data };
  });
  return { rows };
}
