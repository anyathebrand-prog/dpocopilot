"use server";
import { redirect } from "next/navigation";
import { q, one, tx } from "./db";
import { requireSecretary, audit } from "./auth";
import { splitSections, CAR_CATEGORIES } from "./rules";
import { str, opt, flash } from "./form";

// F18: the Secretary drafts changes; nothing reaches firms until "Publish" (FR18.2). Secretary never touches firm data.

const log = async (action: string, entity: string, id: string | null, details: object = {}) =>
  audit(await requireSecretary(), action, entity, id, { firm_id: null, details });

export async function addDocument(fd: FormData) {
  await requireSecretary();
  const title = str(fd, "title"), label = str(fd, "version_label"), type = str(fd, "doc_type");
  const sections = splitSections(str(fd, "text"));
  if (!title || !label || !sections.length) redirect(flash("/secretary/library", "Enter a title, version label and the source text.", "error"));
  const id = await tx(async (t) => {
    const d = await t.query<{ id: string }>("insert into reg_documents (title, doc_type, version_label) values ($1,$2,$3) returning id", [title, ["act", "regulation", "directive", "guidance"].includes(type) ? type : "other", label]);
    for (const [i, s] of sections.entries()) await t.query("insert into reg_sections (document_id, section_ref, heading, body, position) values ($1,$2,$3,$4,$5)", [d.rows[0].id, s.section_ref, s.heading, s.body, i]);
    return d.rows[0].id;
  });
  await log("create", "reg_document", id, { sections: sections.length });
  redirect(flash("/secretary/library", `Draft added with ${sections.length} sections. Publish to make it live.`));
}

/** Retire (published) or discard (draft) a row; retirement waits for Publish. */
async function retire(table: "reg_documents" | "mi_criteria" | "car_template_items", id: string, back: string) {
  const row = await one(`select status from ${table} where id = $1`, [id]);
  if (!row) redirect(back);
  if (row.status === "draft") await q(`delete from ${table} where id = $1 and status = 'draft'`, [id]);
  else await q(`update ${table} set retire_pending = not retire_pending where id = $1 and status = 'published'`, [id]);
  await log(row.status === "draft" ? "delete" : "retire", table, id);
  redirect(flash(back, row.status === "draft" ? "Draft removed" : "Retirement toggled. It takes effect when you publish."));
}
export const retireDocument = async (fd: FormData) => retire("reg_documents", str(fd, "id"), "/secretary/library");
export const retireCriterion = async (fd: FormData) => retire("mi_criteria", str(fd, "id"), "/secretary/criteria");
export const retireCarItem = async (fd: FormData) => retire("car_template_items", str(fd, "id"), "/secretary/car-template");

export async function addCriterion(fd: FormData) {
  await requireSecretary();
  const op = str(fd, "op"), source = str(fd, "source_ref"), desc = str(fd, "description");
  if (!desc || !source || !["gte", "yes", "includes"].includes(op)) redirect(flash("/secretary/criteria", "Every criterion needs a description, a rule and a cited source.", "error"));
  const pos = (await one<{ n: number }>("select coalesce(max(position), 0)::int + 1 as n from mi_criteria"))!.n;
  const r = await one("insert into mi_criteria (description, question_key, op, value, source_ref, position) values ($1,$2,$3,$4,$5,$6) returning id", [desc, str(fd, "question_key"), op, opt(fd, "value"), source, pos]);
  await log("create", "mi_criteria", r!.id);
  redirect(flash("/secretary/criteria", "Draft criterion added"));
}

export async function saveDsarDays(fd: FormData) {
  await requireSecretary();
  const n = Number(str(fd, "days"));
  if (!Number.isInteger(n) || n < 1 || n > 365) redirect(flash("/secretary/settings", "Enter a whole number of days between 1 and 365.", "error"));
  await q("update platform_settings set draft_value = $1 where key = 'dsar_response_days'", [String(n)]);
  await log("update", "platform_setting", "dsar_response_days", { draft: n });
  redirect(flash("/secretary/settings", "Draft saved. It takes effect when you publish."));
}

