import type { Tx } from "./db";

/** A CAR filed in a year covers the previous calendar year, so new clients start on last year's audit. */
export const defaultAuditYear = () => new Date().getFullYear() - 1;

/** Create a client's CAR checklist for one audit year from the published template. Safe to repeat. */
export async function startCarYear(t: Tx, firmId: string, clientId: string, year: number) {
  await t.query(`insert into client_car_items (firm_id, client_id, audit_year, template_item_id, category_key, section, item_text, priority, position, auto_link_rule)
    select $1, $2, $3, id, category_key, section, text, priority, position, auto_link_rule from car_template_items where status = 'published' and category_key <> 'data_processors' on conflict do nothing`, [firmId, clientId, year]);
}

/** New client = record + questionnaire + CAR checklist copied from the published template (schema §8 op 3). */
export async function insertClient(t: Tx, firmId: string, userId: string, f: { name: string; sector?: string | null; size?: string | null; car_filing_due_on?: string | null }) {
  const year = defaultAuditYear();
  const c = await t.query<{ id: string }>("insert into clients (firm_id, name, sector, size, car_filing_due_on, car_audit_year, created_by) values ($1,$2,$3,$4,$5,$6,$7) returning id",
    [firmId, f.name, f.sector ?? null, f.size ?? null, f.car_filing_due_on ?? null, year, userId]);
  const id = c.rows[0].id;
  await t.query("insert into questionnaires (client_id, firm_id) values ($1,$2)", [id, firmId]);
  await startCarYear(t, firmId, id, year);
  return id;
}
