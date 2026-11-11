"use server";
import { redirect } from "next/navigation";
import { requireContact, audit, notifyTeam } from "@/lib/auth";
import { one } from "@/lib/db";
import { str, opt, flash } from "@/lib/form";
import { LAWFUL_BASIS } from "@/lib/templates";
import { ROPA_TEXT } from "@/lib/ropa-fields";

/** The client edits its own RoPA: changes to active entries apply at once; new entries wait for the DPCO as "proposed". The DPCO team is told either way. */
export async function saveClientRopa(fd: FormData) {
  const u = await requireContact();
  const id = str(fd, "id");
  const back = `/portal/ropa/${id || "new"}`;
  const purpose = str(fd, "purpose").slice(0, 500);
  if (!purpose) redirect(flash(back, "Enter the purpose.", "error"));
  const lb = str(fd, "lawful_basis");
  const vals = [purpose, LAWFUL_BASIS[lb] ? lb : null, ...ROPA_TEXT.map(([k]) => opt(fd, k)), fd.get("has_transfer") === "on", opt(fd, "transfer_safeguard"), fd.get("involves_sensitive") === "on", opt(fd, "department")];
  let entryId = id;
  if (id) {
    const r = await one(`update ropa_entries set purpose=$3, lawful_basis=$4, data_subjects=$5, data_categories=$6, recipients=$7, retention_period=$8, security_measures=$9, system_owner=$10,
      has_transfer=$11, transfer_safeguard=$12, involves_sensitive=$13, department=$14, updated_at = now()
      where id = $1 and client_id = $2 and state <> 'archived' returning id`, [/^[0-9a-f-]{36}$/.test(id) ? id : null, u.client_id, ...vals]);
    if (!r) redirect("/forbidden");
    await audit(u, "update", "ropa_entry", id, { client_id: u.client_id, details: { by_client: true } });
  } else {
    const c = (await one<{ firm_id: string }>("select firm_id from clients where id = $1", [u.client_id]))!;
    const r = await one(`insert into ropa_entries (firm_id, client_id, state, purpose, lawful_basis, data_subjects, data_categories, recipients, retention_period, security_measures, system_owner, has_transfer, transfer_safeguard, involves_sensitive, department, source)
      values ($1,$2,'proposed',$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'manual') returning id`, [c.firm_id, u.client_id, ...vals]);
    entryId = r!.id;
    await audit(u, "create", "ropa_entry", entryId, { client_id: u.client_id, details: { by_client: true } });
  }
  const c = (await one<{ firm_id: string; name: string }>("select firm_id, name from clients where id = $1", [u.client_id]))!;
  await notifyTeam(c.firm_id, u.client_id!, "ropa_updated", `${c.name} ${id ? "updated" : "added"} a RoPA entry: ${purpose}`, `/app/clients/${u.client_id}/ropa/${entryId}`);
  redirect(flash("/portal/ropa", id ? "Saved. Your DPCO has been told about the change." : "Added. Your DPCO will review it before it becomes part of your record."));
}