export async function addCarItem(fd: FormData) {
  await requireSecretary();
  const cat = str(fd, "category_key"), text = str(fd, "text");
  if (!CAR_CATEGORIES[cat] || !text) redirect(flash("/secretary/car-template", "Choose a category and enter the item.", "error"));
  const pos = (await one<{ n: number }>("select coalesce(max(position), 0)::int + 1 as n from car_template_items"))!.n;
  const r = await one("insert into car_template_items (category_key, text, position) values ($1,$2,$3) returning id", [cat, text, pos]);
  await log("create", "car_template_item", r!.id);
  redirect(flash("/secretary/car-template", "Draft item added"));
}

/** R08: publish every pending change atomically; new CAR items are added to every live client checklist as "New item". */
export async function publishAll(fd: FormData) {
  const u = await requireSecretary();
  const summary = await pendingSummary();
  if (!summary.length) redirect(flash("/secretary/publish", "Nothing to publish."));
  await tx(async (t) => {
    for (const table of ["reg_documents", "mi_criteria", "car_template_items"]) {
      await t.query(`update ${table} set status = 'retired', retire_pending = false where retire_pending`);
    }
    const newItems = await t.query<{ id: string }>("update car_template_items set status = 'published' where status = 'draft' returning id");
    await t.query("update reg_documents set status = 'published' where status = 'draft'");
    await t.query("update mi_criteria set status = 'published' where status = 'draft'");
    await t.query("update platform_settings set published_value = draft_value, draft_value = null where draft_value is not null");
    if (newItems.rows.length)
      await t.query(`insert into client_car_items (firm_id, client_id, template_item_id, category_key, item_text, position, auto_link_rule, is_new)
        select c.firm_id, c.id, i.id, i.category_key, i.text, i.position, i.auto_link_rule, true from clients c cross join car_template_items i
        where i.id = any($1::uuid[]) and c.archived_at is null on conflict do nothing`, [newItems.rows.map((r) => r.id)]);
    await t.query("insert into publish_events (summary, published_by) values ($1,$2)", [summary.join("; "), u.id]);
    await audit(u, "publish", "platform_content", null, { firm_id: null, details: { changes: summary.length } }, t);
  });
  redirect(flash("/secretary/publish", "Published. All firms now see the update."));
}

export async function discardAll() {
  await requireSecretary();
  await tx(async (t) => {
    for (const table of ["reg_documents", "mi_criteria", "car_template_items"]) {
      await t.query(`delete from ${table} where status = 'draft'`);
      await t.query(`update ${table} set retire_pending = false where retire_pending`);
    }
    await t.query("update platform_settings set draft_value = null");
  });
  await log("delete", "platform_content_drafts", null);
  redirect(flash("/secretary/publish", "All unpublished changes discarded"));
}

export async function pendingSummary(): Promise<string[]> {
  await requireSecretary(); // exported from a "use server" file, so it is callable as an action: keep it guarded
  const rows = await q(`select 'Library: add ' || title || ' (' || version_label || ')' as s from reg_documents where status = 'draft'
    union all select 'Library: retire ' || title || ' (' || version_label || ')' from reg_documents where retire_pending
    union all select 'Criteria: add "' || description || '"' from mi_criteria where status = 'draft'
    union all select 'Criteria: retire "' || description || '"' from mi_criteria where retire_pending
    union all select 'CAR template: add "' || text || '"' from car_template_items where status = 'draft'
    union all select 'CAR template: retire "' || text || '"' from car_template_items where retire_pending
    union all select 'DSAR response period: ' || published_value || ' → ' || draft_value || ' days' from platform_settings where draft_value is not null`);
  return rows.map((r) => r.s);
}
