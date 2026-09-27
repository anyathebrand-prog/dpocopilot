"use server";
import { redirect } from "next/navigation";
import { q, one, tx } from "./db";
import { getUser, requireClient, audit, notifyTeam, send, type User } from "./auth";
import { SECTIONS, missingRequired, buildInventory } from "./questionnaire";
import { answersOf } from "./data";
import { evaluateMI, type Criterion } from "./rules";
import { str, flash } from "./form";

/** Firm users (assigned) or the client's own contact, while the questionnaire is open. */
async function actor(fd: FormData): Promise<{ u: User; clientId: string; base: string }> {
  const u = await getUser();
  if (u?.kind === "contact") {
    const qn = await one("select status from questionnaires where client_id = $1", [u.client_id]);
    if (qn?.status === "completed") redirect(flash("/portal", "This questionnaire has already been submitted."));
    return { u, clientId: u.client_id!, base: "/portal/questionnaire" };
  }
  const { user, client } = await requireClient(str(fd, "client_id"), { write: true });
  return { u: user, clientId: client.id, base: `/app/clients/${client.id}/onboarding` };
}

export async function saveSection(fd: FormData) {
  const { u, clientId, base } = await actor(fd);
  const i = Number(str(fd, "s"));
  const section = SECTIONS[i];
  if (!section) redirect(base);
  for (const qn of section.questions) {
    const v = qn.type === "multi" ? fd.getAll(qn.key).map(String) : str(fd, qn.key);
    if ((Array.isArray(v) && !v.length) || v === "") await q("delete from answers where client_id = $1 and question_key = $2", [clientId, qn.key]);
    else await q(`insert into answers (client_id, question_key, answer, updated_by) values ($1,$2,$3,$4)
      on conflict (client_id, question_key) do update set answer = excluded.answer, updated_by = excluded.updated_by, updated_at = now()`, [clientId, qn.key, JSON.stringify(v), u.id]);
  }
  await q("update questionnaires set status = 'in_progress' where client_id = $1 and status in ('not_sent','sent')", [clientId]);
  await audit(u, "update", "questionnaire", clientId, { client_id: clientId, details: { section: section.key } });
  const time = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", hour: "2-digit", minute: "2-digit" }).format(new Date());
  const next = str(fd, "go") === "exit" ? i : Math.min(i + 1, SECTIONS.length - 1);
  if (str(fd, "go") === "exit" && u.kind === "contact") redirect(flash("/portal", `Saved ${time}. You can continue any time.`));
  redirect(flash(`${base}?s=${next}`, `Saved ${time}`));
}

/** FR3.4–3.5: completing builds the inventory, proposes RoPA entries and runs the major-importance indicator. Re-running only adds what is new. */
export async function completeQuestionnaire(fd: FormData) {
  const { u, clientId, base } = await actor(fd);
  const a = await answersOf(clientId);
  if (missingRequired(a).length) redirect(flash(base, "Answer all required questions first.", "error"));
  const client = await one("select firm_id, name from clients where id = $1", [clientId]);
  const { items, ropa } = buildInventory(a);
  const criteria = await q<Criterion>("select description, question_key, op, value, source_ref from mi_criteria where status = 'published' order by position");
  const version = (await one("select to_char(max(published_at) at time zone 'Africa/Lagos', 'YYYY-MM-DD HH24:MI') as v from publish_events"))?.v ?? "v0-seed";
  const mi = evaluateMI(criteria, a);
  await tx(async (t) => {
    for (const it of items)
      await t.query(`insert into inventory_items (firm_id, client_id, item_type, name, is_sensitive) select $1,$2,$3,$4,$5
        where not exists (select 1 from inventory_items where client_id = $2 and item_type = $3 and lower(name) = lower($4) and archived_at is null)`, [client!.firm_id, clientId, it.item_type, it.name, it.is_sensitive]);
    for (const r of ropa)
      await t.query(`insert into ropa_entries (firm_id, client_id, state, purpose, data_subjects, data_categories, involves_sensitive, recipients, has_transfer, transfer_safeguard, retention_period, security_measures, system_owner, is_high_risk, source)
        select $1,$2,'proposed',$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'questionnaire' where not exists (select 1 from ropa_entries where client_id = $2 and lower(purpose) = lower($3))`,
        [client!.firm_id, clientId, r.purpose, r.data_subjects, r.data_categories, r.involves_sensitive, r.recipients, r.has_transfer, r.transfer_safeguard, r.retention_period, r.security_measures, r.system_owner, r.is_high_risk]);
    await t.query("insert into mi_assessments (firm_id, client_id, result, reasoning, criteria_version) values ($1,$2,$3,$4,$5)", [client!.firm_id, clientId, mi.result, JSON.stringify(mi.reasoning), version]);
    await t.query("update questionnaires set status = 'completed', completed_at = now() where client_id = $1", [clientId]);
    await audit(u, "update", "questionnaire", clientId, { client_id: clientId, details: { completed: true, inventory_items: items.length, proposed_ropa: ropa.length } }, t);
  });
  if (u.kind === "contact") {
    await notifyTeam(client!.firm_id, clientId, "questionnaire_completed", `${client!.name} completed the onboarding questionnaire`, `/app/clients/${clientId}/data-inventory`);
    redirect(flash("/portal", "Thank you. Your answers have been sent to your DPCO."));
  }
  redirect(flash(`/app/clients/${clientId}/data-inventory`, "Data inventory created from the questionnaire"));
}

export async function sendQuestionnaire(fd: FormData) {
  const { user, client } = await requireClient(str(fd, "client_id"), { write: true });
  const c = await one("select id, email from client_contacts where id = $1 and client_id = $2 and status <> 'invite_revoked'", [str(fd, "contact_id"), client.id]);
  const base = `/app/clients/${client.id}/onboarding`;
  if (!c) redirect(flash(base, "Choose a client contact.", "error"));
  await q("update questionnaires set assigned_contact_id = $2, sent_at = now(), status = case when status = 'not_sent' then 'sent' else status end where client_id = $1", [client.id, c.id]);
  await send("email", c.email, "questionnaire", "Your data protection questionnaire is ready. Log in to the portal to answer it.");
  await audit(user, "update", "questionnaire", client.id, { client_id: client.id, details: { sent_to_contact: c.id } });
  redirect(flash(base, str(fd, "reminder") ? "Reminder sent" : "Questionnaire sent"));
}
