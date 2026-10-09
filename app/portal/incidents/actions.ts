"use server";
import { redirect } from "next/navigation";
import { requireContact, audit } from "@/lib/auth";
import { q, one } from "@/lib/db";
import { str, flash } from "@/lib/form";
import { answersOf } from "@/lib/data";
import { list } from "@/lib/questionnaire";
import { FIELDS, LISTS } from "@/lib/incidents";
import { todayWAT } from "@/lib/rules";

/** Log (no id) or update an incident in the client's own register. */
export async function saveIncident(fd: FormData) {
  const u = await requireContact();
  const id = str(fd, "id");
  const existing = id ? await one("select * from incidents where id = $1 and client_id = $2", [/^[0-9a-f-]{36}$/.test(id) ? id : null, u.client_id]) : null;
  if (id && !existing) redirect("/forbidden");
  const back = existing ? `/portal/incidents/${existing.id}` : "/portal/incidents/new";
  const depts = list((await answersOf(u.client_id!)).org_departments);
  const data: Record<string, string> = {};
  for (const f of FIELDS) {
    const v = str(fd, f.key);
    if (f.required && !v) redirect(flash(back, `Enter ${f.label}.`, "error"));
    if (!v) continue;
    if (f.list && !LISTS[f.list].includes(v)) redirect(flash(back, `Choose ${f.label} from the list.`, "error"));
    if (f.kind === "dept" && !depts.includes(v)) redirect(flash(back, "Choose a department from the list.", "error"));
    if (f.kind === "date" && !/^\d{4}-\d{2}-\d{2}$/.test(v)) redirect(flash(back, `${f.label} must be a date.`, "error"));
    if (f.kind === "number" && !(Number.isInteger(Number(v)) && Number(v) >= 0)) redirect(flash(back, `${f.label} must be a whole number.`, "error"));
    data[f.key] = v.slice(0, 4000);
  }
  if (data.discovered_on > todayWAT()) redirect(flash(back, "Date Discovered can't be in the future.", "error"));
  if (data.occurred_on && data.occurred_on > data.discovered_on) redirect(flash(back, "Date Incident Occurred is after Date Discovered.", "error"));
  if (data.status === "Closed" && !data.closed_on) data.closed_on = todayWAT();
  let rid: string;
  if (existing) {
    await q("update incidents set data = $2, updated_by = $3, updated_at = now() where id = $1", [existing.id, JSON.stringify(data), u.id]);
    rid = existing.id;
  } else {
    const year = data.discovered_on.slice(0, 4);
    const client = (await one<{ firm_id: string }>("select firm_id from clients where id = $1", [u.client_id]))!;
    const n = (await one<{ n: number }>("select count(*)::int as n from incidents where client_id = $1 and number like $2", [u.client_id, `INC-${year}-%`]))!.n;
    rid = (await one<{ id: string }>("insert into incidents (firm_id, client_id, number, data, created_by, updated_by) values ($1,$2,$3,$4,$5,$5) returning id",
      [client.firm_id, u.client_id, `INC-${year}-${String(n + 1).padStart(3, "0")}`, JSON.stringify(data), u.id]))!.id;
  }
  await audit(u, existing ? "update" : "create", "incident", rid, { client_id: u.client_id });
  redirect(flash("/portal/incidents", existing ? "Incident saved" : "Incident logged"));
}
