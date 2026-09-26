import type { Tx } from "./db";

/** New client = record + questionnaire + CAR checklist copied from the published template (schema §8 op 3). */
export async function insertClient(t: Tx, firmId: string, userId: string, f: { name: string; sector?: string | null; size?: string | null; car_filing_due_on?: string | null }) {
  const c = await t.query<{ id: string }>("insert into clients (firm_id, name, sector, size, car_filing_due_on, created_by) values ($1,$2,$3,$4,$5,$6) returning id",
    [firmId, f.name, f.sector ?? null, f.size ?? null, f.car_filing_due_on ?? null, userId]);
  const id = c.rows[0].id;
  await t.query("insert into questionnaires (client_id, firm_id) values ($1,$2)", [id, firmId]);
  await t.query(`insert into client_car_items (firm_id, client_id, template_item_id, category_key, item_text, position, auto_link_rule)
    select $1, $2, id, category_key, text, position, auto_link_rule from car_template_items where status = 'published'`, [firmId, id]);
  return id;
}
